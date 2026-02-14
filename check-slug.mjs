import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  console.log('1. Checking featured boutique products...\n')
  
  const featured = await prisma.featuredBoutiqueProduct.findMany({
    include: {
      product: {
        select: { id: true, slug: true, title: true }
      }
    }
  })
  
  console.log('Featured count:', featured.length)
  if (featured.length > 0) {
    console.log('First featured:', JSON.stringify(featured[0], null, 2))
  } else {
    console.log('⚠ No featured products - will use fallback')
  }
  
  console.log('\n2. Checking LIVE boutique products (fallback source)...\n')
  
  const live = await prisma.boutiqueProduct.findMany({
    where: { status: 'LIVE' },
    take: 2,
    select: { id: true, slug: true, title: true }
  })
  
  console.log('LIVE products count:', live.length)
  console.log('Sample LIVE products:', JSON.stringify(live, null, 2))
  
  process.exit(0)
}

check()
