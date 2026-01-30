const { PrismaClient } = require('@prisma/client');

async function fixDiscrepancyProducts() {
  const prisma = new PrismaClient();
  
  try {
    // Find shipments that are RECEIVED with discrepancies
    const shipments = await prisma.sellerToAdminShipment.findMany({
      where: {
        status: 'RECEIVED',
        hasDiscrepancy: true,
      },
      select: { id: true, productIds: true }
    });
    
    console.log('Found', shipments.length, 'received shipments with discrepancies');
    
    let totalUpdated = 0;
    for (const shipment of shipments) {
      if (shipment.productIds && shipment.productIds.length > 0) {
        const result = await prisma.boutiqueProduct.updateMany({
          where: { id: { in: shipment.productIds } },
          data: { status: 'VERIFICATION_PASSED' }
        });
        
        console.log('✅ Updated', result.count, 'products to VERIFICATION_PASSED for shipment', shipment.id);
        totalUpdated += result.count;
      }
    }
    
    console.log('\n✨ Fixed', totalUpdated, 'products total!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixDiscrepancyProducts();
