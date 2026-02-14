#!/usr/bin/env node

/**
 * Backfill originalQuantity for existing boutique products that don't have it
 * This script sets originalQuantity to the sum of current variant quantities
 * for products that are LIVE or sold out
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillOriginalQuantity() {
  try {
    console.log('Starting originalQuantity backfill...');

    // Find products without originalQuantity
    const productsWithoutOriginal = await prisma.boutiqueProduct.findMany({
      where: {
        originalQuantity: null,
      },
      include: {
        variants: {
          select: { quantity: true },
        },
      },
    });

    console.log(`Found ${productsWithoutOriginal.length} products without originalQuantity`);

    let updated = 0;
    let skipped = 0;

    for (const product of productsWithoutOriginal) {
      // Calculate total stock from current variants
      const totalStock = product.variants.reduce((sum, v) => sum + v.quantity, 0);

      // Only backfill if we have stock data (avoid setting to 0 if variants deleted)
      if (totalStock > 0 || product.variants.length === 0) {
        await prisma.boutiqueProduct.update({
          where: { id: product.id },
          data: {
            originalQuantity: totalStock || 0,
          },
        });
        updated++;
        console.log(`✓ Updated ${product.title} (${product.id}): originalQuantity = ${totalStock}`);
      } else {
        skipped++;
        console.log(`⊘ Skipped ${product.title} (${product.id}): totalStock = 0 (variants may have been deleted)`);
      }
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
  } catch (error) {
    console.error('❌ Error backfilling originalQuantity:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backfillOriginalQuantity();
