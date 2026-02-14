import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  console.log('Fixing boutique product status...')
  
  const result = await prisma.boutiqueProduct.updateMany({
    where: {
      status: 'OUT_OF_STOCK',
      warehouseReceivedAt: { not: null },
    },
    data: {
      status: 'LIVE',
      currentStock: 1, // Set a default stock value
    }
  })
  
  console.log(`Updated ${result.count} products to LIVE status`)
  
  // Show the updated products
  const products = await prisma.boutiqueProduct.findMany({
    where: { status: 'LIVE' },
  })
  
  console.log(`\nNow have ${products.length} LIVE products`)
  
} catch (error) {
  console.error('Error:', error.message)
} finally {
  await prisma.$disconnect()
}
