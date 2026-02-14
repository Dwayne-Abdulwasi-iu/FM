import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  console.log('Checking what /api/boutique/products would return...\n')
  
  const product = await prisma.boutiqueProduct.findMany({
    where: { status: 'LIVE' },
    include: {
      category: {
        select: { id: true, name: true, slug: true, parentId: true },
      },
      seller: {
        select: { id: true, name: true, image: true },
      },
      media: {
        where: { isApproved: true },
        orderBy: { sortOrder: 'asc' },
        take: 4,
      },
      variants: {
        where: { isActive: true, quantity: { gt: 0 } },
      },
      _count: {
        select: { reviews: true, favorites: true },
      },
    },
    take: 1
  })
  
  console.log('Full product object:', JSON.stringify(product[0], null, 2))
  
  if (product[0]) {
    console.log('\nKey fields:')
    console.log('- id:', product[0].id)
    console.log('- slug:', product[0].slug)
    console.log('- title:', product[0].title)
    console.log('- thumbnailUrl:', product[0].thumbnailUrl)
    console.log('- basePrice:', product[0].basePrice)
    console.log('- Has media?', product[0].media?.length > 0)
    console.log('- Category:', product[0].category?.name)
  }
  
  process.exit(0)
}

check()

