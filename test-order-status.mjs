import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkOrders() {
  try {
    const order1 = await prisma.boutiqueOrder.findUnique({
      where: { id: 'cml6ilpch0001xdbylwzksq0n' },
      select: { id: true, orderNumber: true, status: true, shippedAt: true, deliveredAt: true },
    })
    
    console.log('Order 1:')
    console.log(JSON.stringify(order1, null, 2))
    
    const order2 = await prisma.boutiqueOrder.findUnique({
      where: { id: 'cmkqokauy0001b6b6sxlvtpfs' },
      select: { id: true, orderNumber: true, status: true, shippedAt: true, deliveredAt: true },
    })
    
    console.log('\nOrder 2:')
    console.log(JSON.stringify(order2, null, 2))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkOrders()
