#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugListAllAdminStockProducts() {
  try {
    // List ALL ADMIN_STOCK products in the database, regardless of user
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: { not: null },
      },
      orderBy: { receivedByAdminAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        sellerId: true,
        receivedByAdminAt: true,
        currentStock: true,
        originalStock: true,
      }
    });

    if (products.length === 0) {
      console.log('\n❌ No ADMIN_STOCK products with receivedByAdminAt found in the database.');
    } else {
      console.log(`\n✅ Found ${products.length} ADMIN_STOCK products with receivedByAdminAt:`);
      for (const p of products) {
        const days = Math.floor((Date.now() - new Date(p.receivedByAdminAt).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`- ${p.title} | Status: ${p.status} | Days: ${days} | Seller: ${p.sellerId} | ID: ${p.id}`);
      }
    }
  } catch (error) {
    console.error('❌ Error listing all ADMIN_STOCK products:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

debugListAllAdminStockProducts();
