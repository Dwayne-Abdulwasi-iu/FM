import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    
    const pageParsed = parseInt(searchParams.get('page') || '1', 10)
    const limitParsed = parseInt(searchParams.get('limit') || '20', 10)
    const daysParsed = parseInt(searchParams.get('days') || '30', 10)
    
    if (isNaN(pageParsed) || isNaN(limitParsed) || isNaN(daysParsed)) {
      return NextResponse.json(
        { error: 'Invalid pagination or filter parameters' },
        { status: 400 }
      )
    }
    
    const page = Math.max(1, pageParsed)
    const limit = Math.min(100, Math.max(1, limitParsed))
    const days = Math.max(1, daysParsed)
    const type = searchParams.get('type') // EARNING, PAYOUT, REFUND
    
    // Validate type parameter if provided
    const validTypes = ['EARNING', 'PAYOUT', 'REFUND']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be one of: EARNING, PAYOUT, REFUND' },
        { status: 400 }
      )
    }

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
        description: `Sale - Order #${earning.order?.orderNumber ?? 'Unknown'}`,
        designTitle: earning.design?.title ?? null,
        createdAt: earning.createdAt.toISOString(),
        orderId: earning.orderId,
      }
    })

    // Filter by type if specified (only EARNING available in current schema)
    const filteredTransactions = type && type !== 'EARNING' ? [] : transactions

    // Check if there are more results
    const totalCount = await prisma.sellerEarning.count({ where: whereClause })
    // When filtering by non-EARNING type that doesn't exist, return 0 total
    const filteredTotal = type && type !== 'EARNING' ? 0 : totalCount
    const hasMore = skip + limit < filteredTotal

    return NextResponse.json({
      transactions: filteredTransactions,
      hasMore,
      total: filteredTotal,
      page,
      limit,
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
