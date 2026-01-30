/**
 * Fix products that were confirmed via shipment but didn't get their status updated
 * 
 * This script finds all shipments with status 'RECEIVED' and updates their
 * associated products to 'RECEIVED_BY_ADMIN' if they're still in 'SHIPPED_TO_ADMIN'
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixReceivedProducts() {
  console.log('🔍 Finding received shipments with products still in SHIPPED_TO_ADMIN...\n');

  try {
    // Find all received shipments
    const receivedShipments = await prisma.sellerToAdminShipment.findMany({
      where: {
        status: 'RECEIVED',
      },
      select: {
        id: true,
        productIds: true,
        hasDiscrepancy: true,
        receiptVerifiedAt: true,
      },
    });

    console.log(`Found ${receivedShipments.length} received shipments\n`);

    let totalFixed = 0;

    for (const shipment of receivedShipments) {
      if (!shipment.productIds || shipment.productIds.length === 0) {
        console.log(`  Shipment ${shipment.id}: No product IDs`);
        continue;
      }

      // Find products that are still in SHIPPED_TO_ADMIN status
      const productsToFix = await prisma.boutiqueProduct.findMany({
        where: {
          id: { in: shipment.productIds },
          status: 'SHIPPED_TO_ADMIN',
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
      });

      if (productsToFix.length === 0) {
        console.log(`  Shipment ${shipment.id}: All products already updated`);
        continue;
      }

      console.log(`  Shipment ${shipment.id} (discrepancy: ${shipment.hasDiscrepancy}):`);
      console.log(`    Found ${productsToFix.length} products to fix:`);

      for (const product of productsToFix) {
        console.log(`      - ${product.title} (${product.id})`);
      }

      // Update the products
      const result = await prisma.boutiqueProduct.updateMany({
        where: {
          id: { in: productsToFix.map(p => p.id) },
        },
        data: {
          status: 'RECEIVED_BY_ADMIN',
        },
      });

      console.log(`    ✅ Updated ${result.count} products to RECEIVED_BY_ADMIN\n`);
      totalFixed += result.count;
    }

    console.log(`\n✨ Done! Fixed ${totalFixed} products total.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixReceivedProducts();
