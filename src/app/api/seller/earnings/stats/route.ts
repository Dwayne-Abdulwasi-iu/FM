import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get total earnings from SellerEarning model (uses sellerAmount field)
    const totalEarningsResult = await prisma.sellerEarning.aggregate({
      where: { sellerId: userId },
      _sum: { sellerAmount: true },
    })

    // Get this month's earnings
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const thisMonthResult = await prisma.sellerEarning.aggregate({
      where: {
        sellerId: userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { sellerAmount: true },
    })

    // Get last month's earnings
    const startOfLastMonth = new Date()
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)
    startOfLastMonth.setDate(1)
    startOfLastMonth.setHours(0, 0, 0, 0)

    const endOfLastMonth = new Date(startOfMonth)
    endOfLastMonth.setMilliseconds(-1)

    const lastMonthResult = await prisma.sellerEarning.aggregate({
      where: {
        sellerId: userId,
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: { sellerAmount: true },
    })

    const totalEarnings = totalEarningsResult._sum?.sellerAmount || 0
    const thisMonthEarnings = thisMonthResult._sum?.sellerAmount || 0
    const lastMonthEarnings = lastMonthResult._sum?.sellerAmount || 0

    // For now, all earnings are available (no payout tracking in schema)
    const availableBalance = totalEarnings
    const pendingPayout = 0
    const totalWithdrawn = 0

    return NextResponse.json({
      totalEarnings,
      pendingPayout,
      availableBalance,
      totalWithdrawn,
      thisMonthEarnings,
      lastMonthEarnings,
    })
  } catch (error) {
    console.error('Failed to fetch earnings stats:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
