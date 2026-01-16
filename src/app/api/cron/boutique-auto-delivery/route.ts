// GET /api/cron/boutique-auto-delivery - Auto-confirm deliveries after 14 days
// Run daily to check shipped orders eligible for auto-confirmation

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { releaseSellerPayout } from '@/lib/boutique/payout';
import { sendEmail } from '@/lib/email';

const AUTO_DELIVERY_DAYS = 14;

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) return false;
  
  return authHeader === `Bearer ${cronSecret}`;
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
    const autoConfirmDate = new Date(now.getTime() - AUTO_DELIVERY_DAYS * 24 * 60 * 60 * 1000);
    
    const results = {
      autoConfirmed: 0,
      payoutsReleased: 0,
      failed: 0,
    };

    // Find SHIPPED orders that shipped more than AUTO_DELIVERY_DAYS ago
    const eligibleOrders = await prisma.boutiqueOrder.findMany({
      where: {
        status: 'SHIPPED',
        shippedAt: { lte: autoConfirmDate },
      },
      include: {
        buyer: { select: { email: true, name: true } },
        seller: { select: { email: true, name: true } },
        product: { select: { title: true } },
      },
    });

    for (const order of eligibleOrders) {
      try {
        // Mark as delivered
        await prisma.boutiqueOrder.update({
          where: { id: order.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: now,
            buyerNotes: `Auto-confirmed after ${AUTO_DELIVERY_DAYS} days`,
          },
        });

        // Immediately complete (no return window in auto-confirm)
        await prisma.boutiqueOrder.update({
          where: { id: order.id },
          data: { status: 'COMPLETED' },
        });

        results.autoConfirmed++;

        // Release payout
        const payoutResult = await releaseSellerPayout(order.id);
        if (payoutResult.success) {
          results.payoutsReleased++;
        }

        // Notify buyer
        if (order.buyer.email) {
          await sendEmail({
            to: order.buyer.email,
            subject: `📦 Order #${order.orderNumber} Auto-Confirmed as Delivered`,
            html: `
              <h2>Order Auto-Confirmed</h2>
              <p>Hi ${order.buyer.name || 'Customer'},</p>
              
              <p>Your order #${order.orderNumber} (${order.product.title}) has been automatically confirmed as delivered after ${AUTO_DELIVERY_DAYS} days.</p>

              <p>If you haven't received your order or have any issues, please contact our customer support within 7 days.</p>

              <p style="margin-top: 24px;">
                <a href="${process.env.NEXTAUTH_URL}/customer-care" 
                   style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                  Contact Support
                </a>
              </p>
            `,
          });
        }

        // Notify seller
        if (order.seller.email) {
          await sendEmail({
            to: order.seller.email,
            subject: `✅ Order #${order.orderNumber} Completed & Payout Released`,
            html: `
              <h2>Order Completed!</h2>
              <p>Hi ${order.seller.name || 'Seller'},</p>
              
              <p>Order #${order.orderNumber} has been auto-confirmed as delivered and completed.</p>
              
              <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;">💰 Your payout of ₦${order.sellerPayout.toLocaleString()} is being processed!</p>
              </div>

              <p style="margin-top: 24px;">
                <a href="${process.env.NEXTAUTH_URL}/seller/earnings" 
                   style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                  View Earnings
                </a>
              </p>
            `,
          });
        }

      } catch (error) {
        console.error(`Failed to auto-confirm order ${order.id}:`, error);
        results.failed++;
      }
    }

    // Also send reminders for orders shipping soon (approaching auto-confirm)
    const reminderDate = new Date(now.getTime() - (AUTO_DELIVERY_DAYS - 3) * 24 * 60 * 60 * 1000);
    const reminderOrders = await prisma.boutiqueOrder.findMany({
      where: {
        status: 'SHIPPED',
        shippedAt: {
          lte: reminderDate,
          gt: autoConfirmDate,
        },
      },
      include: {
        buyer: { select: { email: true, name: true } },
        product: { select: { title: true } },
      },
    });

    for (const order of reminderOrders) {
      const daysUntilAutoConfirm = Math.ceil(
        (order.shippedAt!.getTime() + AUTO_DELIVERY_DAYS * 24 * 60 * 60 * 1000 - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (order.buyer.email) {
        await sendEmail({
          to: order.buyer.email,
          subject: `📦 Confirm Delivery? Order #${order.orderNumber}`,
          html: `
            <h2>Have You Received Your Order?</h2>
            <p>Hi ${order.buyer.name || 'Customer'},</p>
            
            <p>Your order #${order.orderNumber} (${order.product.title}) was shipped ${AUTO_DELIVERY_DAYS - daysUntilAutoConfirm} days ago.</p>

            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;">This order will be automatically confirmed as delivered in <strong>${daysUntilAutoConfirm} days</strong>.</p>
            </div>

            <p>If you've received your order, please confirm delivery to help the seller. If you haven't received it, please contact support.</p>

            <p style="margin-top: 24px;">
              <a href="${process.env.NEXTAUTH_URL}/profile/orders/${order.id}" 
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-right: 8px;">
                Confirm Delivery
              </a>
              <a href="${process.env.NEXTAUTH_URL}/customer-care" 
                 style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                Report Issue
              </a>
            </p>
          `,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-delivery processing completed',
      results: {
        ...results,
        remindersent: reminderOrders.length,
      },
    });

  } catch (error) {
    console.error('Auto-delivery cron error:', error);
    return NextResponse.json(
      { success: false, message: 'Auto-delivery processing failed' },
      { status: 500 }
    );
  }
}
