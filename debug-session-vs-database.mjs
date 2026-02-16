#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCheckSessionVsDatabase() {
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

    console.log(`\n🔍 Most recently active admin:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   ID: ${admin.id}`);

    // Check what products exist for this admin
    const adminProducts = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId: admin.id,
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: { not: null }
      },
      select: {
        id: true,
        title: true,
        status: true,
        receivedByAdminAt: true
      }
    });

    console.log(`\n📦 ADMIN_STOCK products found for this admin: ${adminProducts.length}`);
    for (const p of adminProducts) {
      console.log(`   - ${p.title} (Status: ${p.status})`);
    }

    // Check the exact structure of the user object
    const fullAdmin = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { id: true, email: true, role: true, name: true }
    });

    console.log(`\n👤 Full admin user object structure:`);
    console.log(JSON.stringify(fullAdmin, null, 2));

    // This is what the session API should be using
    console.log(`\n✅ Session should contain user.id: "${admin.id}"`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

debugCheckSessionVsDatabase();
