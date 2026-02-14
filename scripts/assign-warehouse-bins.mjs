import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignWarehouseBins() {
  try {
    // Get all warehouse products (non-null warehouseReceivedAt means they're in warehouse)
    const products = await prisma.boutiqueProduct.findMany({
      where: {
        warehouseReceivedAt: {
          not: null
        }
      },
      orderBy: {
        warehouseReceivedAt: 'asc'
      }
    })

    console.log(`Found ${products.length} products in warehouse`)

    // Assign bin locations A1-001 through A1-011
    for (let i = 0; i < Math.min(products.length, 11); i++) {
      const binNumber = String(i + 1).padStart(3, '0')
      const binLocation = `A1-${binNumber}`
      
      const updated = await prisma.boutiqueProduct.update({
        where: { id: products[i].id },
        data: { warehouseLocation: binLocation }
      })

      console.log(`✓ ${updated.title} → Bin ${binLocation}`)
    }

    console.log(`\n✅ Successfully assigned ${Math.min(products.length, 11)} bin locations`)

  } catch (error) {
    console.error('Error assigning bins:', error)
  } finally {
    await prisma.$disconnect()
  }
}

assignWarehouseBins()
