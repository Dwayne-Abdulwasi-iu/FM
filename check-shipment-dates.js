import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const shipment = await prisma.sellerToAdminShipment.findUnique({
      where: { id: 'cmkprwf8a0014rs6asmt1mkjj' },
      select: {
        id: true,
        shippedAt: true,
        status: true,
        itemsExpected: true,
        receiptVerifiedAt: true
      }
    });
    console.log('Shipment:', JSON.stringify(shipment, null, 2));
    
    if (shipment?.shippedAt) {
      const eta = new Date(new Date(shipment.shippedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
      console.log('\nETA Calculation:');
      console.log('Shipped:', shipment.shippedAt);
      console.log('Expected Arrival (7 days):', eta.toISOString());
    }
  } finally {
    await prisma.$disconnect();
  }
})();
