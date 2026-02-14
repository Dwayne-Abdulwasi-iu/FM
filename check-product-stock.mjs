import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Find the product with slug or title containing "wgsdgssdgsfg" or look for recent products
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        status: 'LIVE'
      },
      select: {
        id: true,
        title: true,
        slug: true,
        currentStock: true,
        originalStock: true,
        warehouseReceivedAt: true,
        warehouseExpiresAt: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    console.log('Top 10 LIVE products:')
    console.log(JSON.stringify(products, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
