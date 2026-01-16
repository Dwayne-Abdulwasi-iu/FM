// POST /api/boutique/checkout/callback - Handle payment callback/verification

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { paystack, isPaystackConfigured } from '@/lib/paystack';
import { 
  FULFILLMENT_METHOD, 
  BOUTIQUE_DEFAULTS,
} from '@/lib/boutique/constants';
import { sendEmail } from '@/lib/email';

// Notify seller about new order
async function notifySellerNewOrder(
  sellerId: string, 
  order: {
    id: string;
    orderNumber: string;
    total: number;
    fulfillmentMethod: string;
    buyerName: string;
    productTitle: string;
    shippingAddress: Record<string, string>;
  }
) {
  try {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { email: true, name: true },
    });

    if (!seller?.email) return;

    const isSellerDirect = order.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT;
    
    const subject = isSellerDirect
      ? `🚀 New Direct Shipping Order #${order.orderNumber} - Action Required!`
      : `📦 New Order #${order.orderNumber}`;

    const emailContent = isSellerDirect
      ? `
        <h2>New Seller Direct Order!</h2>
        <p>Hi ${seller.name || 'Seller'},</p>
        <p>You have a new order that requires <strong>direct shipping from you to the buyer</strong>.</p>
        
        <div style="background: #f3e8ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">⏰ Important: Ship within 48 hours</h3>
          <p style="margin: 0;">You must confirm and ship this order within 48 hours to maintain your seller rating.</p>
        </div>

        <h3>Order Details</h3>
        <ul>
          <li><strong>Order Number:</strong> ${order.orderNumber}</li>
          <li><strong>Product:</strong> ${order.productTitle}</li>
          <li><strong>Total:</strong> ₦${order.total.toLocaleString()}</li>
          <li><strong>Buyer:</strong> ${order.buyerName}</li>
        </ul>

        <h3>Shipping Address</h3>
        <p>
          ${order.shippingAddress.name}<br>
          ${order.shippingAddress.street}<br>
          ${order.shippingAddress.city}, ${order.shippingAddress.state}<br>
          Phone: ${order.shippingAddress.phone}
        </p>

        <p style="margin-top: 24px;">
          <a href="${process.env.NEXTAUTH_URL}/seller/boutique/orders" 
             style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            View & Confirm Order
          </a>
        </p>
      `
      : `
        <h2>New Order Received!</h2>
        <p>Hi ${seller.name || 'Seller'},</p>
        <p>Great news! Someone purchased your product.</p>

        <h3>Order Details</h3>
        <ul>
          <li><strong>Order Number:</strong> ${order.orderNumber}</li>
          <li><strong>Product:</strong> ${order.productTitle}</li>
          <li><strong>Total:</strong> ₦${order.total.toLocaleString()}</li>
        </ul>

        <p>This order will be fulfilled through our warehouse. No action needed from you!</p>

        <p style="margin-top: 24px;">
          <a href="${process.env.NEXTAUTH_URL}/seller/boutique/orders" 
             style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            View Orders
          </a>
        </p>
      `;

    await sendEmail({
      to: seller.email,
      subject,
      html: emailContent,
    });

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: sellerId,
        type: 'BOUTIQUE_ORDER',
        title: isSellerDirect ? '🚀 New Direct Order!' : '📦 New Order!',
        message: `Order #${order.orderNumber} for ₦${order.total.toLocaleString()}`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
        isRead: false,
      },
    });

  } catch (error) {
    console.error('Failed to notify seller:', error);
  }
}

