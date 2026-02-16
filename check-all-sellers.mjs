#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllSellers() {
  try {
    console.log('🔍 Checking all users and their products...\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        _count: {
          select: { boutiqueProducts: true }
        }
      }
    });

    console.log(`Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log(`👤 ${user.email} (ID: ${user.id})`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Boutique Products: ${user._count.boutiqueProducts}`);
      
      if (user._count.boutiqueProducts > 0) {
        const products = await prisma.boutiqueProduct.findMany({
          where: { sellerId: user.id },
          select: { id: true, title: true, fulfillmentMethod: true, receivedByAdminAt: true }
        });
        
        products.forEach(p => {
          console.log(`   - ${p.title} [${p.fulfillmentMethod}] received: ${p.receivedByAdminAt ? '✅' : '❌'}`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllSellers();
