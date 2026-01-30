// GET /api/boutique/seller/orders - Get seller's orders
// PATCH /api/boutique/seller/orders - Update order status (confirm, ship, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { 
  FULFILLMENT_METHOD, 
  BOUTIQUE_DEFAULTS 
} from '@/lib/boutique/constants';
import { initiateBoutiqueRefund } from '@/lib/boutique/refund';
import { sendEmail } from '@/lib/email';

// GET - Get seller's orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statuses = searchParams.getAll('status');
    const fulfillmentMethod = searchParams.get('fulfillmentMethod');
    const search = searchParams.get('search') || '';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999999');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {
      sellerId: session.user.id,
    };

    if (statuses.length > 0) {
      where.status = {
        in: statuses,
      };
    }

    if (fulfillmentMethod) {
      where.fulfillmentMethod = fulfillmentMethod;
    }

    // Add search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { buyer: { name: { contains: search, mode: 'insensitive' } } },
        { buyer: { email: { contains: search, mode: 'insensitive' } } },
        { product: { title: { contains: search, mode: 'insensitive' } } },
        { items: { some: { product: { title: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    // Add price filter
    if (minPrice > 0 || maxPrice < 999999999) {
      where.total = {
        gte: minPrice,
        lte: maxPrice,
      };
    }

    const [orders, total] = await Promise.all([
      prisma.boutiqueOrder.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailUrl: true,
              fulfillmentMethod: true,
            },
          },
          buyer: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: { select: { title: true, thumbnailUrl: true } },
              variant: { select: { size: true, color: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.boutiqueOrder.count({ where }),
    ]);

    // Get counts for different statuses
    const [pendingPayment, paymentFailed, pendingConfirmation, awaitingShipment, shipped, completed] = await Promise.all([
      prisma.boutiqueOrder.count({
        where: { sellerId: session.user.id, status: 'PENDING_PAYMENT' },
      }),
      prisma.boutiqueOrder.count({
        where: { sellerId: session.user.id, status: 'PAYMENT_FAILED' },
      }),
      prisma.boutiqueOrder.count({
        where: { sellerId: session.user.id, status: 'AWAITING_SELLER_CONFIRMATION' },
      }),
      prisma.boutiqueOrder.count({
        where: { sellerId: session.user.id, status: 'PROCESSING' },
      }),
      prisma.boutiqueOrder.count({
        where: { sellerId: session.user.id, status: 'SHIPPED' },
      }),
      prisma.boutiqueOrder.count({
        where: { sellerId: session.user.id, status: 'COMPLETED' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        ...order,
        isSellerDirect: order.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT,
        isOverdue: order.sellerShipDeadline && new Date() > new Date(order.sellerShipDeadline),
        hoursUntilDeadline: order.sellerShipDeadline 
          ? Math.max(0, (new Date(order.sellerShipDeadline).getTime() - Date.now()) / (1000 * 60 * 60))
          : null,
      })),
      counts: {
        pendingPayment,
        paymentFailed,
        pendingConfirmation,
        awaitingShipment,
        shipped,
        completed,
        total,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// PATCH - Update order (confirm, ship, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, action, trackingNumber, carrier } = body;

    if (!orderId || !action) {
      return NextResponse.json(
        { success: false, message: 'Order ID and action are required' },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: orderId },
      include: {
        product: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify seller owns this order
    if (order.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Only seller direct orders can be managed by seller
    if (order.fulfillmentMethod !== FULFILLMENT_METHOD.SELLER_DIRECT) {
      return NextResponse.json(
        { success: false, message: 'This order is fulfilled by admin warehouse' },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown> = {};
    let message = '';

    switch (action) {
      case 'confirm':
        // Seller confirms they have the item and will ship
        if (order.status !== 'PAID' && order.status !== 'AWAITING_SELLER_CONFIRMATION') {
          return NextResponse.json(
            { success: false, message: 'Order cannot be confirmed in current status' },
            { status: 400 }
          );
        }
        
        // Set ship deadline (48 hours from now)
        const shipDeadline = new Date();
        shipDeadline.setHours(shipDeadline.getHours() + BOUTIQUE_DEFAULTS.sellerDirect.shipDeadlineHours);
        
        updateData = {
          status: 'PROCESSING',
          sellerConfirmedAt: new Date(),
          sellerShipDeadline: shipDeadline,
        };
        message = 'Order confirmed. Please ship within 48 hours.';
        break;

      case 'ship':
        // Seller marks order as shipped
        if (order.status !== 'PROCESSING') {
          return NextResponse.json(
            { success: false, message: 'Order must be in processing status to ship' },
            { status: 400 }
          );
        }

        if (!trackingNumber) {
          return NextResponse.json(
            { success: false, message: 'Tracking number is required' },
            { status: 400 }
          );
        }

        // Check if shipping late
        const isLate = order.sellerShipDeadline && new Date() > new Date(order.sellerShipDeadline);

        updateData = {
          status: 'SHIPPED',
          trackingNumber,
          carrier: carrier || 'OTHER',
          shippedAt: new Date(),
          sellerShippedLate: isLate,
        };

        // Update seller's shipping metrics
        await prisma.boutiqueProduct.update({
          where: { id: order.productId },
          data: {
            ordersFulfilled: { increment: 1 },
            ordersOnTime: isLate ? undefined : { increment: 1 },
          },
        });

        // If shipped late, potentially log for tier review
        if (isLate) {
          console.log(`Late shipment by seller ${order.sellerId} for order ${orderId}`);
          // TODO: Implement late shipment tracking and tier demotion logic
        }

        message = isLate 
          ? 'Order marked as shipped (late). This affects your seller rating.'
          : 'Order marked as shipped successfully!';
        break;

      case 'cancel':
        // Seller cancels order (only before shipping)
        if (!['PAID', 'AWAITING_SELLER_CONFIRMATION', 'PROCESSING'].includes(order.status)) {
          return NextResponse.json(
            { success: false, message: 'Order cannot be cancelled at this stage' },
            { status: 400 }
          );
        }

        updateData = {
          status: 'CANCELLED',
          sellerCancelled: true,
          cancelledAt: new Date(),
          cancelReason: 'Cancelled by seller',
        };

        // Restore inventory - move reserved back to available quantity
        const orderItemsToRestore = await prisma.boutiqueOrderItem.findMany({
          where: { orderId: order.id },
        });
        
        for (const item of orderItemsToRestore) {
          if (item.variantId) {
            // Since inventory was already committed (reserved decremented) on payment,
            // we need to add back to available quantity
            await prisma.boutiqueProductVariant.update({
              where: { id: item.variantId },
              data: { quantity: { increment: item.quantity } },
            });
          }
        }

        // Initiate refund
        try {
          await initiateBoutiqueRefund(order.id, 'Seller cancelled order');
        } catch (refundError) {
          console.error('Refund initiation failed:', refundError);
          // Continue with cancellation, admin will handle refund manually
        }

        // Notify buyer
        const buyerInfo = await prisma.user.findUnique({
          where: { id: order.buyerId },
          select: { email: true, name: true },
        });
        
        if (buyerInfo?.email) {
          await sendEmail({
            to: buyerInfo.email,
            subject: `Order #${order.orderNumber} Cancelled by Seller`,
            html: `
              <h2>Order Cancelled</h2>
              <p>Hi ${buyerInfo.name || 'Customer'},</p>
              <p>Unfortunately, the seller has cancelled your order #${order.orderNumber}.</p>
              <p>Your refund of ₦${order.total.toLocaleString()} will be processed within 3-5 business days.</p>
              <p>We apologize for any inconvenience.</p>
            `,
          });
        }

        message = 'Order cancelled. Refund is being processed for the buyer.';
        
        console.log(`Seller ${order.sellerId} cancelled order ${orderId}`);
        
        // Track cancellation for potential tier impact
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            // Increment cancellation count if field exists
          },
        });
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedOrder = await prisma.boutiqueOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update order' },
      { status: 500 }
    );
  }
}
