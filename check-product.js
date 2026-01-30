import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: 'cmkpimruc000qrs6a235chrax' },
      include: { 
        media: true,
        variants: true
      }
    });
    console.log(JSON.stringify(product, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})();
