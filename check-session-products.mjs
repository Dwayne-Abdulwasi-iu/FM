#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSession() {
  try {
    console.log('🔍 Checking if products match session requirements...\n');

    // Get the test user
    const user = await prisma.user.findFirst({
      where: { email: 'lytleewayne@gmail.com' },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }

    console.log(`👤 User: ${user.email}`);
    console.log(`   ID: ${user.id}\n`);

    // Simulate what the API does
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId: user.id,
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

    console.log(`📦 Products found: ${products.length}\n`);
    
    if (products.length === 0) {
      console.log('❌ NO PRODUCTS FOUND!');
      console.log('\nChecking all products for this user:');
      
      const allProducts = await prisma.boutiqueProduct.findMany({
        where: { sellerId: user.id },
        select: {
          id: true,
          title: true,
          fulfillmentMethod: true,
          receivedByAdminAt: true,
        }
      });
      
      console.log(`Total products: ${allProducts.length}`);
      allProducts.forEach(p => {
        console.log(`  - ${p.title} [${p.fulfillmentMethod}] receivedAt: ${p.receivedByAdminAt}`);
      });
    } else {
      console.log('✅ PRODUCTS FOUND:\n');
      products.forEach((p, i) => {
        console.log(`${i + 1}. ${p.title}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   Price: ${p.basePrice}`);
        console.log(`   Stock: ${p.currentStock}`);
        console.log(`   Received: ${p.receivedByAdminAt?.toLocaleDateString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSession();
