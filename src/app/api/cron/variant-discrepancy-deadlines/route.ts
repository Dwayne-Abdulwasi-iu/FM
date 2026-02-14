// Cron job to handle variant discrepancy deadlines
// - Sends warning emails 5 days after discrepancy created
// - Auto-closes PENDING decisions after 7 days
// - Transitions product to LIVE regardless

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

const DEADLINE_DAYS = 7;
const WARNING_DAYS = 5;

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() - WARNING_DAYS * 24 * 60 * 60 * 1000);
    const deadlineThreshold = new Date(now.getTime() - DEADLINE_DAYS * 24 * 60 * 60 * 1000);

    // Get PENDING discrepancies that are approaching deadline
    const pendingDiscrepancies = await prisma.variantDiscrepancy.findMany({
      where: {
        acceptanceStatus: 'PENDING',
        createdAt: {
          lt: warningThreshold,
        },
      },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, title: true },
            },
          },
        },
        shipment: {
          include: {
            seller: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    let warningsSent = 0;
    let autoClosedCount = 0;

    // Process each pending discrepancy
    for (const discrepancy of pendingDiscrepancies) {
      const daysOld = Math.floor(
        (now.getTime() - discrepancy.createdAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Send warning at day 5
      if (daysOld >= WARNING_DAYS && daysOld < DEADLINE_DAYS) {
        try {
          await sendEmail({
            to: discrepancy.shipment.seller.email,
            subject: '⏰ Variant Quality Decision Pending - Action Required',
            text: `Your variant discrepancy decision for "${discrepancy.variant.product.title}" is pending and will auto-close in 2 days.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 4px;">
                  <p style="margin: 0; color: #92400E; font-weight: bold;">⏰ Action Required: Variant Quality Decision Pending</p>
                  <p style="color: #92400E; margin: 10px 0 0 0;">
                    Your variant discrepancy decision for <strong>"${discrepancy.variant.product.title}"</strong> has been pending for ${daysOld} days.
                  </p>
                  <p style="color: #92400E; margin: 10px 0 0 0;">
                    If no decision is made within the next 2 days, the items will automatically be accepted as-is and made available for purchase.
                  </p>
                  <p style="color: #92400E; margin: 10px 0 0 0; font-size: 12px;">
                    <strong>Important:</strong> Auto-accept assumes the received quantity matches the expected quantity. If items are damaged or missing, please reject them within 24 hours.
                  </p>
                  <p style="color: #92400E; margin: 15px 0 0 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/seller/boutique/warehouse-inventory" style="color: #F59E0B; text-decoration: none; font-weight: bold;">
                      Review Quality Decision →
                    </a>
                  </p>
                </div>
              </div>
            `,
          });
          warningsSent++;
        } catch (emailError) {
          console.error(`Failed to send warning for discrepancy ${discrepancy.id}:`, emailError);
        }
      }

      // Auto-close at day 7
      if (daysOld >= DEADLINE_DAYS) {
        try {
          // Auto-accept the variant (assume it's acceptable if no decision was made)
          await prisma.variantDiscrepancy.update({
            where: { id: discrepancy.id },
            data: {
              acceptanceStatus: 'ACCEPTED',
              notes: 'Auto-accepted after 7 days of no admin decision',
            },
          });

          // Update variant quantity to received amount
          await prisma.boutiqueProductVariant.update({
            where: { id: discrepancy.variantId },
            data: {
              quantity: discrepancy.quantityReceived ?? discrepancy.quantityExpected,
            },
          });

          // Notify seller of auto-acceptance
          try {
            await sendEmail({
              to: discrepancy.shipment.seller.email,
              subject: '✅ Variant Quality Decision Auto-Accepted',
              text: `Your variant "${discrepancy.variant.product.title}" has been auto-accepted after 7 days.`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color: #D1FAE5; border-left: 4px solid #059669; padding: 20px; border-radius: 4px;">
                    <p style="margin: 0; color: #065F46; font-weight: bold;">✅ Variant Auto-Accepted After 7 Days</p>
                    <p style="color: #065F46; margin: 10px 0 0 0;">
                      Your variant <strong>"${discrepancy.variant.product.title}"</strong> has been automatically accepted after 7 days of pending review.
                    </p>
                    <p style="color: #065F46; margin: 10px 0 0 0;">
                      <strong>${discrepancy.quantityReceived ?? discrepancy.quantityExpected} units</strong> are now available for purchase on the marketplace.
                    </p>
                    <p style="color: #065F46; margin: 10px 0 0 0; font-size: 12px;">
                      <strong>Note:</strong> Auto-accept assumes the received quantity matches your shipment records. If there's a discrepancy, please contact support immediately.
                    </p>
                  </div>
                </div>
              `,
            });
          } catch (notifyError) {
            console.error(`Failed to notify seller of auto-acceptance:`, notifyError);
          }

          autoClosedCount++;
        } catch (updateError) {
          console.error(`Failed to auto-close discrepancy ${discrepancy.id}:`, updateError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Variant discrepancy deadline job completed',
      warningsSent,
      autoClosedCount,
      totalProcessed: pendingDiscrepancies.length,
    });
  } catch (error) {
    console.error('Error in variant discrepancy deadline cron:', error);
    return NextResponse.json(
      { success: false, message: 'Cron job failed', error: (error as Error).message },
      { status: 500 }
    );
  }
}
