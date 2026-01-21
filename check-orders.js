/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkOrders() {
  try {
    const orders = await p.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        items: true
      }
    });
    
    console.log('Recent Orders:');
    console.log(JSON.stringify(orders, null, 2));
    
    if (orders.length === 0) {
      console.log('\n⚠️  No orders found in database!');
      console.log('This means the Paystack webhook is not being triggered.');
      console.log('\nTo fix this for local development, you need either:');
      console.log('1. Use ngrok to expose your localhost to the internet');
      console.log('2. Deploy to a public URL and test there');
      console.log('3. Manually trigger the webhook');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
}

checkOrders();
