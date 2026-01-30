/**
 * GET /api/payments/audit-trail
 * Fetch payment transaction history with filtering
 * 
 * Query Parameters:
 * - orderId: Filter by order (buyer, seller, or admin)
 * - processor: Filter by processor (PAYSTACK, STRIPE, FLUTTERWAVE)
 * - status: Filter by payment status
 * - payoutStatus: Filter by payout status
 * - startDate: Filter by date range start
 * - endDate: Filter by date range end
 * - limit: Results per page (default 50)
 * - page: Page number (default 1)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const processor = searchParams.get('processor')
    const payoutStatus = searchParams.get('payoutStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const skip = (page - 1) * limit

    // Build where filter based on user role
    const isAdmin = (session.user as any).role === 'ADMIN'
    const where: any = {}

    // Restrict to user's own data if not admin
    if (!isAdmin) {
      where.OR = [
        { buyerId: session.user.id },
        { sellerId: session.user.id },
      ]
    }

    // Apply optional filters
    if (orderId) where.orderId = orderId
    if (processor) where.processor = processor
    if (payoutStatus) where.payoutStatus = payoutStatus

    // Date range filtering
    if (startDate || endDate) {
      where.initiatedAt = {}
      if (startDate) where.initiatedAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.initiatedAt.lte = end
      }
    }

    // Fetch transactions with related data
    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              total: true,
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { initiatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentTransaction.count({ where }),
    ])

    // Calculate summary statistics
    const summary = {
      totalTransactions: total,
      totalAmount: 0,
      totalPlatformFee: 0,
      totalProcessorFee: 0,
      totalSellerPayout: 0,
      successRate: 0,
      avgPayoutTime: 0,
    }

    if (transactions.length > 0) {
      summary.totalAmount = transactions.reduce((sum, t) => sum + t.buyerAmount, 0)
      summary.totalPlatformFee = transactions.reduce((sum, t) => sum + t.platformFee, 0)
      summary.totalProcessorFee = transactions.reduce((sum, t) => sum + t.processorFee, 0)
      summary.totalSellerPayout = transactions.reduce((sum, t) => sum + t.sellerPayout, 0)

      const completed = transactions.filter(t => t.completedAt).length
      summary.successRate = (completed / transactions.length) * 100

      const payoutTimes = transactions
        .filter(t => t.payoutScheduledAt && t.payoutCompletedAt)
        .map(t => (t.payoutCompletedAt!.getTime() - t.payoutScheduledAt!.getTime()) / (1000 * 60 * 60))
      
      if (payoutTimes.length > 0) {
        summary.avgPayoutTime = Math.round(
          payoutTimes.reduce((a, b) => a + b, 0) / payoutTimes.length
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t.id,
          orderNumber: t.order.orderNumber,
          buyer: t.buyer.name || t.buyer.email,
          seller: t.seller.name || t.seller.email,
          amount: {
            buyer: t.buyerAmount,
            platform: t.platformFee,
            processor: t.processorFee,
            seller: t.sellerPayout,
          },
          processor: t.processor,
          processorRef: t.processorRefId,
          status: {
            payment: t.processorStatus,
            payout: t.payoutStatus,
            reconciliation: t.reconciliationStatus,
          },
          timeline: {
            initiated: t.initiatedAt,
            authorized: t.authorizedAt,
            completed: t.completedAt,
            settled: t.settledAt,
            payoutScheduled: t.payoutScheduledAt,
            payoutInitiated: t.payoutInitiatedAt,
            payoutCompleted: t.payoutCompletedAt,
          },
          metadata: t.metadata,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary,
      },
    })
  } catch (error) {
    console.error('Error fetching payment audit trail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
