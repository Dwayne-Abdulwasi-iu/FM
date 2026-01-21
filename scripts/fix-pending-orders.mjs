import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPendingOrders() {
  try {
    console.log('Finding all PENDING Paystack orders...')
    
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentMethod: 'PAYSTACK'
      }
    })

    console.log(`Found ${pendingOrders.length} PENDING Paystack orders`)

    if (pendingOrders.length === 0) {
      console.log('No pending orders to fix')
      process.exit(0)
    }

    // Update all PENDING orders to COMPLETED
    const updated = await prisma.order.updateMany({
      where: {
        status: 'PENDING',
        paymentMethod: 'PAYSTACK'
      },
      data: {
        status: 'COMPLETED',
        paidAt: new Date()
      }
    })

    console.log(`✅ Updated ${updated.count} orders from PENDING to COMPLETED`)
    
    // Show the updated orders
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        paymentMethod: 'PAYSTACK'
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paidAt: true
      }
    })

    console.log('Updated orders:')
    completedOrders.forEach(order => {
      console.log(`  - ${order.orderNumber}: ${order.status}`)
    })

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixPendingOrders()
