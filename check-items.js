const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const items = await prisma.boutiqueOrderItem.findMany({
      where: { orderId: 'cmkqokauy0001b6b6sxlvtpfs' },
    });
    console.log('[ITEMS COUNT]', items.length);
  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
