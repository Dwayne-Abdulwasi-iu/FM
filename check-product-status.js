const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Update the product status to OUT_OF_STOCK
    const updated = await prisma.boutiqueProduct.update({
      where: { id: 'cmkpimruc000qrs6a235chrax' },
      data: { 
        status: 'OUT_OF_STOCK',
        outOfStockAt: new Date(),
        currentStock: 0  // Set stock to 0 since it's out of stock
      },
      select: { 
        id: true, 
        title: true,
        status: true, 
        currentStock: true,
        outOfStockAt: true
      }
    });
    console.log('Updated Product:', JSON.stringify(updated, null, 2));
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
