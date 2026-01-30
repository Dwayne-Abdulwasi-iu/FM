import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const shipments = await prisma.sellerToAdminShipment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent shipments:');
  shipments.forEach(s => {
    console.log('\n---');
    console.log('ID:', s.id);
    console.log('Carrier:', s.carrier);
    console.log('Tracking:', s.trackingNumber);
    console.log('Warehouse Address:', JSON.stringify(s.warehouseAddress, null, 2));
  });
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await prisma.$disconnect();
}
