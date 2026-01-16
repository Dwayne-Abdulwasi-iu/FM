import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const days = parseInt(searchParams.get('days') || '30')
    const type = searchParams.get('type') // EARNING, PAYOUT, REFUND

    const skip = (page - 1) * limit
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    // Build where clause
    const whereClause = {
      sellerId: userId,
      createdAt: { gte: dateFrom },
    }

    // Get earnings
    const earnings = await prisma.sellerEarning.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: {
          select: {
            orderNumber: true,
            items: {
              select: {
                design: {
                  select: { title: true },
                },
              },
            },
          },
        },
        design: {
          select: { title: true },
        },
      },
    })

    // Transform to transaction format
    const transactions = earnings.map((earning) => {
      return {
        id: earning.id,
        type: 'EARNING' as const,
        amount: earning.sellerAmount,
        status: 'COMPLETED' as const,
        description: `Sale - Order #${earning.order?.orderNumber || 'N/A'}`,
        designTitle: earning.design?.title || null,
        createdAt: earning.createdAt.toISOString(),
        orderId: earning.orderId,
      }
    })

    // Filter by type if specified
    const filteredTransactions = type
      ? transactions.filter((tx) => tx.type === type)
      : transactions

    // Check if there are more results
    const totalCount = await prisma.sellerEarning.count({ where: whereClause })
    const hasMore = skip + limit < totalCount

    return NextResponse.json({
      transactions: filteredTransactions,
      hasMore,
      total: totalCount,
      page,
      limit,
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
