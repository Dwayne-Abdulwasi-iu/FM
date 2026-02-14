import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check seller role
    if (session?.user?.role && !['SELLER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - Only sellers can access this' }, { status: 403 })
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

    const totalEarnings = totalEarningsResult._sum?.sellerAmount ?? 0
    const thisMonthEarnings = thisMonthResult._sum?.sellerAmount ?? 0
    const lastMonthEarnings = lastMonthResult._sum?.sellerAmount ?? 0

    // Get transfer data to calculate accurate balance
    const transfers = await prisma.paystackTransfer.findMany({
      where: { sellerId: userId }
    })
    const totalWithdrawn = transfers
      .filter((t: any) => t.paystackStatus === 'SUCCESS')
      .reduce((sum: number, t: any) => sum + (t.amountUSD || 0), 0)
    const pendingPayout = transfers
      .filter((t: any) => ['PENDING', 'INITIATED'].includes(t.paystackStatus))
      .reduce((sum: number, t: any) => sum + (t.amountUSD || 0), 0)
    const availableBalance = Math.max(totalEarnings - totalWithdrawn - pendingPayout, 0)

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
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
