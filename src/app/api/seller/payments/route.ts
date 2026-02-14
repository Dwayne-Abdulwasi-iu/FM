import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * GET /api/seller/payments
 * Returns all payment transactions for the authenticated seller
 * Includes: order details, processor info, commission breakdown, payout status
 */
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
      return NextResponse.json(
        { error: 'Authentication required' },
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

    const { searchParams } = new URL(request.url)
    
    const pageParsed = parseInt(searchParams.get('page') || '1', 10)
    const limitParsed = parseInt(searchParams.get('limit') || '20', 10)
    
    if (isNaN(pageParsed) || isNaN(limitParsed)) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }
    
    const page = Math.max(1, pageParsed)
    const limit = Math.min(100, Math.max(1, limitParsed))
    const status = searchParams.get('status') // PENDING, COMPLETED, FAILED
    const processor = searchParams.get('processor') // PAYSTACK, STRIPE, FLUTTERWAVE
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Build filters
    const where: any = {
      sellerId: session.user.id,
    }

    if (status) {
      where.payoutStatus = status
    }

    if (processor) {
      where.processor = processor
    }

    if (startDate) {
      const startDateObj = new Date(startDate)
      if (!isNaN(startDateObj.getTime())) {
        where.completedAt = { gte: startDateObj }
      }
    }

    if (endDate) {
      const endDateObj = new Date(endDate)
      if (!isNaN(endDateObj.getTime())) {
        if (where.completedAt) {
          where.completedAt.lte = endDateObj
        } else {
          // If only endDate is provided, only filter by endDate
          where.completedAt = { lte: endDateObj }
        }
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        select: {
          id: true,
          orderId: true,
          processor: true,
          currency: true,
          buyerAmount: true,
          platformFee: true,
          sellerPayout: true,
          processorFee: true,
          initiatedAt: true,
          completedAt: true,
          payoutStatus: true,
          payoutScheduledAt: true,
          payoutCompletedAt: true,
          processorStatus: true,
          failureReason: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              items: {
                select: {
                  id: true,
                  product: {
                    select: { title: true },
                  },
                  quantity: true,
                  price: true,
                },
              },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentTransaction.count({ where }),
    ])

    // Calculate summary statistics
    const summary = await prisma.paymentTransaction.aggregate({
      where,
      _sum: {
        buyerAmount: true,
        sellerPayout: true,
        platformFee: true,
        processorFee: true,
      },
      _count: true,
    })

    const statusBreakdown = await prisma.paymentTransaction.groupBy({
      by: ['payoutStatus'],
      where,
      _count: true,
      _sum: {
        sellerPayout: true,
      },
    })

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
      summary: {
        totalTransactions: summary._count,
        totalRevenue: summary._sum.buyerAmount || 0,
        totalPayout: summary._sum.sellerPayout || 0,
        totalPlatformFee: summary._sum.platformFee || 0,
        totalProcessorFee: summary._sum.processorFee || 0,
      },
      statusBreakdown: Object.fromEntries(
        statusBreakdown.map((sb) => [
          sb.payoutStatus,
          { count: sb._count, total: sb._sum.sellerPayout || 0 },
        ])
      ),
    })
  } catch (error) {
    console.error('Error fetching seller payments:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
