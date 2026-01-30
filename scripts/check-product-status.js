const { PrismaClient } = require('@prisma/client');

async function check() {
  const prisma = new PrismaClient();
  
  try {
    const products = await prisma.boutiqueProduct.findMany({
      where: { status: 'RECEIVED_BY_ADMIN' },
      select: { id: true, title: true, status: true }
    });
    
    console.log('Products in RECEIVED_BY_ADMIN:', products.length);
    products.forEach(p => console.log(' -', p.title, '|', p.id));
    
    // Also check all statuses
    const allStatuses = await prisma.boutiqueProduct.groupBy({
      by: ['status'],
      _count: true
    });
    
    console.log('\nAll statuses:');
    allStatuses.forEach(s => console.log(' ', s.status, ':', s._count));
    
  } finally {
    await prisma.$disconnect();
  }
}

check();
