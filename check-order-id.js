const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find the order by number
    const order = await prisma.boutiqueOrder.findFirst({
      where: { orderNumber: 'BTQ-MKQQKAUR-5XUL' },
      select: { id: true, orderNumber: true, status: true, buyerId: true, sellerId: true }
    });
    
    if (order) {
      console.log('[FOUND ORDER]', JSON.stringify(order, null, 2));
    } else {
      console.log('[ORDER NOT FOUND] BTQ-MKQQKAUR-5XUL');
      // Try to find any orders
      const allOrders = await prisma.boutiqueOrder.findMany({
        select: { id: true, orderNumber: true, status: true },
        take: 5
      });
      console.log('[ALL ORDERS]', JSON.stringify(allOrders, null, 2));
    }
  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
