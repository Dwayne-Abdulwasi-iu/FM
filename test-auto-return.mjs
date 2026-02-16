#!/usr/bin/env node
import 'dotenv/config.js'
import { PrismaClient } from '@prisma/client'
import { differenceInDays } from 'date-fns'

const prisma = new PrismaClient()

async function testAutoReturn() {
  console.log('🧪 Testing Auto-Return for 180+ Day Products\n');

  try {
    // Step 1: Get current admin user
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@fashionmarketplace.com' }
    });

    if (!admin) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log(`✅ Admin found: ${admin.email}\n`);

    // Step 2: Get a seller
    const seller = await prisma.user.findFirst({
      where: {
        role: 'USER',
        id: { not: admin.id }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!seller) {
      console.error('❌ Seller user not found');
      process.exit(1);
    }

    console.log(`✅ Seller found: ${seller.email}\n`);

    // Step 3: Get a category
    let category = await prisma.boutiqueCategory.findFirst();
    if (!category) {
      // Create a category if none exists
      category = await prisma.boutiqueCategory.create({
        data: {
          name: 'Test Category',
          slug: 'test-category'
        }
      });
    }

    // Step 4: Create a test product that's 181 days old
    const productTitle = `🧪 AUTO-RETURN TEST - Day 181 - ${new Date().toISOString().slice(0, 10)}`;
    const daysBefore = 181;
    const receivedDate = new Date();
    receivedDate.setDate(receivedDate.getDate() - daysBefore);

    console.log(`📦 Creating test product (received ${daysBefore} days ago)...`);

    const product = await prisma.boutiqueProduct.create({
      data: {
        title: productTitle,
        slug: `test-auto-return-${Date.now()}`,
        description: 'Test product for auto-return workflow',
        basePrice: 10000,
        brand: 'Test Brand',
        material: 'Cotton',
        condition: 'New',
        gender: 'Unisex',
        style: 'Casual',
        occasion: 'Everyday',
        tags: ['test', 'auto-return'],
        categoryId: category.id,
        status: 'LIVE',
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: receivedDate,
        sellerId: seller.id,
        currentStock: 5,
        thumbnailUrl: 'https://via.placeholder.com/300x400'
      },
      include: { variants: true }
    });

    console.log(`✅ Product created: ${product.title}`);
    console.log(`   ID: ${product.id}`);
    console.log(`   Received: ${product.receivedByAdminAt}`);
    console.log(`   Days in warehouse: ${daysBefore}\n`);

    // Step 5: Verify no repost requests exist
    const existingReposts = await prisma.boutiqueRepostRequest.findMany({
      where: { productId: product.id }
    });

    console.log(`📋 Existing repost requests: ${existingReposts.length}`);
    if (existingReposts.length > 0) {
      console.log('   ⚠️  Found existing reposts, product may not trigger auto-return');
    }
    console.log();

    // Step 6: Check for existing return shipments
    const existingReturns = await prisma.sellerToAdminShipment.findMany({
      where: {
        productIds: { has: product.id }
      }
    });

    console.log(`📦 Existing return shipments: ${existingReturns.length}`);
    if (existingReturns.length > 0) {
      console.log('   ⚠️  Found existing returns for this product');
      existingReturns.forEach(r => console.log(`      - ${r.id}: ${r.status}`));
    }
    console.log();

    // Step 7: Call the warehouse deductions cron API
    console.log('🔄 Running warehouse deductions cron via API...\n');
    
    const cronResponse = await fetch('http://localhost:3000/api/cron/warehouse-deductions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`
      }
    });

    if (!cronResponse.ok) {
      console.error(`❌ Cron API failed: ${cronResponse.status}`);
      const errorData = await cronResponse.json();
      console.error(errorData);
    } else {
      const deductionResult = await cronResponse.json();
      console.log('📊 Deduction Results:');
      console.log(`   Processed: ${deductionResult.result?.processed || 0}`);
      console.log(`   Failed: ${deductionResult.result?.failed || 0}`);
      console.log(`   Month 5 notifications: ${deductionResult.result?.month5Sent || 0}`);
      console.log(`   Final warnings: ${deductionResult.result?.finalWarningsSent || 0}`);
      if (deductionResult.result?.errors?.length > 0) {
        console.log('   Errors:');
        deductionResult.result.errors.forEach(e => console.log(`      - ${e}`));
      }
      console.log();
    }

    // Step 8: Check if return shipment was created
    const returnShipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        productIds: { has: product.id }
      },
      include: { seller: { select: { email: true, name: true } } }
    });

    if (returnShipment) {
      console.log('✅ AUTO-RETURN SHIPMENT CREATED!');
      console.log(`   Shipment ID: ${returnShipment.id}`);
      console.log(`   Status: ${returnShipment.status}`);
      console.log(`   Items Expected: ${returnShipment.itemsExpected}`);
      console.log(`   Seller Notes: ${returnShipment.sellerNotes}`);
      console.log(`   Admin Notes: ${returnShipment.adminNotes}`);
      console.log(`   Dispute Notes: ${returnShipment.disputeNotes}`);
      console.log();

      // Step 9: Verify product status
      const updatedProduct = await prisma.boutiqueProduct.findUnique({
        where: { id: product.id }
      });

      console.log('📦 Product Status:');
      console.log(`   Status: ${updatedProduct.status}`);
      console.log(`   Return Enabled: ${updatedProduct.fullReturnEnabled}`);
      console.log(`   Return Requested At: ${updatedProduct.returnRequestedAt}`);
      console.log();

      console.log('🎉 AUTO-RETURN TEST SUCCESSFUL!');
      console.log('\nNext Steps:');
      console.log('1. Go to http://localhost:3000/admin/boutique/warehouse-returns');
      console.log('2. You should see a return with "🏭 Warehouse Expiration" badge');
      console.log('3. Admin can approve, reject, or ship the return');
    } else {
      console.log('❌ AUTO-RETURN SHIPMENT NOT CREATED');
      console.log('   The cron may not have processed this product');
      console.log('   Check if product status is LIVE and fulfillmentMethod is ADMIN_STOCK');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoReturn();
