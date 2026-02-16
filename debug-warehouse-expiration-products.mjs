#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugWarehouseExpirationProducts() {
  try {
    // Find the most recently active user (simulate current session)
    const user = await prisma.user.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, email: true }
    });

    if (!user) {
      console.error('❌ No user found. Please sign in first.');
      process.exit(1);
    }

    console.log(`\n🔍 Using session user: ${user.email} (${user.id})`);

    // Find all ADMIN_STOCK products for this user with receivedByAdminAt set
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId: user.id,
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: { not: null },
      },
      orderBy: { receivedByAdminAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        fulfillmentMethod: true,
        receivedByAdminAt: true,
        currentStock: true,
        originalStock: true,
      }
    });

    if (products.length === 0) {
      console.log('\n❌ No ADMIN_STOCK products with receivedByAdminAt found for this user.');
    } else {
      console.log(`\n✅ Found ${products.length} ADMIN_STOCK products with receivedByAdminAt:`);
      for (const p of products) {
        const days = Math.floor((Date.now() - new Date(p.receivedByAdminAt).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`- ${p.title} | Status: ${p.status} | Days: ${days} | ID: ${p.id}`);
      }
    }
  } catch (error) {
    console.error('❌ Error debugging warehouse expiration products:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

debugWarehouseExpirationProducts();
