import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(_request: NextRequest) {
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

    const sellerId = session.user.id

    // Get all transfers for this user
    const transfers = await (prisma as any).paystackTransfer.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' }
    })

    // Summary stats
    const stats = {
      totalTransfers: transfers.length,
      successfulTransfers: transfers.filter((t: any) => t.paystackStatus === 'SUCCESS').length,
      failedTransfers: transfers.filter((t: any) => ['FAILED', 'CANCELLED'].includes(t.paystackStatus || '')).length,
      pendingTransfers: transfers.filter((t: any) => ['PENDING', 'INITIATED'].includes(t.paystackStatus || '')).length,
      totalAmountUSD: transfers
        .filter((t: any) => t.paystackStatus === 'SUCCESS')
        .reduce((sum: number, t: any) => sum + (t.amountUSD || 0), 0),
      totalAmountNGN: transfers
        .filter((t: any) => t.paystackStatus === 'SUCCESS')
        .reduce((sum: number, t: any) => sum + (t.amountNGN || 0), 0)
    }

    return NextResponse.json({
      transfers,
      stats
    })
  } catch (error) {
    console.error('Fetch transfers error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    )
  }
}
