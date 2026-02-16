#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function createAdminTestProduct130BothFields() {
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

    console.log(`✅ Using admin user: ${admin.email}`);

    // Find any category
    const category = await prisma.boutiqueCategory.findFirst({ select: { id: true } });
    if (!category) {
      console.error('❌ No category found. Please create a category first.');
      process.exit(1);
    }

    // Set both receivedByAdminAt and warehouseReceivedAt to 130 days ago
    const receivedDate = subDays(new Date(), 130);

    const product = await prisma.boutiqueProduct.create({
      data: {
        title: '🧪 ADMIN TEST INVENTORY - Day 130 (BOTH FIELDS)',
        description: 'Admin test product for warehouse inventory workflow (130 days, both fields set)',
        slug: `admin-inventory-130-bothfields-${Date.now()}`,
        sellerId: admin.id,
        categoryId: category.id,
        basePrice: 10000,
        status: 'LIVE',
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: receivedDate,
        warehouseReceivedAt: receivedDate,
        currentStock: 99,
        originalStock: 99,
      },
      select: {
        id: true,
        title: true,
        status: true,
        receivedByAdminAt: true,
        warehouseReceivedAt: true,
        fulfillmentMethod: true,
      }
    });

    console.log('\n✅ Admin test product (130 days, both fields) created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Product ID: ${product.id}`);
    console.log(`Title: ${product.title}`);
    console.log(`Status: ${product.status}`);
    console.log(`Fulfillment: ${product.fulfillmentMethod}`);
    console.log(`Received by Admin: ${product.receivedByAdminAt?.toLocaleDateString()}`);
    console.log(`Warehouse Received At: ${product.warehouseReceivedAt?.toLocaleDateString()}`);
    console.log(`Days in Warehouse: 130`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📍 Next steps:');
    console.log(`1. Go to http://localhost:3000/seller/boutique/warehouse-inventory`);
    console.log(`2. The product "${product.title}" should appear in the list for your admin account`);
    console.log(`3. Check the "Days In" column for "130/181"`);

  } catch (error) {
    console.error('❌ Error creating admin test product (130 days, both fields):', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminTestProduct130BothFields();
