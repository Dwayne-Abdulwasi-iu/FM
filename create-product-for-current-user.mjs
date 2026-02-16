#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function createTestProductForCurrentUser() {
  try {
    // Find the currently logged-in user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@fashionmarketplace.com' },
      select: { id: true, email: true }
    });

    if (!user) {
      console.error('❌ User admin@fashionmarketplace.com not found.');
      process.exit(1);
    }

    console.log(`✅ Creating product for logged-in user: ${user.email}`);

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
        title: '🧪 CURRENT USER TEST - Day 130',
        description: 'Test product for currently logged-in admin (130 days)',
        slug: `current-user-test-130-${Date.now()}`,
        sellerId: user.id,
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

    console.log('\n✅ Test product created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Product ID: ${product.id}`);
    console.log(`Title: ${product.title}`);
    console.log(`Status: ${product.status}`);
    console.log(`Fulfillment: ${product.fulfillmentMethod}`);
    console.log(`Received by Admin: ${product.receivedByAdminAt?.toLocaleDateString()}`);
    console.log(`Warehouse Received At: ${product.warehouseReceivedAt?.toLocaleDateString()}`);
    console.log(`Days in Warehouse: 130`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📍 Refresh the warehouse-expiration page - the product should now appear!');

  } catch (error) {
    console.error('❌ Error creating test product:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestProductForCurrentUser();
