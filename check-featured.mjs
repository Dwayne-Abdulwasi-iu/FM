import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  const featured = await prisma.featuredBoutiqueProduct.findMany({
    take: 1,
    include: {
      product: {
        select: { id: true, slug: true, title: true }
      }
    }
  })
  console.log('Featured boutique products:', JSON.stringify(featured, null, 2))
  
  const liveProducts = await prisma.boutiqueProduct.findMany({
    where: { status: 'LIVE' },
    select: { id: true, slug: true, title: true },
    take: 1
  })
  console.log('Live boutique products:', JSON.stringify(liveProducts, null, 2))
}

check().catch(console.error).finally(() => prisma.$disconnect())
