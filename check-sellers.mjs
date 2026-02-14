import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Get all boutique products with seller info
    const products = await prisma.boutiqueProduct.findMany({
      include: {
        seller: { select: { id: true, email: true, name: true } }
      }
    })

    console.log('All Boutique Products by Seller:')
    const byEmail = {}
    
    for (const product of products) {
      const email = product.seller?.email || 'UNKNOWN'
      if (!byEmail[email]) byEmail[email] = []
      byEmail[email].push({
        id: product.id,
        title: product.title,
        status: product.status,
        warehouseReceivedAt: product.warehouseReceivedAt
      })
    }

    for (const [email, prods] of Object.entries(byEmail)) {
      console.log(`\n${email} (${prods.length} products):`)
      prods.forEach(p => {
        console.log(`  - ${p.title} (${p.status}) warehouseReceivedAt: ${p.warehouseReceivedAt ? 'YES' : 'NO'}`)
      })
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
