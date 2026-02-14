import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Get all boutique products
    const products = await prisma.boutiqueProduct.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        warehouseReceivedAt: true,
        sellerId: true,
        seller: {
          select: { email: true }
        }
      },
      take: 10
    })

    console.log('Boutique Products:')
    console.log(JSON.stringify(products, null, 2))

    // Count by status
    const statusCounts = await prisma.boutiqueProduct.groupBy({
      by: ['status'],
      _count: true
    })

    console.log('\nStatus Distribution:')
    console.log(JSON.stringify(statusCounts, null, 2))

    // Check if any have no warehouseReceivedAt
    const noWarehouseDate = await prisma.boutiqueProduct.findMany({
      where: { warehouseReceivedAt: null },
      select: { id: true, title: true, status: true }
    })

    console.log(`\nProducts without warehouseReceivedAt: ${noWarehouseDate.length}`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
