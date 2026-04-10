import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { PaystackTransfer } from '@prisma/client'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(_req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check seller role
    if (session?.user?.role && !['SELLER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Only sellers can access this' },
        { status: 403 }
      )
    }

    const userId = session.user.id

    // Get user's seller earnings
    const sellerEarnings = await prisma.sellerEarning.aggregate({
      where: { sellerId: userId },
      _sum: {
        sellerAmount: true,
      }
    })

    // Get current month earnings
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEarnings = await prisma.sellerEarning.aggregate({
      where: {
        sellerId: userId,
        createdAt: { gte: monthStart }
      },
      _sum: { sellerAmount: true }
    })

    // Get transfer stats
    const transfers: PaystackTransfer[] = await prisma.paystackTransfer.findMany({
      where: { sellerId: userId }
    })

    const successfulTransfers = transfers.filter((t: PaystackTransfer) => t.paystackStatus === 'SUCCESS').length
    const pendingTransfers = transfers.filter((t: PaystackTransfer) => t.paystackStatus === 'PENDING').length
    const failedTransfers = transfers.filter((t: PaystackTransfer) => t.paystackStatus === 'FAILED').length
    const totalAmountTransferred = transfers
      .filter((t: PaystackTransfer) => t.paystackStatus === 'SUCCESS')
      .reduce((sum: number, t: PaystackTransfer) => sum + (t.amountUSD || 0), 0)

    // Get recent earnings (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentEarnings = await prisma.sellerEarning.aggregate({
      where: {
        sellerId: userId,
        createdAt: { gte: sevenDaysAgo }
      },
      _sum: { sellerAmount: true }
    })

    const totalEarnings = sellerEarnings._sum.sellerAmount ?? 0
    const totalWithdrawn = totalAmountTransferred
    
    // Get pending payout (transfers in progress - PENDING and INITIATED)
    const pendingAmount = transfers
      .filter((t: PaystackTransfer) => ['PENDING', 'INITIATED'].includes(t.paystackStatus))
      .reduce((sum: number, t: PaystackTransfer) => sum + (t.amountUSD || 0), 0)
    
    // Available balance = Total - (Withdrawn + Pending + Failed that user hasn't cancelled)
    // For now: Total - Withdrawn - Pending
    const availableBalance = Math.max(totalEarnings - totalWithdrawn - pendingAmount, 0)

    return NextResponse.json({
      totalEarnings,
      availableBalance,
      pendingPayout: pendingAmount,
      totalWithdrawn,
      thisMonthEarnings: monthEarnings._sum.sellerAmount ?? 0,
      totalTransfers: transfers.length,
      successfulTransfers,
      pendingTransfers,
      failedTransfers,
      totalAmountTransferred,
      recentEarnings: recentEarnings._sum.sellerAmount ?? 0,
    })
  } catch (error) {
    console.error('Error fetching finances summary:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}
