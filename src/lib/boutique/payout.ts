// Boutique seller payout utilities
// Handles releasing funds to sellers after order completion

import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  message: string;
  amount?: number;
}

/**
 * Calculate seller payout for an order
 * Deducts platform fee and any storage fees
 */
export function calculateSellerPayout(
  orderTotal: number,
  platformFee: number,
  storageFeesAccrued: number = 0
): { payout: number; deductions: { platformFee: number; storageFees: number } } {
  const payout = orderTotal - platformFee - storageFeesAccrued;
  return {
    payout: Math.max(0, payout),
    deductions: {
      platformFee,
      storageFees: storageFeesAccrued,
    },
  };
}

/**
 * Release payout to seller after order completion
 * DELAYED by 1-2 days after delivery to allow for return requests
 * Called when order status becomes COMPLETED
 * Uses BoutiqueOrder.sellerPayout field - no separate earnings table needed
 */
export async function releaseSellerPayout(orderId: string): Promise<PayoutResult> {
  try {
    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: orderId },
      include: {
        seller: { 
          select: { 
            id: true, 
            email: true, 
            name: true,
            sellerAccount: true,
          } 
        },
        product: {
          select: {
            storageFeesAccrued: true,
            fulfillmentMethod: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (order.status !== 'COMPLETED') {
      return { success: false, message: 'Order not yet completed' };
    }

    // Check if payout already processed (paymentStatus contains payout info)
    if (order.paymentStatus === 'PAYOUT_RELEASED') {
      return { success: true, message: 'Payout already processed', amount: order.sellerPayout };
    }

    // DELAY PAYOUT: Don't release immediately, schedule for 2 days after delivery
    // This allows buyers full 7-day return window (2-day hold covers verification period)
    // Store scheduled release time in database
    if (order.paymentStatus !== 'PAYOUT_SCHEDULED') {
      const releaseAt = new Date();
      releaseAt.setDate(releaseAt.getDate() + 2); // Release in 2 days for extra protection

      await prisma.boutiqueOrder.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAYOUT_SCHEDULED',
          payoutScheduledAt: releaseAt,
        },
      });

      // Notify seller payout is scheduled
      if (order.seller.email) {
        await sendEmail({
          to: order.seller.email,
          subject: `✅ Payout Scheduled: ₦${order.sellerPayout.toLocaleString()} from Order #${order.orderNumber}`,
          html: `
            <h2>Payout Scheduled!</h2>
            <p>Hi ${order.seller.name || 'Seller'},</p>
            
            <p>Your payout for Order #${order.orderNumber} has been scheduled and will be released within the next 1-2 business days.</p>

            <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0;">💰 Scheduled Payout: ₦${order.sellerPayout.toLocaleString()}</h3>
              <p style="margin: 0; font-size: 14px; color: #1e40af;">Expected release: ${releaseAt.toLocaleDateString()}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
              This delay allows us to process any buyer returns within the 7-day return window. Your funds will be safe and automatically transferred once the holding period expires.
            </p>
          `,
        });
      }

      return {
        success: true,
        message: 'Payout scheduled for 1-2 days',
        amount: order.sellerPayout,
      };
    }

    return {
      success: true,
      message: 'Payout already scheduled',
      amount: order.sellerPayout,
    };
  } catch (error) {
    console.error('Payout release error:', error);
    return {
      success: false,
      message: `Payout failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Process scheduled payouts that are due (1-2 days have passed)
 * Call this from a cron job: /api/cron/process-payouts
 */
export async function processScheduledPayouts(): Promise<{ 
  processed: number; 
  failed: number; 
  errors: string[] 
}> {
  const result: { processed: number; failed: number; errors: string[] } = { processed: 0, failed: 0, errors: [] };

  try {
    // Find all orders with scheduled payouts that are now due
    const duePayouts = await prisma.boutiqueOrder.findMany({
      where: {
        paymentStatus: 'PAYOUT_SCHEDULED',
        payoutScheduledAt: {
          lte: new Date(), // Due date has passed
        },
      },
      include: {
        seller: { 
          select: { 
            id: true, 
            email: true, 
            name: true,
            sellerAccount: true,
          } 
        },
        product: {
          select: {
            storageFeesAccrued: true,
            fulfillmentMethod: true,
          },
        },
      },
    });

    console.log(`Processing ${duePayouts.length} scheduled payouts...`);

    for (const order of duePayouts) {
      try {
        // For ADMIN_STOCK, deduct any accrued storage fees
        const storageFees = order.product.fulfillmentMethod === 'ADMIN_STOCK' 
          ? order.product.storageFeesAccrued 
          : 0;

        // Recalculate final payout with storage deductions
        const finalPayout = Math.max(0, order.sellerPayout - storageFees);

        // Update order to mark payout released
        await prisma.boutiqueOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAYOUT_RELEASED',
            payoutReleasedAt: new Date(),
            sellerPayout: finalPayout, // Update with final amount after deductions
          },
        });

        // Update seller's total earnings
        await prisma.user.update({
          where: { id: order.sellerId },
          data: {
            totalEarnings: { increment: finalPayout },
            totalSales: { increment: 1 },
          },
        });

        // Clear storage fees from product (if any were deducted)
        if (storageFees > 0) {
          await prisma.boutiqueProduct.update({
            where: { id: order.productId },
            data: { storageFeesAccrued: 0 },
          });
        }

        // Notify seller
        if (order.seller.email) {
          const deductions = {
            platformFee: order.platformFee,
            storageFees,
          };
          
          await sendEmail({
            to: order.seller.email,
            subject: `💰 Payout Released: ₦${finalPayout.toLocaleString()} from Order #${order.orderNumber}`,
            html: `
              <h2>Your Payout Has Been Released!</h2>
              <p>Hi ${order.seller.name || 'Seller'},</p>
              
              <p>Great news! Order #${order.orderNumber} payout has been released and is being processed.</p>

              <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">💰 Payout: ₦${finalPayout.toLocaleString()}</h3>
              </div>

              <h3>Breakdown</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px;">Order Total</td>
                  <td style="padding: 8px; text-align: right;">₦${order.total.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px;">Platform Fee</td>
                  <td style="padding: 8px; text-align: right; color: #dc2626;">-₦${deductions.platformFee.toLocaleString()}</td>
                </tr>
                ${deductions.storageFees > 0 ? `
                <tr>
                  <td style="padding: 8px;">Storage Fees</td>
                  <td style="padding: 8px; text-align: right; color: #dc2626;">-₦${Math.round(deductions.storageFees).toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr style="font-weight: bold; border-top: 2px solid #e5e7eb;">
                  <td style="padding: 8px;">Your Payout</td>
                  <td style="padding: 8px; text-align: right; color: #059669;">₦${finalPayout.toLocaleString()}</td>
                </tr>
              </table>

              <p style="margin-top: 16px; color: #6b7280;">
                ${order.seller.sellerAccount 
                  ? 'Funds will be transferred to your registered bank account within 1-3 business days.' 
                  : 'Please add your bank account details to receive payouts.'}
              </p>

              <p style="margin-top: 24px;">
                <a href="${process.env.NEXTAUTH_URL}/seller/earnings" 
                   style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                  View Earnings
                </a>
              </p>
            `,
          });
        }

        result.processed++;
      } catch (error) {
        result.failed++;
        const errorMsg = `Order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`Payout processing complete: ${result.processed} processed, ${result.failed} failed`);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMsg);
    console.error('Error processing scheduled payouts:', error);
    return result;
  }
}

/**
 * Get pending payouts for a seller (payouts that haven't been released yet)
 * Includes both SCHEDULED and RELEASED but not yet transferred
 */
export async function getSellerPendingPayouts(sellerId: string) {
  const pendingOrders = await prisma.boutiqueOrder.findMany({
    where: {
      sellerId,
      status: 'COMPLETED',
      paymentStatus: { 
        in: ['PAYOUT_SCHEDULED', 'PAYOUT_RELEASED'] 
      },
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      sellerPayout: true,
      platformFee: true,
      deliveredAt: true,
      paymentStatus: true,
      payoutScheduledAt: true,
      payoutReleasedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    orders: pendingOrders,
    totalPending: pendingOrders.reduce((sum, o) => sum + o.sellerPayout, 0),
    count: pendingOrders.length,
  };
}
