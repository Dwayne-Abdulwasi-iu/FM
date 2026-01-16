import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyTransaction, FlutterwaveWebhookEvent, verifyWebhookSignature } from '@/lib/flutterwave';
import { sendOrderConfirmation } from '@/lib/whatsapp';
import { getCommissionRate, getCommissionTier } from '@/lib/commission-tiers';
import { checkAndUpdateSellerTier } from '@/lib/tier-management';
import { fulfillPODOrder } from '@/lib/pod-service';
import { sendAdminPODAlert } from '@/lib/email';
import { queueFailedNotification } from '@/lib/notification-queue';

const FLUTTERWAVE_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/flutterwave - Flutterwave webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('verif-hash');
    
    if (FLUTTERWAVE_WEBHOOK_SECRET && signature) {
      if (!verifyWebhookSignature(signature, FLUTTERWAVE_WEBHOOK_SECRET)) {
        console.error('Invalid Flutterwave webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event: FlutterwaveWebhookEvent = await request.json();
    
    console.log('Flutterwave webhook received:', event.event, event.data.tx_ref);

    // Only process successful charge events
    if (event.event !== 'charge.completed' || event.data.status !== 'successful') {
      console.log('Ignoring non-successful event:', event.event, event.data.status);
      return NextResponse.json({ status: 'ignored' });
    }

    const txRef = event.data.tx_ref; // This is our orderId

    // Verify the transaction with Flutterwave
    const verification = await verifyTransaction(event.data.id.toString());
    
    if (verification.data.status !== 'successful') {
      console.error('Transaction verification failed:', verification);
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Find the order with items and shipping info
    const order = await prisma.order.findFirst({
      where: { 
        OR: [
          { id: txRef },
          { flutterwaveRef: txRef },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            design: {
              include: {
                designer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Type augmentation for POD fields (these exist in schema but TypeScript may need refresh)
    type FlutterwaveOrder = NonNullable<typeof order> & {
      shippingAddress?: string | null;
      shippingName?: string | null;
      shippingCity?: string | null;
      shippingState?: string | null;
      shippingCountry?: string | null;
      shippingZip?: string | null;
    };
    type FlutterwaveOrderItem = FlutterwaveOrder['items'][number] & {
      podProductId?: string | null;
      podVariantId?: string | null;
    };

    const typedOrder = order as FlutterwaveOrder | null;

    if (!typedOrder) {
      console.error('Order not found:', txRef);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if already processed
    if (typedOrder.status === 'COMPLETED') {
      console.log('Order already processed:', typedOrder.id);
      return NextResponse.json({ status: 'already_processed' });
    }

    // Update order status
    await prisma.order.update({
      where: { id: typedOrder.id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        flutterwaveTransactionId: event.data.id.toString(),
        flutterwaveFlwRef: event.data.flw_ref,
        paymentMethod: 'FLUTTERWAVE',
      },
    });

    // Update design sales counts and create earnings
    const orderItems = typedOrder.items as FlutterwaveOrderItem[];
    for (const item of orderItems) {
      await prisma.design.update({
        where: { id: item.designId },
        data: {
          totalSales: { increment: item.quantity },
          totalRevenue: { increment: item.price * item.quantity },
        },
      });

      // Get seller's current tier and calculate dynamic commission
      const sellerId = item.design.designerId;
      const seller = await prisma.user.findUnique({
        where: { id: sellerId },
        select: { totalEarnings: true, designerTier: true }
      });
      
      const totalEarnings = seller?.totalEarnings ?? 0;
      const isProSubscriber = seller?.designerTier === 'VIP_DESIGNER' || seller?.designerTier === 'VVIP_DESIGNER';
      const commissionRate = getCommissionRate(totalEarnings, isProSubscriber);
      const tier = getCommissionTier(totalEarnings);
      
      const saleAmount = item.price * item.quantity;
      const platformFee = saleAmount * commissionRate;
      const designerEarnings = saleAmount - platformFee;
      
      console.log(`[Tiered Commission] Seller ${sellerId}: Tier=${tier}, Rate=${(commissionRate * 100).toFixed(1)}%, Commission=$${platformFee.toFixed(2)}`);

      await prisma.sellerEarning.create({
        data: {
          sellerId,
          saleAmount,
          platformCommission: platformFee,
          sellerAmount: designerEarnings,
          quantity: item.quantity,
          orderId: typedOrder.id,
          designId: item.designId,
        },
      });
      
      // Store previous earnings before updating (for tier change detection)
      const previousEarnings = totalEarnings;
      
      // Update seller's total earnings and check for tier upgrade
      await prisma.user.update({
        where: { id: sellerId },
        data: {
          totalEarnings: { increment: designerEarnings },
          totalSales: { increment: item.quantity }
        }
      });
      
      // Check if seller crossed a tier threshold
      const tierResult = await checkAndUpdateSellerTier(sellerId, previousEarnings);
      if (tierResult.tierChanged) {
        console.log(`[Tier Change] ${tierResult.message}`);
      }
    }

    // Create purchase records
    for (const item of orderItems) {
      await prisma.purchase.create({
        data: {
          userId: typedOrder.customerId,
          designId: item.designId,
          orderId: typedOrder.id,
          purchasePrice: item.price * item.quantity,
          purchaseType: item.purchaseType,
        },
      });
    }

    // Handle POD fulfillment if this order has POD items
    const podItems = orderItems.filter(item => item.purchaseType === 'POD');
    if (podItems.length > 0) {
      // Get shipping address from order metadata or Flutterwave data
      const shippingAddress = typedOrder.shippingAddress ? {
        name: typedOrder.shippingName || typedOrder.customer.name || 'Customer',
        address1: typedOrder.shippingAddress,
        city: typedOrder.shippingCity || '',
        state: typedOrder.shippingState || '',
        country: typedOrder.shippingCountry || 'US',
        zip: typedOrder.shippingZip || '',
        email: typedOrder.customer.email || '',
        phone: event.data.customer.phone_number || ''
      } : null;

      if (shippingAddress) {
        const podFulfillmentItems = podItems.map(item => ({
          productId: item.podProductId || '',
          variantId: item.podVariantId || '',
          quantity: item.quantity,
          designImageUrl: item.design.imageUrl
        }));

        const fulfillResult = await fulfillPODOrder(typedOrder.id, podFulfillmentItems, shippingAddress);
        
        if (fulfillResult.success) {
          await prisma.order.update({
            where: { id: typedOrder.id },
            data: {
              orderType: 'POD',
              podProvider: fulfillResult.provider,
              podOrderId: fulfillResult.podOrderId,
              podStatus: 'pending'
            }
          });
          console.log(`POD order created with ${fulfillResult.provider}:`, fulfillResult.podOrderId);
        } else {
          console.error('POD fulfillment failed:', fulfillResult.error);
          
          // Update order status to indicate POD failure
          await prisma.order.update({
            where: { id: typedOrder.id },
            data: {
              orderType: 'POD',
              podStatus: 'fulfillment_failed',
            }
          });
          
          // Alert admin about POD fulfillment failure
          const alertSent = await sendAdminPODAlert({
            orderNumber: typedOrder.orderNumber,
            orderId: typedOrder.id,
            status: 'fulfillment_failed',
            provider: 'Unknown',
            reason: fulfillResult.error || 'POD provider order creation failed',
            customerEmail: typedOrder.customer?.email || event.data.customer.email,
            totalAmount: event.data.amount
          });
          
          // Queue for retry if alert failed
          if (!alertSent) {
            await queueFailedNotification('email', {
              emailType: 'admin_alert',
              orderId: typedOrder.orderNumber,
              reason: fulfillResult.error || 'POD fulfillment failed',
              to: process.env.ADMIN_EMAIL || '',
            }, 'Admin alert failed to send');
          }
        }
      } else {
        console.warn('POD items in order but no shipping address available');
      }
    }

    // Send WhatsApp confirmation if phone available
    if (event.data.customer.phone_number) {
      sendOrderConfirmation(event.data.customer.phone_number, {
        orderId: typedOrder.id.slice(-8),
        customerName: typedOrder.customer.name || event.data.customer.name || 'Customer',
        totalAmount: `${event.data.currency} ${event.data.amount}`,
        itemCount: orderItems.length,
        designerName: orderItems[0]?.design.designer.name || 'Designer',
      }).catch(console.error);
    }

    console.log('Flutterwave payment processed successfully:', {
      orderId: typedOrder.id,
      transactionId: event.data.id,
      amount: event.data.amount,
      currency: event.data.currency,
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Flutterwave webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Flutterwave webhook endpoint active' });
}
