const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: 'cmkqokauy0001b6b6sxlvtpfs' },
      select: { 
        id: true, 
        orderNumber: true, 
        status: true,
        buyerId: true,
        sellerId: true,
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } }
      }
    });
    
    console.log('[ORDER DATA]', JSON.stringify(order, null, 2));
  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
