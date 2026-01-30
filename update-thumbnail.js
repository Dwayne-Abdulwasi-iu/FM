import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const updated = await prisma.boutiqueProduct.update({
      where: { id: 'cmkpimruc000qrs6a235chrax' },
      data: { 
        thumbnailUrl: 'https://res.cloudinary.com/dmjweao69/image/upload/v1769090215/fashion-boutique/products/cmkpimruc000qrs6a235chrax/vbv3vywrmjviwciynuy2.webp'
      }
    });
    console.log('Updated product thumbnailUrl:', updated.thumbnailUrl);
  } finally {
    await prisma.$disconnect();
  }
})();
