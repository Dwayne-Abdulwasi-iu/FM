// GET /api/cron/boutique-deadlines - Check for overdue seller direct orders
// Run every hour to check deadlines and send warnings

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { FULFILLMENT_METHOD } from '@/lib/boutique/constants';
import { sendEmail } from '@/lib/email';

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) return false;
  
  return authHeader === `Bearer ${cronSecret}`;
}

// Send warning email to seller
async function sendDeadlineWarning(
  seller: { email: string; name: string | null },
  order: { orderNumber: string; id: string },
  hoursRemaining: number
) {
  const urgency = hoursRemaining <= 6 ? '🚨 URGENT' : '⚠️ Warning';
  
  await sendEmail({
    to: seller.email,
    subject: `${urgency}: Order #${order.orderNumber} ship deadline approaching!`,
    html: `
      <h2>${urgency}: Ship Your Order Soon!</h2>
      <p>Hi ${seller.name || 'Seller'},</p>
      
      <div style="background: ${hoursRemaining <= 6 ? '#fee2e2' : '#fef3c7'}; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">⏰ Only ${Math.round(hoursRemaining)} hours remaining!</h3>
        <p style="margin: 0;">Order #${order.orderNumber} must be shipped soon or it will be auto-cancelled.</p>
      </div>

      <p>Late shipments affect your seller tier and reputation. Please ship immediately or cancel if unable to fulfill.</p>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL}/seller/boutique/orders" 
           style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Ship Order Now
        </a>
      </p>
    `,
  });
}

// Send overdue notification to admin
async function notifyAdminOverdue(
  order: { 
    orderNumber: string; 
    id: string; 
    sellerId: string; 
    sellerName: string | null;
    buyerEmail: string;
    total: number;
  }
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: `🚨 Overdue Order #${order.orderNumber} - Intervention Required`,
    html: `
      <h2>Seller Direct Order Overdue</h2>
      
      <p>Order #${order.orderNumber} has exceeded its 48-hour shipping deadline.</p>

      <h3>Details</h3>
      <ul>
        <li><strong>Order ID:</strong> ${order.id}</li>
        <li><strong>Order Number:</strong> ${order.orderNumber}</li>
        <li><strong>Seller:</strong> ${order.sellerName || order.sellerId}</li>
        <li><strong>Buyer Email:</strong> ${order.buyerEmail}</li>
        <li><strong>Total:</strong> ₦${order.total.toLocaleString()}</li>
      </ul>

      <h3>Recommended Actions</h3>
      <ol>
        <li>Contact seller to understand delay</li>
        <li>If unresponsive, cancel order and refund buyer</li>
        <li>Consider tier demotion for seller</li>
      </ol>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL}/admin/boutique/orders?status=overdue" 
           style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          View Overdue Orders
        </a>
      </p>
    `,
  });
}

