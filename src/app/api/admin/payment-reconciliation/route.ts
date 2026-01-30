import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/admin/payment-reconciliation
 * Admin dashboard for payment reconciliation across all processors
 * Returns processor balances, transaction summary, discrepancies
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const processor = searchParams.get('processor') // Filter by processor
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    // Build date filter
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    const where: any = dateFilter.gte || dateFilter.lte ? { completedAt: dateFilter } : {}
    if (processor) where.processor = processor

    // Get all transactions for the period
    const transactions = await prisma.paymentTransaction.findMany({
      where,
      select: {
        id: true,
        processor: true,
        currency: true,
        buyerAmount: true,
        processorFee: true,
        platformFee: true,
        sellerPayout: true,
        processorStatus: true,
        payoutStatus: true,
        completedAt: true,
        payoutCompletedAt: true,
        reconciliationStatus: true,
        reconciliationNotes: true,
        failureReason: true,
        buyer: {
          select: { email: true, name: true },
        },
        seller: {
          select: { email: true, name: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      skip,
      take: limit,
    })

    const total = await prisma.paymentTransaction.count({ where })

    // Calculate processor-specific summaries
    const processorSummaries = await prisma.paymentTransaction.groupBy({
      by: ['processor'],
      where,
      _sum: {
        buyerAmount: true,
        processorFee: true,
        platformFee: true,
        sellerPayout: true,
      },
      _count: true,
    })

    // Calculate status breakdown
    const statusBreakdown = await prisma.paymentTransaction.groupBy({
      by: ['payoutStatus'],
      where,
      _count: true,
      _sum: {
        sellerPayout: true,
      },
    })

    // Get reconciliation reports
    const reports = await prisma.paymentReconciliationReport.findMany({
      where: processor ? { processor } : {},
      orderBy: { reportDate: 'desc' },
      take: 10,
    })

    // Calculate overall metrics
    const totalProcessed = await prisma.paymentTransaction.aggregate({
      where,
      _sum: {
        buyerAmount: true,
        processorFee: true,
        platformFee: true,
        sellerPayout: true,
      },
      _count: true,
    })

    // Calculate pending payouts
    const pendingPayouts = await prisma.paymentTransaction.aggregate({
      where: {
        ...where,
        payoutStatus: 'PENDING',
      },
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
      overview: {
        totalTransactions: totalProcessed._count,
        totalRevenue: totalProcessed._sum.buyerAmount || 0,
        totalProcessorFees: totalProcessed._sum.processorFee || 0,
        totalPlatformFees: totalProcessed._sum.platformFee || 0,
        totalPayouts: totalProcessed._sum.sellerPayout || 0,
        pendingPayouts: pendingPayouts._sum.sellerPayout || 0,
      },
      processorSummaries: Object.fromEntries(
        processorSummaries.map((ps) => [
          ps.processor,
          {
            count: ps._count,
            revenue: ps._sum.buyerAmount || 0,
            fees: ps._sum.processorFee || 0,
            platformFees: ps._sum.platformFee || 0,
            payouts: ps._sum.sellerPayout || 0,
          },
        ])
      ),
      statusBreakdown: Object.fromEntries(
        statusBreakdown.map((sb) => [
          sb.payoutStatus,
          { count: sb._count, total: sb._sum.sellerPayout || 0 },
        ])
      ),
      reconciliationReports: reports,
    })
  } catch (error) {
    console.error('Error fetching payment reconciliation:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reconciliation data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/payment-reconciliation
 * Create a new reconciliation report for a processor
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { processor, periodStart, periodEnd, expectedBalance, actualBalance } = body

    if (!processor || !periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate summary from transactions in this period
    const summary = await prisma.paymentTransaction.aggregate({
      where: {
        processor,
        completedAt: {
          gte: new Date(periodStart),
          lte: new Date(periodEnd),
        },
      },
      _sum: {
        sellerPayout: true,
      },
      _count: {
        _all: true,
      },
    })

    const statusSummary = await prisma.paymentTransaction.groupBy({
      by: ['payoutStatus'],
      where: {
        processor,
        completedAt: {
          gte: new Date(periodStart),
          lte: new Date(periodEnd),
        },
      },
      _sum: {
        sellerPayout: true,
      },
      _count: true,
    })

    // Create the report
    const report = await prisma.paymentReconciliationReport.create({
      data: {
        processor,
        reportDate: new Date(),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        expectedBalance: expectedBalance || 0,
        actualBalance: actualBalance || 0,
        discrepancy: (actualBalance || 0) - (expectedBalance || 0),
        completedTxnCount: statusSummary.find((s) => s.payoutStatus === 'COMPLETED')?._count || 0,
        pendingTxnCount: statusSummary.find((s) => s.payoutStatus === 'PENDING')?._count || 0,
        failedTxnCount: statusSummary.find((s) => s.payoutStatus === 'FAILED')?._count || 0,
        totalProcessed: summary._sum.sellerPayout || 0,
        payoutCount: summary._count._all || 0,
        payoutTotal: summary._sum.sellerPayout || 0,
        avgPayoutTime: 0, // Default value
        failedPayouts: 0, // Default value
      },
    })

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('Error creating reconciliation report:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create report' },
      { status: 500 }
    )
  }
}
