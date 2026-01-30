import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillPublishedAt() {
  try {
    console.log('Starting to backfill publishedAt for all approved designs...')

    // Get all approved designs
    const approvedDesigns = await prisma.design.findMany({
      where: {
        approvalStatus: 'APPROVED'
      },
      select: {
        id: true,
        updatedAt: true
      }
    })

    console.log(`Found ${approvedDesigns.length} approved designs`)

    if (approvedDesigns.length === 0) {
      console.log('No approved designs to update')
      process.exit(0)
    }

    // Update each design: set publishedAt to updatedAt
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

    console.log(`✓ Successfully set publishedAt for ${updated} approved designs`)
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfillPublishedAt()
