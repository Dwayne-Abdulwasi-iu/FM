import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/seller/payments
 * Returns all payment transactions for the authenticated seller
 * Includes: order details, processor info, commission breakdown, payout status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
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
      where.completedAt = { gte: new Date(startDate) }
    }

    if (endDate) {
      if (where.completedAt) {
        where.completedAt.lte = new Date(endDate)
      } else {
        where.completedAt = { lte: new Date(endDate) }
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
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
