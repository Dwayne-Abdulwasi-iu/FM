import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateOrder() {
  try {
    const order = await prisma.order.update({
      where: { orderNumber: 'fashion_1769020305463_cmhg4iddx0000hej8nvdfzx4g' },
      data: {
        status: 'COMPLETED',
        paidAt: new Date()
      }
    })
    console.log('✅ Order updated to COMPLETED:', order.orderNumber)
    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

updateOrder()
