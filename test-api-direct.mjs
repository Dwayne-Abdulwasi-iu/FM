#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPI() {
  try {
    console.log('🔍 Testing warehouse-expiration API directly...\n');

    // Simulate what would happen when the API is called
    // We'll use the same prisma query that the API uses
    
    const seller = await prisma.user.findFirst({
      where: { email: 'lytleewayne@gmail.com' },
      select: { id: true }
    });

    if (!seller) {
      console.error('❌ Seller not found');
      process.exit(1);
    }

    console.log(`Seller ID: ${seller.id}\n`);

    // Query exactly as the API does
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId: seller.id,
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        basePrice: true,
        thumbnailUrl: true,
        receivedByAdminAt: true,
        currentStock: true,
        status: true,
      },
      orderBy: { receivedByAdminAt: 'desc' },
    });

    console.log(`✅ API Query found ${products.length} products\n`);
    
    if (products.length === 0) {
      console.log('❌ NO PRODUCTS! Checking what\'s wrong...');
      
      // Debug: Check all ADMIN_STOCK products
      const adminStockCount = await prisma.boutiqueProduct.count({
        where: { sellerId: seller.id, fulfillmentMethod: 'ADMIN_STOCK' }
      });
      console.log(`\nADMIN_STOCK products total: ${adminStockCount}`);

      // Debug: Check those with receivedByAdminAt
      const withReceivedCount = await prisma.boutiqueProduct.count({
        where: { sellerId: seller.id, receivedByAdminAt: { not: null } }
      });
      console.log(`Products with receivedByAdminAt: ${withReceivedCount}`);

      // Debug: Check BOTH conditions
      const bothConditions = await prisma.boutiqueProduct.count({
        where: {
          sellerId: seller.id,
          fulfillmentMethod: 'ADMIN_STOCK',
          receivedByAdminAt: { not: null }
        }
      });
      console.log(`Products matching BOTH conditions: ${bothConditions}`);
    } else {
      console.log('Found products:');
      products.forEach(p => {
        console.log(`  - ${p.title}`);
        console.log(`    Received: ${p.receivedByAdminAt}`);
      });
    }

    // Test the response format
    console.log('\n📤 API Response format:');
    const response = {
      success: true,
      products: products.slice(0, 1), // Show first product
      count: products.length
    };
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
