#!/usr/bin/env node
/**
 * Backfill submitted prices for existing boutique products
 * Sets submittedPrice = basePrice and submittedCurrency = 'NGN' for products without these fields
 * 
 * Usage: node scripts/backfill-boutique-submitted-prices.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting boutique product submitted prices backfill...\n');

  try {
    // Find all products missing submitted prices
    const productsToUpdate = await prisma.boutiqueProduct.findMany({
      where: {
        OR: [
          { submittedPrice: null },
          { submittedCurrency: null },
        ],
      },
      select: {
        id: true,
        title: true,
        basePrice: true,
        salePrice: true,
        submittedPrice: true,
        submittedCurrency: true,
      },
    });

    console.log(`📊 Found ${productsToUpdate.length} products to update\n`);

    if (productsToUpdate.length === 0) {
      console.log('✅ All products already have submitted prices');
      return;
    }

    // Batch update in chunks of 100
    const chunkSize = 100;
    let updated = 0;

    for (let i = 0; i < productsToUpdate.length; i += chunkSize) {
      const chunk = productsToUpdate.slice(i, i + chunkSize);
      
      const updatePromises = chunk.map(product =>
        prisma.boutiqueProduct.update({
          where: { id: product.id },
          data: {
            submittedPrice: product.submittedPrice || product.basePrice,
            submittedCurrency: product.submittedCurrency || 'NGN',
            submittedSalePrice: product.salePrice,
          },
        })
      );

      await Promise.all(updatePromises);
      updated += chunk.length;

      console.log(`✅ Updated ${updated}/${productsToUpdate.length} products`);
    }

    console.log(`\n✨ Successfully backfilled submitted prices for ${updated} products`);
    console.log('📝 All boutique products now have audit trail pricing information');
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
