const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const items = await prisma.boutiqueOrderItem.findMany({
      where: { orderId: 'cmkqokauy0001b6b6sxlvtpfs' },
      select: { 
        id: true,
        productId: true,
        product: { select: { id: true, name: true, sellerId: true } }
      }
    });
    
    console.log('[ORDER ITEMS]', JSON.stringify(items, null, 2));
  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
