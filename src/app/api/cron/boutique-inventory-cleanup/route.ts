// GET /api/cron/boutique-inventory-cleanup - Handle stale inventory (liquidation/return)
// Run daily to check products past max storage period

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

// Notify seller about pending liquidation
async function notifySellerLiquidationWarning(
  seller: { email: string | null; name: string | null },
  products: Array<{ id: string; title: string; basePrice: number; daysRemaining: number }>
) {
  if (!seller.email) return;

  await sendEmail({
    to: seller.email,
    subject: `⚠️ Action Required: ${products.length} product(s) nearing liquidation`,
    html: `
      <h2>Products Nearing Liquidation</h2>
      <p>Hi ${seller.name || 'Seller'},</p>
      
      <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">⚠️ ${products.length} product(s) will be liquidated soon</h3>
        <p style="margin: 0;">Products that don't sell within ${BOUTIQUE_DEFAULTS.maxStorageDays} days are either returned or liquidated at a ${BOUTIQUE_DEFAULTS.liquidationDiscountPct}% discount.</p>
      </div>

      <h3>Products Requiring Action</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; text-align: left;">Product</th>
          <th style="padding: 8px; text-align: right;">Price</th>
          <th style="padding: 8px; text-align: right;">Days Remaining</th>
        </tr>
        ${products.map(p => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.title}</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">₦${p.basePrice.toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb; color: ${p.daysRemaining <= 3 ? '#dc2626' : '#f59e0b'};">${p.daysRemaining}</td>
          </tr>
        `).join('')}
      </table>

      <h3 style="margin-top: 24px;">Your Options</h3>
      <ol>
        <li><strong>Run a sale</strong> - Reduce price to attract buyers</li>
        <li><strong>Request return</strong> - Pay return shipping to get your items back</li>
        <li><strong>Allow liquidation</strong> - We sell at ${BOUTIQUE_DEFAULTS.liquidationDiscountPct}% off, you get ${BOUTIQUE_DEFAULTS.sellerLiquidationSharePct}% of sale</li>
      </ol>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL}/seller/boutique/products?filter=stale" 
           style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Manage Stale Products
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
    const maxStorageDate = new Date(now.getTime() - BOUTIQUE_DEFAULTS.maxStorageDays * 24 * 60 * 60 * 1000);
    const warningDate = new Date(now.getTime() - (BOUTIQUE_DEFAULTS.maxStorageDays - 7) * 24 * 60 * 60 * 1000);
    
    const results = {
      warnings: 0,
      liquidated: 0,
      returnRequested: 0,
      sellersNotified: 0,
    };

    // 1. Find products nearing max storage (7 days warning)
    const warningProducts = await prisma.boutiqueProduct.findMany({
      where: {
        fulfillmentMethod: 'ADMIN_STOCK',
        status: 'LIVE',
        warehouseReceivedAt: {
          lte: warningDate,
          gt: maxStorageDate,
        },
      },
      include: {
        seller: { select: { id: true, email: true, name: true } },
      },
    });

    // Group by seller and send warnings
    const sellerWarnings = new Map<string, {
      seller: { email: string | null; name: string | null };
      products: Array<{ id: string; title: string; basePrice: number; daysRemaining: number }>;
    }>();

    for (const product of warningProducts) {
      const daysInStorage = Math.floor(
        (now.getTime() - product.warehouseReceivedAt!.getTime()) / (24 * 60 * 60 * 1000)
      );
      const daysRemaining = BOUTIQUE_DEFAULTS.maxStorageDays - daysInStorage;

      if (!sellerWarnings.has(product.sellerId)) {
        sellerWarnings.set(product.sellerId, {
          seller: product.seller,
          products: [],
        });
      }
      sellerWarnings.get(product.sellerId)!.products.push({
        id: product.id,
        title: product.title,
        basePrice: product.basePrice,
        daysRemaining,
      });
      results.warnings++;
    }

    // Send warning emails
    for (const [, data] of sellerWarnings) {
      await notifySellerLiquidationWarning(data.seller, data.products);
      results.sellersNotified++;
    }

    // 2. Find products past max storage - auto-liquidate
    const staleProducts = await prisma.boutiqueProduct.findMany({
      where: {
        fulfillmentMethod: 'ADMIN_STOCK',
        status: 'LIVE',
        warehouseReceivedAt: { lte: maxStorageDate },
      },
      include: {
        seller: { select: { id: true, email: true, name: true } },
        variants: true,
      },
    });

    for (const product of staleProducts) {
      // Mark as liquidated with discounted price
      const liquidationPrice = Math.round(
        product.basePrice * (1 - BOUTIQUE_DEFAULTS.liquidationDiscountPct / 100)
      );

      await prisma.boutiqueProduct.update({
        where: { id: product.id },
        data: {
          status: 'LIQUIDATED',
          salePrice: liquidationPrice,
          // Store original price and liquidation info
        },
      });

      results.liquidated++;

      // Notify seller
      if (product.seller.email) {
        await sendEmail({
          to: product.seller.email,
          subject: `📦 Product Liquidated: ${product.title}`,
          html: `
            <h2>Product Moved to Liquidation</h2>
            <p>Hi ${product.seller.name || 'Seller'},</p>
            
            <p>Your product <strong>${product.title}</strong> has been in our warehouse for ${BOUTIQUE_DEFAULTS.maxStorageDays}+ days and has been moved to liquidation.</p>

            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Original Price:</strong> ₦${product.basePrice.toLocaleString()}</p>
              <p style="margin: 0 0 8px 0;"><strong>Liquidation Price:</strong> ₦${liquidationPrice.toLocaleString()} (${BOUTIQUE_DEFAULTS.liquidationDiscountPct}% off)</p>
              <p style="margin: 0;"><strong>Your Share if Sold:</strong> ₦${Math.round(liquidationPrice * BOUTIQUE_DEFAULTS.sellerLiquidationSharePct / 100).toLocaleString()} (${BOUTIQUE_DEFAULTS.sellerLiquidationSharePct}%)</p>
            </div>

            <p>The product will remain available at the discounted price. If it sells, you'll receive ${BOUTIQUE_DEFAULTS.sellerLiquidationSharePct}% of the sale.</p>

            <p style="color: #6b7280; font-size: 14px;">To avoid future liquidations, consider using Seller Direct shipping (available for VIP+ tiers) or running promotions on slow-moving items.</p>
          `,
        });
      }
    }

    // Notify admin of liquidation summary
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && results.liquidated > 0) {
      await sendEmail({
        to: adminEmail,
        subject: `📊 Daily Inventory Cleanup: ${results.liquidated} liquidated, ${results.warnings} warnings`,
        html: `
          <h2>Daily Inventory Cleanup Report</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px;">Products liquidated:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${results.liquidated}</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Warning notices sent:</td>
              <td style="padding: 8px; text-align: right;">${results.warnings}</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Sellers notified:</td>
              <td style="padding: 8px; text-align: right;">${results.sellersNotified}</td>
            </tr>
          </table>

          <p style="margin-top: 24px;">
            <a href="${process.env.NEXTAUTH_URL}/admin/boutique" 
               style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
              View Liquidated Products
            </a>
          </p>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory cleanup completed',
      results,
    });

  } catch (error) {
    console.error('Inventory cleanup cron error:', error);
    return NextResponse.json(
      { success: false, message: 'Inventory cleanup failed' },
      { status: 500 }
    );
  }
}
