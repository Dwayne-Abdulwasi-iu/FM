const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check both products
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        OR: [
          { title: { contains: 'wlegant ankara', mode: 'insensitive' } },
          { title: { contains: 'wgsdgssdgsfg', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        status: true,
        currentStock: true
      }
    });
    
    console.log('Products:');
    products.forEach(p => {
      console.log(`  - ${p.title}: status=${p.status}, stock=${p.currentStock}`);
    });
    
    // Check returns for LIVE products only
    const liveProducts = products.filter(p => p.status !== 'OUT_OF_STOCK');
    console.log(`\nLIVE products (eligible for returns): ${liveProducts.map(p => p.title).join(', ')}`);
    
    if (liveProducts.length > 0) {
      const returns = await prisma.boutiqueReturn.findMany({
        where: {
          orderItem: {
            productId: { in: liveProducts.map(p => p.id) }
          },
          status: { in: ['PENDING', 'APPROVED', 'ITEM_SHIPPED', 'ITEM_RECEIVED'] }
        },
        select: {
          id: true,
          status: true,
          orderItem: {
            select: { 
              productId: true,
              product: { select: { title: true } }
            }
          }
        }
      });
      console.log(`\nReturns for LIVE products:`, JSON.stringify(returns, null, 2));
    }
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
