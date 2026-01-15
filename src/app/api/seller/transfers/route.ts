import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const sellerId = user.id

    // Get all transfers for this user (anyone with sales can view their transfers)
    const transfers = await (prisma as any).paystackTransfer.findMany({
      where: { sellerId },
      include: {
        seller: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Summary stats
    const stats = {
      totalTransfers: transfers.length,
      successfulTransfers: transfers.filter((t: any) => t.paystackStatus === 'SUCCESS').length,
      failedTransfers: transfers.filter((t: any) => t.paystackStatus === 'FAILED').length,
      pendingTransfers: transfers.filter((t: any) => t.paystackStatus === 'PENDING').length,
      totalAmountUSD: transfers
        .filter((t: any) => t.paystackStatus === 'SUCCESS')
        .reduce((sum: number, t: any) => sum + t.amountUSD, 0),
      totalAmountNGN: transfers
        .filter((t: any) => t.paystackStatus === 'SUCCESS')
        .reduce((sum: number, t: any) => sum + t.amountNGN, 0)
    }

    return NextResponse.json({
      success: true,
      transfers,
      stats
    })
  } catch (error) {
    console.error('Fetch transfers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    )
  }
}
