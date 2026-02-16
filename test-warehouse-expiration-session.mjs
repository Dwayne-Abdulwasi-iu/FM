#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function createSessionTestProduct() {
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

    // Set receivedByAdminAt to 125 days ago (Month 5)
    const receivedDate = subDays(new Date(), 125);

    const product = await prisma.boutiqueProduct.create({
      data: {
        title: '🧪 SESSION TEST EXPIRATION - Day 125',
        description: 'Session-based test product for warehouse expiration workflow',
        slug: `session-expiration-${Date.now()}`,
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

    console.log('\n✅ Session test product created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Product ID: ${product.id}`);
    console.log(`Title: ${product.title}`);
    console.log(`Status: ${product.status}`);
    console.log(`Fulfillment: ${product.fulfillmentMethod}`);
    console.log(`Received by Admin: ${product.receivedByAdminAt?.toLocaleDateString()}`);
    console.log(`Days in Warehouse: 125 (IN MONTH 5 - Days 120-179)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📍 Next steps:');
    console.log(`1. Go to http://localhost:3000/seller/boutique/warehouse-expiration`);
    console.log(`2. The product "${product.title}" should appear in the list for your session user`);
    console.log(`3. Check the "Cycle Info" for "125/180"`);
    console.log(`4. Verify the "Repost" button is available`);

  } catch (error) {
    console.error('❌ Error creating session test product:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSessionTestProduct();
