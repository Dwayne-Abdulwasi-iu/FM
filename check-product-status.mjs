import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProductStatus() {
  try {
    // Find the wgsdgssdgsfg product
    const product = await prisma.boutiqueProduct.findUnique({
      where: { slug: 'wgsdgssdgsfg' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!product) {
      console.log('Product not found with slug wgsdgssdgsfg')
      return
    }

    console.log('Product found:')
    console.log(JSON.stringify(product, null, 2))

    // Also check for any return shipments
    const shipments = await prisma.sellerToAdminShipment.findMany({
      where: {
        productIds: { has: product.id }
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('\nShipments for this product:')
    console.log(JSON.stringify(shipments, null, 2))

    // Fix the status if it's still LIVE
    if (product.status === 'LIVE') {
      console.log('\nUpdating product status to IN_RETURN...')
      const updated = await prisma.boutiqueProduct.update({
        where: { id: product.id },
        data: { status: 'IN_RETURN' }
      })
      console.log('Status updated to:', updated.status)
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductStatus()
