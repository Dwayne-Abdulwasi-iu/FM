import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Find the product
    const product = await prisma.boutiqueProduct.findFirst({
      where: {
        title: 'wgsdgssdgsfg'
      }
    })

    if (!product) {
      console.log('Product not found')
      return
    }

    // Set originalStock to match currentStock if it's null
    const warehouseReceivedAt = product.warehouseReceivedAt || new Date()
    const warehouseExpiresAt = new Date(warehouseReceivedAt)
    warehouseExpiresAt.setMonth(warehouseExpiresAt.getMonth() + 6) // 6 months expiry

    const updated = await prisma.boutiqueProduct.update({
      where: { id: product.id },
      data: {
        originalStock: product.originalStock || product.currentStock,
        warehouseExpiresAt: product.warehouseExpiresAt || warehouseExpiresAt
      }
    })

    console.log('Updated product:')
    console.log(JSON.stringify({
      id: updated.id,
      title: updated.title,
      currentStock: updated.currentStock,
      originalStock: updated.originalStock,
      warehouseReceivedAt: updated.warehouseReceivedAt,
      warehouseExpiresAt: updated.warehouseExpiresAt,
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
