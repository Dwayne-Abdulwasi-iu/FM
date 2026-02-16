#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function createSessionTestProduct130() {
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

    console.log(`✅ Using session user: ${user.email}`);

    // Find any category
    const category = await prisma.boutiqueCategory.findFirst({ select: { id: true } });
    if (!category) {
      console.error('❌ No category found. Please create a category first.');
      process.exit(1);
    }

    // Set receivedByAdminAt to 130 days ago
    const receivedDate = subDays(new Date(), 130);

    const product = await prisma.boutiqueProduct.create({
      data: {
        title: '🧪 SESSION TEST EXPIRATION - Day 130',
        description: 'Session-based test product for warehouse expiration workflow (130 days)',
        slug: `session-expiration-130-${Date.now()}`,
        sellerId: user.id,
        categoryId: category.id,
        basePrice: 5000,
        status: 'LIVE',
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: receivedDate,
        currentStock: 50,
        originalStock: 50,
      },
      select: {
        id: true,
        title: true,
        status: true,
        receivedByAdminAt: true,
        fulfillmentMethod: true,
      }
    });

    console.log('\n✅ Session test product (130 days) created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Product ID: ${product.id}`);
    console.log(`Title: ${product.title}`);
    console.log(`Status: ${product.status}`);
    console.log(`Fulfillment: ${product.fulfillmentMethod}`);
    console.log(`Received by Admin: ${product.receivedByAdminAt?.toLocaleDateString()}`);
    console.log(`Days in Warehouse: 130`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📍 Next steps:');
    console.log(`1. Go to http://localhost:3000/seller/boutique/warehouse-expiration`);
    console.log(`2. The product "${product.title}" should appear in the list for your session user`);
    console.log(`3. Check the "Cycle Info" for "130/180"`);
    console.log(`4. Verify the "Repost" button is available`);

  } catch (error) {
    console.error('❌ Error creating session test product (130 days):', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSessionTestProduct130();
