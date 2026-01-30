import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateDesigns() {
  try {
    // Update all approved designs that have null publishedAt
    const result = await prisma.design.updateMany({
      where: {
        approvalStatus: 'APPROVED',
        publishedAt: null
      },
      data: {
        publishedAt: new Date()
      }
    })
    
    console.log(`Updated ${result.count} designs with publishedAt = now`)
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateDesigns()
