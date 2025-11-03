import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Admin-only maintenance endpoint to normalize platformFee to USD across orders
// Logic: platformFee should be 5% of sum(order.items.price * quantity) in USD
// If stored value deviates significantly (> 1 cent) or is obviously NGN-sized relative to USD,
// it will be recalculated and updated.

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all orders with items
    const orders = await prisma.order.findMany({
      include: { items: true }
    })

    let scanned = 0
    let updated = 0
    const fixes: Array<{ id: string; old: number; expected: number }> = []

    for (const order of orders) {
      scanned++
      const expectedUSD = Number((order.items.reduce((sum, it) => sum + it.price * it.quantity, 0) * 0.05).toFixed(2))
      const current = Number((order.platformFee || 0).toFixed(2))

      // Detect large mismatch (e.g., NGN values shown with $) or > 0.01 difference
      const isClearlyNGN = current > (order.totalAmount || 0) * 0.2 // 5% should never exceed 20% of total
      const differs = Math.abs(current - expectedUSD) > 0.01

      if (isClearlyNGN || differs) {
        await prisma.order.update({
          where: { id: order.id },
          data: { platformFee: expectedUSD }
        })
        updated++
        fixes.push({ id: order.id, old: current, expected: expectedUSD })
      }
    }

    return NextResponse.json({ scanned, updated, fixes })
  } catch (error) {
    console.error('normalize-platform-fees error:', error)
    return NextResponse.json({ error: 'Failed to normalize platform fees' }, { status: 500 })
  }
}
