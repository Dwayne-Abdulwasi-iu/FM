/**
 * Manual Payment Verification Script
 * Use this to verify Paystack payments when testing locally
 * (since webhooks don't work on localhost)
 * 
 * Usage: node verify-payment.js <paystack_reference>
 * Example: node verify-payment.js fashion_1767301825588_cmhg4iddx0000hej8nvdfzx4g
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function verifyAndCreateOrder(reference) {
  if (!reference) {
    console.error('❌ Please provide a Paystack reference');
    console.log('Usage: node verify-payment.js <reference>');
    process.exit(1);
  }

  console.log(`\n🔍 Verifying payment: ${reference}\n`);

  try {
    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { data } = response.data;
    
    if (data.status !== 'success') {
      console.error('❌ Payment not successful:', data.status);
      process.exit(1);
    }

    console.log('✅ Payment verified!');
    console.log(`   Amount: ₦${data.amount / 100}`);
    console.log(`   Reference: ${data.reference}`);
    console.log(`   Customer: ${data.customer.email}`);

    // Extract metadata
    const metadata = data.metadata || {};
    const userId = metadata.userId;
    const orderItems = typeof metadata.orderItems === 'string' 
      ? JSON.parse(metadata.orderItems) 
      : metadata.orderItems || [];
    const originalAmountUSD = parseFloat(metadata.originalAmountUSD || '0');
    const platformFee = parseFloat(metadata.platformFee || '0');

    if (!userId || !orderItems.length) {
      console.error('❌ Missing metadata:', { userId, orderItems });
      process.exit(1);
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findFirst({
      where: { orderNumber: reference }
    });

    if (existingOrder) {
      console.log('\n⚠️  Order already exists in database!');
      console.log(`   Order ID: ${existingOrder.id}`);
      process.exit(0);
    }

    // Create the order
    console.log('\n📦 Creating order...');
    
    const order = await prisma.order.create({
      data: {
        orderNumber: reference,
        customerId: userId,
        totalAmount: originalAmountUSD,
        platformFee: platformFee,
        status: 'COMPLETED',
        stripePaymentIntentId: reference,
        items: {
          create: orderItems.map(item => ({
            designId: item.designId,
            quantity: item.quantity,
            price: item.price,
            purchaseType: item.purchaseType || 'REGULAR'
          }))
        }
      },
      include: { items: true }
    });

    console.log(`✅ Order created: ${order.id}`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   Items: ${order.items.length}`);

    // Create seller earnings
    for (const item of order.items) {
      const design = await prisma.design.findUnique({
        where: { id: item.designId }
      });

      if (design) {
        const saleAmount = item.price * item.quantity;
        const commission = saleAmount * 0.10;
        const sellerAmount = saleAmount - commission;

        await prisma.sellerEarning.create({
          data: {
            saleAmount,
            platformCommission: commission,
            sellerAmount,
            quantity: item.quantity,
            sellerId: design.designerId,
            orderId: order.id,
            designId: item.designId
          }
        });

        // Update design stats
        await prisma.design.update({
          where: { id: item.designId },
          data: {
            totalSales: { increment: item.quantity },
            totalRevenue: { increment: saleAmount }
          }
        });

        // Create purchase record
        await prisma.purchase.create({
          data: {
            userId: userId,
            designId: item.designId,
            orderId: order.id,
            purchaseType: item.purchaseType || 'REGULAR',
            purchasePrice: item.price,
            accessGranted: true
          }
        });

        console.log(`   ✅ Created earning for seller: ${design.designerId}`);
        console.log(`      Sale: $${saleAmount.toFixed(2)}, Commission: $${commission.toFixed(2)}, Seller gets: $${sellerAmount.toFixed(2)}`);
      }
    }

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { userId }
    });
    console.log('   ✅ Cart cleared');

    console.log('\n🎉 Payment processing complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get reference from command line
const reference = process.argv[2];
verifyAndCreateOrder(reference);
