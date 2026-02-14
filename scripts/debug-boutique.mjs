import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  console.log('\n=== Checking Boutique Products ===\n')

  // Check for any BoutiqueProducts
  const products = await prisma.boutiqueProduct.findMany({
    take: 5,
  })

  console.log(`Found ${products.length} products\n`)
  
  if (products.length > 0) {
    console.log('First product:', JSON.stringify(products[0], null, 2))
  } else {
    console.log('No products found!')
  }

  // Check seller count
  const sellerCount = await prisma.seller.count()
  console.log(`\nTotal sellers: ${sellerCount}`)

  // Check if any seller has boutique products
  const sellersWithProducts = await prisma.boutiqueProduct.groupBy({
    by: ['sellerId'],
    _count: {
      id: true,
    },
  })

  console.log(`\nSellers with boutique products: ${sellersWithProducts.length}`)
  if (sellersWithProducts.length > 0) {
    console.log('Count by seller:', sellersWithProducts)
  }

} catch (error) {
  console.error('Error:', error.message)
} finally {
  await prisma.$disconnect()
}
