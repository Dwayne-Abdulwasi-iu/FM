/**
 * Backfill warehouseReceivedAt for all LIVE products
 * This simulates products already being in warehouse
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Set warehouse dates for all LIVE products that don't have them
    const updated = await prisma.boutiqueProduct.updateMany({
      where: {
        status: 'LIVE'
      },
      data: {
        warehouseReceivedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        warehouseExpiresAt: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000) // 150 days from now
      }
    })

    console.log(`✓ Updated ${updated.count} LIVE products with warehouse dates`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
