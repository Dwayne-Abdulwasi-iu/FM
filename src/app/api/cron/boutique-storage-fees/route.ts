// GET /api/cron/boutique-storage-fees - Calculate and accrue storage fees for unsold inventory
// Run daily to check products past free storage period

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BOUTIQUE_DEFAULTS } from '@/lib/boutique/constants';
import { sendEmail } from '@/lib/email';

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
    const results = {
      productsProcessed: 0,
      feesAccrued: 0,
      sellersNotified: 0,
      productsNearingMax: 0,
    };

    // Find ADMIN_STOCK products that:
    // 1. Are LIVE or VERIFICATION_PASSED (in warehouse, available)
    // 2. Have storageFeeStartDate <= now (past free period)
    // 3. Haven't been charged today yet
    const productsWithStorageFees = await prisma.boutiqueProduct.findMany({
      where: {
        fulfillmentMethod: 'ADMIN_STOCK',
        status: { in: ['LIVE', 'VERIFICATION_PASSED'] },
        storageFeeStartDate: { lte: now },
        OR: [
          { lastStorageFeeDate: null },
          { lastStorageFeeDate: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }, // More than 24h ago
        ],
      },
      include: {
        seller: { select: { id: true, email: true, name: true } },
      },
    });

    // Group by seller for batch notification
    const sellerFees = new Map<string, { 
      seller: { id: string; email: string | null; name: string | null };
      products: Array<{ id: string; title: string; fee: number; daysInStorage: number }>;
      totalFee: number;
    }>();

    for (const product of productsWithStorageFees) {
      // Calculate days in storage since fee start date
      const storageFeeStart = product.storageFeeStartDate!;
      const daysInStorage = Math.floor((now.getTime() - storageFeeStart.getTime()) / (24 * 60 * 60 * 1000));
      
      // Calculate daily fee (monthly fee / 30)
      const monthlyFee = (product.basePrice * BOUTIQUE_DEFAULTS.storageFeePct) / 100;
      const dailyFee = monthlyFee / 30;
      
      // Accrue fee
      await prisma.boutiqueProduct.update({
        where: { id: product.id },
        data: {
          storageFeesAccrued: { increment: dailyFee },
          lastStorageFeeDate: now,
        },
      });

      results.productsProcessed++;
      results.feesAccrued += dailyFee;

      // Track for seller notification
      if (!sellerFees.has(product.sellerId)) {
        sellerFees.set(product.sellerId, {
          seller: product.seller,
          products: [],
          totalFee: 0,
        });
      }
      const sellerData = sellerFees.get(product.sellerId)!;
      sellerData.products.push({
        id: product.id,
        title: product.title,
        fee: dailyFee,
        daysInStorage,
      });
      sellerData.totalFee += dailyFee;

      // Check if nearing max storage days
      const totalDaysInWarehouse = product.warehouseReceivedAt
        ? Math.floor((now.getTime() - product.warehouseReceivedAt.getTime()) / (24 * 60 * 60 * 1000))
        : daysInStorage + BOUTIQUE_DEFAULTS.freeStorageDays;
      
      if (totalDaysInWarehouse >= BOUTIQUE_DEFAULTS.maxStorageDays - 7) {
        results.productsNearingMax++;
      }
    }

    // Send weekly summary to sellers with storage fees (every Monday)
    if (now.getDay() === 1) { // Monday
      for (const [sellerId, data] of sellerFees) {
        if (data.seller.email && data.totalFee > 0) {
          const totalAccrued = await prisma.boutiqueProduct.aggregate({
            where: { sellerId, storageFeesAccrued: { gt: 0 } },
            _sum: { storageFeesAccrued: true },
          });

          await sendEmail({
            to: data.seller.email,
            subject: `📦 Weekly Storage Fee Summary - ₦${Math.round(totalAccrued._sum.storageFeesAccrued || 0).toLocaleString()}`,
            html: `
              <h2>Storage Fee Summary</h2>
              <p>Hi ${data.seller.name || 'Seller'},</p>
              
              <p>Here's your weekly storage fee summary for products in our warehouse:</p>

              <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">Total Accrued Fees: ₦${Math.round(totalAccrued._sum.storageFeesAccrued || 0).toLocaleString()}</h3>
                <p style="margin: 0;">Storage fees are ${BOUTIQUE_DEFAULTS.storageFeePct}% of product price per month, charged after ${BOUTIQUE_DEFAULTS.freeStorageDays} days free storage.</p>
              </div>

              <h3>Products Accruing Fees This Week</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f3f4f6;">
                  <th style="padding: 8px; text-align: left;">Product</th>
                  <th style="padding: 8px; text-align: right;">Days</th>
                  <th style="padding: 8px; text-align: right;">Daily Fee</th>
                </tr>
                ${data.products.map(p => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.title}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">${p.daysInStorage}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">₦${Math.round(p.fee).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </table>

              <div style="margin-top: 24px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
                <p><strong>💡 Tip:</strong> Reduce storage fees by:</p>
                <ul>
                  <li>Running sales to move slow-moving inventory</li>
                  <li>Requesting returns for items unlikely to sell</li>
                  <li>Using Seller Direct shipping for future listings (VIP+ tiers)</li>
                </ul>
              </div>

              <p style="margin-top: 24px;">
                <a href="${process.env.NEXTAUTH_URL}/seller/boutique/products" 
                   style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                  Manage Your Products
                </a>
              </p>
            `,
          });

          results.sellersNotified++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Storage fees processed',
      results,
    });

  } catch (error) {
    console.error('Storage fee cron error:', error);
    return NextResponse.json(
      { success: false, message: 'Storage fee processing failed' },
      { status: 500 }
    );
  }
}
