#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { subDays, differenceInDays } from 'date-fns';

const prisma = new PrismaClient();

// Copy warehouse functions since we can't import from lib
function getDaysInWarehouse(receivedAt) {
  if (!receivedAt) return 0;
  return differenceInDays(new Date(), new Date(receivedAt));
}

function isInMonth5(daysInWarehouse) {
  const daysInCurrentCycle = daysInWarehouse % 180;
  return daysInCurrentCycle >= 120 && daysInCurrentCycle < 180;
}

async function debugWarehouseExpiration() {
  try {
    console.log('🔍 Debugging warehouse expiration setup...\n');

    // Get the seller
    const seller = await prisma.user.findFirst({
      where: { email: 'lytleewayne@gmail.com' },
      select: { id: true, email: true }
    });

    console.log(`👤 Seller: ${seller?.email} (ID: ${seller?.id})\n`);

    // Get ALL products for this seller
    const allProducts = await prisma.boutiqueProduct.findMany({
      where: { sellerId: seller?.id },
      select: {
        id: true,
        title: true,
        status: true,
        fulfillmentMethod: true,
        receivedByAdminAt: true,
        currentStock: true,
      }
    });

    console.log(`📦 Total products for seller: ${allProducts.length}`);
    allProducts.forEach(p => {
      console.log(`  - ${p.title}`);
      console.log(`    ID: ${p.id}`);
      console.log(`    Status: ${p.status}`);
      console.log(`    Fulfillment: ${p.fulfillmentMethod}`);
      console.log(`    Received by Admin: ${p.receivedByAdminAt}`);
      console.log('');
    });

    // Get ADMIN_STOCK products that have receivedByAdminAt
    console.log('\n🔎 Filtering for ADMIN_STOCK products with receivedByAdminAt:\n');
    const adminStockProducts = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId: seller?.id,
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: { not: null }
      },
      select: {
        id: true,
        title: true,
        status: true,
        receivedByAdminAt: true,
        currentStock: true,
      }
    });

    if (adminStockProducts.length === 0) {
      console.log('❌ No ADMIN_STOCK products found with receivedByAdminAt!');
    } else {
      console.log(`✅ Found ${adminStockProducts.length} ADMIN_STOCK products:\n`);
      adminStockProducts.forEach(p => {
        const daysInWarehouse = getDaysInWarehouse(p.receivedByAdminAt);
        const inMonth5 = isInMonth5(daysInWarehouse);
        console.log(`📌 ${p.title}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Days in Warehouse: ${daysInWarehouse}`);
        console.log(`   In Month 5: ${inMonth5 ? '✅ YES' : '❌ NO'}`);
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

debugWarehouseExpiration();
