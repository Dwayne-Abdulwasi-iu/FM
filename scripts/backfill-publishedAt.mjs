import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillPublishedAt() {
  try {
    console.log('Starting to backfill publishedAt for approved designs...')

    // Get all approved designs that don't have publishedAt
    const approvedDesigns = await prisma.design.findMany({
      where: {
        approvalStatus: 'APPROVED',
        publishedAt: null
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log(`Found ${approvedDesigns.length} approved designs without publishedAt`)

    if (approvedDesigns.length === 0) {
      console.log('No designs to update')
      process.exit(0)
    }

    // Update each design: set publishedAt to updatedAt (when it was approved)
    let updated = 0
    for (const design of approvedDesigns) {
      await prisma.design.update({
        where: { id: design.id },
        data: {
          publishedAt: design.updatedAt
        }
      })
      updated++
      if (updated % 10 === 0) {
        console.log(`Updated ${updated}/${approvedDesigns.length} designs...`)
      }
    }

    console.log(`✓ Successfully backfilled ${updated} designs with publishedAt`)
    process.exit(0)
  } catch (error) {
    console.error('Error backfilling publishedAt:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfillPublishedAt()
