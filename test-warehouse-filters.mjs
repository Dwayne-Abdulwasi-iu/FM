import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  console.log('\n=== Testing Warehouse Inventory Filtering ===\n')

  // Test 1: Find products with currentStock = null
  const nullStockProducts = await prisma.boutiqueProduct.findMany({
    where: {
      warehouseReceivedAt: { not: null },
      AND: [
        {
          OR: [
            { currentStock: 0 },
            { currentStock: null }
          ]
        }
      ]
    },
    select: {
      id: true,
      title: true,
      status: true,
      currentStock: true,
    },
    take: 5
  })

  console.log('Products with 0 or null stock:')
  console.log(JSON.stringify(nullStockProducts, null, 2))

  // Test 2: Find products with status OUT_OF_STOCK
  const outOfStockProducts = await prisma.boutiqueProduct.findMany({
    where: {
      warehouseReceivedAt: { not: null },
      status: 'OUT_OF_STOCK'
    },
    select: {
      id: true,
      title: true,
      status: true,
      currentStock: true,
    },
    take: 5
  })

  console.log('\nProducts with OUT_OF_STOCK status:')
  console.log(JSON.stringify(outOfStockProducts, null, 2))

  // Test 3: Find products with status LIVE
  const liveProducts = await prisma.boutiqueProduct.findMany({
    where: {
      warehouseReceivedAt: { not: null },
      status: 'LIVE'
    },
    select: {
      id: true,
      title: true,
      status: true,
      currentStock: true,
    },
    take: 5
  })

  console.log('\nProducts with LIVE status:')
  console.log(JSON.stringify(liveProducts, null, 2))

} catch (error) {
  console.error('Error:', error.message)
} finally {
  await prisma.$disconnect()
}
