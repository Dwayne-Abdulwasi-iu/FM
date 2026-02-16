#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugListAdminStockProductsWithAllFields() {
  try {
    // Find the most recently active admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, email: true }
    });

    if (!admin) {
      console.error('❌ No admin user found.');
      process.exit(1);
    }

    console.log(`\n🔍 Using admin user: ${admin.email} (${admin.id})`);

    // List all ADMIN_STOCK products for this admin with receivedByAdminAt and warehouseReceivedAt set
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId: admin.id,
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: { not: null },
        warehouseReceivedAt: { not: null },
      },
      orderBy: { warehouseReceivedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        receivedByAdminAt: true,
        warehouseReceivedAt: true,
        currentStock: true,
        originalStock: true,
      }
    });

    if (products.length === 0) {
      console.log('\n❌ No ADMIN_STOCK products with both receivedByAdminAt and warehouseReceivedAt found for this admin.');
    } else {
      console.log(`\n✅ Found ${products.length} ADMIN_STOCK products with both fields for this admin:`);
      for (const p of products) {
        const days = Math.floor((Date.now() - new Date(p.warehouseReceivedAt).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`- ${p.title} | Status: ${p.status} | Days: ${days} | ID: ${p.id}`);
      }
    }
  } catch (error) {
    console.error('❌ Error debugging admin stock products with all fields:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

debugListAdminStockProductsWithAllFields();