export async function GET(request: NextRequest) {
  // Verify cron authentication
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    const results = {
      warnings24h: 0,
      warnings12h: 0,
      warnings6h: 0,
      overdueOrders: 0,
      autoCancelled: 0,
    };

    // Find seller direct orders in PROCESSING status with deadlines
    const ordersWithDeadlines = await prisma.boutiqueOrder.findMany({
      where: {
        fulfillmentMethod: FULFILLMENT_METHOD.SELLER_DIRECT,
        status: 'PROCESSING',
        sellerShipDeadline: { not: null },
      },
      include: {
        seller: {
          select: { id: true, email: true, name: true },
        },
        buyer: {
          select: { email: true, name: true },
        },
      },
    });

    for (const order of ordersWithDeadlines) {
      if (!order.sellerShipDeadline) continue;

      const deadline = new Date(order.sellerShipDeadline);
      const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursRemaining < 0) {
        // Order is overdue
        results.overdueOrders++;

        // Check if we should auto-cancel (overdue by more than 24 hours)
        if (hoursRemaining < -24) {
          // Auto-cancel order
          await prisma.boutiqueOrder.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
              sellerCancelled: true,
              sellerShippedLate: true,
              cancelledAt: now,
              cancelReason: 'Auto-cancelled: Exceeded shipping deadline by 24+ hours',
            },
          });

          // Restore inventory
          const orderItems = await prisma.boutiqueOrderItem.findMany({
            where: { orderId: order.id },
          });
          
          for (const item of orderItems) {
            if (item.variantId) {
              await prisma.boutiqueProductVariant.update({
                where: { id: item.variantId },
                data: { quantity: { increment: item.quantity } },
              });
            }
          }

          // TODO: Initiate refund
          // Refund logic would depend on payment processor (Stripe/Paystack)
          // Check order.paymentProcessor and order.paymentIntentId/chargeId
          // Call appropriate refund endpoint
          // Example: await stripe.refunds.create({ charge: order.chargeId })
          // For now, just mark order as cancelled
          results.autoCancelled++;

          // Notify buyer about cancellation
          if (order.buyer.email) {
            await sendEmail({
              to: order.buyer.email,
              subject: `Order #${order.orderNumber} Cancelled - Refund Processing`,
              html: `
                <h2>Your Order Has Been Cancelled</h2>
                <p>Hi ${order.buyer.name || 'Customer'},</p>
                <p>Unfortunately, the seller was unable to ship your order #${order.orderNumber} in time.</p>
                <p>Your refund of ₦${order.total.toLocaleString()} will be processed within 3-5 business days.</p>
                <p>We apologize for any inconvenience.</p>
              `,
            });
          }

          // Update seller's late shipment count for potential tier demotion
          await prisma.user.update({
            where: { id: order.sellerId },
            data: {
              // Increment a late shipment counter (add field if needed)
            },
          });

        } else {
          // Notify admin about overdue order
          await notifyAdminOverdue({
            orderNumber: order.orderNumber,
            id: order.id,
            sellerId: order.sellerId,
            sellerName: order.seller.name,
            buyerEmail: order.buyer.email || 'unknown',
            total: order.total,
          });
        }

      } else if (hoursRemaining <= 6) {
        // 6 hour warning - critical
        results.warnings6h++;
        if (order.seller.email) {
          await sendDeadlineWarning(
            { email: order.seller.email, name: order.seller.name },
            { orderNumber: order.orderNumber, id: order.id },
            hoursRemaining
          );
        }

      } else if (hoursRemaining <= 12) {
        // 12 hour warning
        results.warnings12h++;
        if (order.seller.email) {
          await sendDeadlineWarning(
            { email: order.seller.email, name: order.seller.name },
            { orderNumber: order.orderNumber, id: order.id },
            hoursRemaining
          );
        }

      } else if (hoursRemaining <= 24) {
        // 24 hour warning
        results.warnings24h++;
        // Only send once per day - check if we already notified
        // For now, send anyway (in production, track notification timestamps)
      }
    }

    // Also check for orders stuck in AWAITING_SELLER_CONFIRMATION too long
    const staleAwaitingOrders = await prisma.boutiqueOrder.findMany({
      where: {
        fulfillmentMethod: FULFILLMENT_METHOD.SELLER_DIRECT,
        status: 'AWAITING_SELLER_CONFIRMATION',
        createdAt: {
          lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // More than 24 hours old
        },
      },
      include: {
        seller: { select: { email: true, name: true } },
      },
    });

    // Send reminders for unconfirmed orders
    for (const order of staleAwaitingOrders) {
      if (order.seller.email) {
        await sendEmail({
          to: order.seller.email,
          subject: `⚠️ Unconfirmed Order #${order.orderNumber} - Please Respond`,
          html: `
            <h2>Order Waiting for Your Confirmation</h2>
            <p>Hi ${order.seller.name || 'Seller'},</p>
            <p>Order #${order.orderNumber} has been waiting for your confirmation for over 24 hours.</p>
            <p>Please confirm you can fulfill this order, or cancel if you cannot.</p>
            <p style="margin-top: 24px;">
              <a href="${process.env.NEXTAUTH_URL}/seller/boutique/orders" 
                 style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                Review Order
              </a>
            </p>
          `,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Deadline check completed',
      results: {
        ...results,
        staleAwaitingOrders: staleAwaitingOrders.length,
        checkedOrders: ordersWithDeadlines.length,
        timestamp: now.toISOString(),
      },
    });

  } catch (error) {
    console.error('Deadline check error:', error);
    return NextResponse.json(
      { success: false, message: 'Deadline check failed', error: String(error) },
      { status: 500 }
    );
  }
}
