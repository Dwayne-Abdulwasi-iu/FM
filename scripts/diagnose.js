const { PrismaClient } = require('@prisma/client');

async function diagnose() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n=== DIAGNOSIS ===\n');
    
    // Check all shipments
    const shipments = await prisma.sellerToAdminShipment.findMany({
      select: { 
        id: true, 
        status: true, 
        hasDiscrepancy: true,
        productIds: true 
      },
      take: 5
    });
    
    console.log('Shipments found:', shipments.length);
    shipments.forEach((s, i) => {
      console.log(`  ${i+1}. ID: ${s.id}`);
      console.log(`     Status: ${s.status}, Discrepancy: ${s.hasDiscrepancy}`);
      console.log(`     Products: ${JSON.stringify(s.productIds)}`);
    });
    
    // Check all products with different statuses
    console.log('\n--- Products by Status ---');
    const allProducts = await prisma.boutiqueProduct.groupBy({
      by: ['status'],
      _count: true
    });
    
    allProducts.forEach(s => {
      console.log(`  ${s.status}: ${s._count}`);
    });
    
    // Look for products from recent shipments
    if (shipments.length > 0) {
      console.log('\n--- Products from Recent Shipments ---');
      for (const shipment of shipments) {
        if (shipment.productIds && shipment.productIds.length > 0) {
          const products = await prisma.boutiqueProduct.findMany({
            where: { id: { in: shipment.productIds } },
            select: { id: true, title: true, status: true }
          });
          
          console.log(`\n  Shipment ${shipment.id.substring(0, 12)}...`);
          products.forEach(p => {
            console.log(`    - ${p.title}`);
            console.log(`      Status: ${p.status}`);
            console.log(`      ID: ${p.id}`);
          });
        }
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