// Verify payment and update orders
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    
    // Also check body for reference
    let bodyReference: string | undefined;
    try {
      const body = await request.json();
      bodyReference = body.reference;
    } catch {
      // No body, that's ok
    }

    const paymentRef = reference || bodyReference;

    if (!paymentRef) {
      return NextResponse.json(
        { success: false, message: 'Payment reference required' },
        { status: 400 }
      );
    }

    // Verify with Paystack
    if (!isPaystackConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Payment system not configured' },
        { status: 503 }
      );
    }

    const verification = await paystack.transaction.verify(paymentRef);

    if (!verification.status || verification.data.status !== 'success') {
      return NextResponse.json({
        success: false,
        message: 'Payment not verified',
        paymentStatus: verification.data?.status,
      });
    }

    // Get orders with this reference
    const orders = await prisma.boutiqueOrder.findMany({
      where: { paymentReference: paymentRef },
      include: {
        product: { select: { title: true } },
        buyer: { select: { name: true, email: true } },
        items: true,
      },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Orders not found' },
        { status: 404 }
      );
    }

    // Update each order
    for (const order of orders) {
      // Idempotency check - skip if already processed
      if (order.paidAt) {
        console.log(`Order ${order.orderNumber} already processed, skipping`);
        continue;
      }

      const isSellerDirect = order.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT;
      
      // Set initial status based on fulfillment method
      const newStatus = isSellerDirect 
        ? 'AWAITING_SELLER_CONFIRMATION' 
        : 'PAID';

      // For seller direct, set ship deadline (48 hours from now)
      const shipDeadline = isSellerDirect 
        ? new Date(Date.now() + BOUTIQUE_DEFAULTS.sellerDirect.shipDeadlineHours * 60 * 60 * 1000)
        : null;

      await prisma.boutiqueOrder.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          paidAt: new Date(),
          paymentStatus: 'COMPLETED',
          ...(shipDeadline && { sellerShipDeadline: shipDeadline }),
        },
      });

      // Commit inventory (move from reserved)
      for (const item of order.items) {
        if (item.variantId) {
          await prisma.boutiqueProductVariant.update({
            where: { id: item.variantId },
            data: { reserved: { decrement: item.quantity } },
          });
        }
      }

      // Send buyer confirmation email
      if (order.buyer.email) {
        await sendEmail({
          to: order.buyer.email,
          subject: `Order Confirmed! #${order.orderNumber}`,
          html: `
            <h2>Thank you for your order!</h2>
            <p>Hi ${order.buyer.name || 'Customer'},</p>
            <p>Your order #${order.orderNumber} has been confirmed and paid.</p>
            
            <h3>Order Details</h3>
            <ul>
              <li><strong>Product:</strong> ${order.product.title}</li>
              <li><strong>Total:</strong> ₦${order.total.toLocaleString()}</li>
            </ul>

            ${isSellerDirect 
              ? `<p>This item ships directly from the seller. Expected shipping within 48 hours.</p>`
              : `<p>We're preparing your order for shipment. You'll receive tracking info once it ships.</p>`
            }

            <p style="margin-top: 24px;">
              <a href="${process.env.NEXTAUTH_URL}/profile/orders" 
                 style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                Track Your Order
              </a>
            </p>
          `,
        });
      }

      // Notify seller
      await notifySellerNewOrder(order.sellerId, {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        fulfillmentMethod: order.fulfillmentMethod || FULFILLMENT_METHOD.ADMIN_STOCK,
        buyerName: order.buyer.name || 'Customer',
        productTitle: order.product.title,
        shippingAddress: order.shippingAddress as Record<string, string>,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and orders confirmed',
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT 
          ? 'AWAITING_SELLER_CONFIRMATION' 
          : 'PAID',
      })),
    });

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      { success: false, message: 'Payment verification failed' },
      { status: 500 }
    );
  }
}

// GET - Redirect handler for Paystack callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');
  
  const paymentRef = reference || trxref;
  
  if (!paymentRef) {
    return NextResponse.redirect(new URL('/boutique/checkout/failed?error=no_reference', request.url));
  }

  try {
    // Verify payment
    const verification = await paystack.transaction.verify(paymentRef);

    if (verification.status && verification.data.status === 'success') {
      // Update orders
      const orders = await prisma.boutiqueOrder.findMany({
        where: { paymentReference: paymentRef },
        include: {
          product: { select: { title: true } },
          buyer: { select: { name: true, email: true } },
          items: true,
        },
      });

      for (const order of orders) {
        const isSellerDirect = order.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT;
        
        await prisma.boutiqueOrder.update({
          where: { id: order.id },
          data: {
            status: isSellerDirect ? 'AWAITING_SELLER_CONFIRMATION' : 'PAID',
            paidAt: new Date(),
            paymentStatus: 'COMPLETED',
          },
        });

        // Commit inventory
        for (const item of order.items) {
          if (item.variantId) {
            await prisma.boutiqueProductVariant.update({
              where: { id: item.variantId },
              data: { reserved: { decrement: item.quantity } },
            });
          }
        }

        // Notify seller
        await notifySellerNewOrder(order.sellerId, {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          fulfillmentMethod: order.fulfillmentMethod || FULFILLMENT_METHOD.ADMIN_STOCK,
          buyerName: order.buyer.name || 'Customer',
          productTitle: order.product.title,
          shippingAddress: order.shippingAddress as Record<string, string>,
        });
      }

      // Redirect to success page
      const orderIds = orders.map(o => o.id).join(',');
      return NextResponse.redirect(
        new URL(`/boutique/checkout/success?orders=${orderIds}&ref=${paymentRef}`, request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`/boutique/checkout/failed?ref=${paymentRef}&status=${verification.data?.status}`, request.url)
      );
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.redirect(
      new URL('/boutique/checkout/failed?error=verification_failed', request.url)
    );
  }
}
