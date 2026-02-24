import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  const orderCount = await prisma.order.count()
  const refundCount = await prisma.refund.count()
  console.log(`Orders: ${orderCount}`)
  console.log(`Refunds: ${refundCount}`)
} catch (error) {
  console.error('Error:', error.message)
} finally {
  await prisma.$disconnect()
}
