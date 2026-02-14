#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('crypto');

const prisma = new PrismaClient();

// Generate MongoDB ObjectId-like string
function generateId() {
  return randomBytes(12).toString('hex');
}

async function createTestOrder() {
  try {
    console.log('[CREATE-TEST-ORDER] Starting...');

    // Create or get test users
    const [buyer, seller, admin] = await Promise.all([
      prisma.user.upsert({
        where: { email: 'testbuyer@example.com' },
        update: {},
        create: {
          id: generateId(),
          email: 'testbuyer@example.com',
          name: 'Test Buyer',
          phone: '+234XXXXXXXXXX',
          emailVerified: true,
          role: 'USER',
        },
      }),
      prisma.user.upsert({
        where: { email: 'testseller@example.com' },
        update: {},
        create: {
          id: generateId(),
          email: 'testseller@example.com',
          name: 'Test Seller',
          phone: '+234YYYYYYYYYY',
          emailVerified: true,
          role: 'USER',
        },
      }),
      prisma.user.upsert({
        where: { email: 'testadmin@example.com' },
        update: {},
        create: {
          id: generateId(),
          email: 'testadmin@example.com',
          name: 'Test Admin',
          phone: '+234ZZZZZZZZZZ',
          emailVerified: true,
          role: 'ADMIN',
        },
      }),
    ]);

    console.log('[CREATE-TEST-ORDER] Users created/found:');
    console.log(`  - Buyer: ${buyer.id} (${buyer.email})`);
    console.log(`  - Seller: ${seller.id} (${seller.email})`);
    console.log(`  - Admin: ${admin.id} (${admin.email})`);

    // Get or create a category
    let category = await prisma.boutiqueCategory.findFirst();
    if (!category) {
      category = await prisma.boutiqueCategory.create({
        data: {
          id: generateId(),
          name: 'Clothing',
          slug: 'clothing',
        },
      });
      console.log(`[CREATE-TEST-ORDER] Category created: ${category.id}`);
    } else {
      console.log(`[CREATE-TEST-ORDER] Using existing category: ${category.id}`);
    }

    // Create a test product
    const product = await prisma.boutiqueProduct.create({
      data: {
        id: generateId(),
        sellerId: seller.id,
        categoryId: category.id,
        title: 'Test Product for Audit Log Testing',
        slug: `test-product-${Date.now()}`,
        description: 'This is a test product for audit log testing',
        basePrice: 5000,
        salePrice: null,
        currency: 'USD',
        status: 'LIVE',
        currentStock: 100,
        submittedPrice: 5000,
        submittedCurrency: 'USD',
      },
    });

    console.log(`[CREATE-TEST-ORDER] Product created: ${product.id}`);

    // Create a variant
    const variant = await prisma.boutiqueProductVariant.create({
      data: {
        id: generateId(),
        productId: product.id,
        size: 'M',
        color: 'Black',
        quantity: 50,
        sku: `TEST-${Date.now()}`,
      },
    });

    console.log(`[CREATE-TEST-ORDER] Variant created: ${variant.id}`);

    // Create test order
    const order = await prisma.boutiqueOrder.create({
      data: {
        id: generateId(),
        orderNumber: `TEST-${Date.now()}`,
        buyer: { connect: { id: buyer.id } },
        seller: { connect: { id: seller.id } },
        product: { connect: { id: product.id } },
        status: 'PENDING_PAYMENT',
        fulfillmentMethod: 'ADMIN_STOCK',
        subtotal: 5000,
        shippingCost: 500,
        platformFee: 556,
        discount: 0,
        total: 6056,
        currency: 'USD',
        sellerPayout: 4444,
        paymentReference: `REF-${Date.now()}`,
        paymentMethod: 'STRIPE',
        shippingAddress: {
          name: 'Test Buyer',
          phone: '+234XXXXXXXXXX',
          street: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          zipCode: '100001',
        },
        items: {
          create: [
            {
              id: generateId(),
              product: { connect: { id: product.id } },
              variant: { connect: { id: variant.id } },
              quantity: 1,
              price: 5000,
              finalPrice: 5000,
              variantSnapshot: {
                size: 'M',
                color: 'Black',
              },
            },
          ],
        },
      },
    });

    console.log('\n✅ TEST ORDER CREATED SUCCESSFULLY!\n');
    console.log(`Order ID: ${order.id}`);
    console.log(`Order Number: ${order.orderNumber}`);
    console.log(`Status: ${order.status}`);
    console.log(`Buyer Email: ${buyer.email}`);
    console.log(`Seller Email: ${seller.email}`);
    console.log(`Admin Email: ${admin.email}`);
    console.log('\n📝 Next Steps:');
    console.log(`1. Sign in as admin: ${admin.email} (password will be set)`);
    console.log(`2. Go to: /admin/boutique/orders`);
    console.log(`3. Click on order: ${order.orderNumber}`);
    console.log(`4. Open browser console (F12)`);
    console.log(`5. Update the order status and check console logs`);
    console.log(`6. Look for [ORDER-FETCH] and [ORDER-UPDATE] logs`);

    process.exit(0);
  } catch (error) {
    console.error('[ERROR]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestOrder();
