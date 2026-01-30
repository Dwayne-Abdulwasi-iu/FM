const { PrismaClient } = require('@prisma/client');

async function fullDiagnose() {
  const prisma = new PrismaClient();
  
  try {
    // Get the two received shipments with discrepancies
    const shipments = await prisma.sellerToAdminShipment.findMany({
      where: {
        status: 'RECEIVED',
        hasDiscrepancy: true
      }
    });
    
    console.log('\n=== PRODUCTS IN RECEIVED SHIPMENTS WITH DISCREPANCIES ===\n');
    
    for (const shipment of shipments) {
      if (shipment.productIds && shipment.productIds.length > 0) {
        const products = await prisma.boutiqueProduct.findMany({
          where: { id: { in: shipment.productIds } }
        });
        
        console.log(`Shipment: ${shipment.id}`);
        products.forEach(p => {
          console.log(`  Product: ${p.title}`);
          console.log(`  ID: ${p.id}`);
          console.log(`  Status: ${p.status}`);
          console.log(`  Created: ${p.createdAt}`);
          console.log('  ---');
        });
        console.log('');
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fullDiagnose();
