import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { Prisma, PayoutStatus } from '@prisma/client'

// GET /api/profile/earnings
// Returns a paginated list of seller earnings for the authenticated user
// Query params:
// - page (default 1)
// - pageSize (default 25)
// - from (yyyy-mm-dd) optional
// - to (yyyy-mm-dd) optional
// - status (PENDING|SKIPPED_SPLIT|PAID|FAILED|ALL)
// - search (matches orderNumber or design title)
// - sortBy (date|amount) default date
// - sortOrder (asc|desc) default desc
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)))
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = (searchParams.get('status') || 'ALL').toUpperCase()
    const search = (searchParams.get('search') || '').trim()
    const sortBy = (searchParams.get('sortBy') || 'date') as 'date' | 'amount'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    // Build date range
    const dateFilter: { gte?: Date; lt?: Date } = {}
    if (from) {
      const d = new Date(from)
      if (!isNaN(d.getTime())) dateFilter.gte = d
    }
    if (to) {
      const d = new Date(to)
      if (!isNaN(d.getTime())) {
        // end-of-day exclusive upper bound
        const end = new Date(d)
        end.setDate(end.getDate() + 1)
        end.setHours(0, 0, 0, 0)
        dateFilter.lt = end
      }
    }

    // Base where clause
    const filterStatus: PayoutStatus | undefined =
      status === 'ALL' ? undefined : (status as PayoutStatus)

    const where: Prisma.SellerEarningWhereInput = {
      sellerId: session.user.id,
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      ...(filterStatus ? { payoutStatus: filterStatus } : {}),
    }

    // For search, we allow matching orderNumber or design title
    if (search) {
      where.OR = [
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { design: { title: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Sorting
    const orderBy =
      sortBy === 'amount'
        ? { sellerAmount: sortOrder }
        : { createdAt: sortOrder }

    const [rows, total] = await Promise.all([
      prisma.sellerEarning.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true, createdAt: true } },
          design: { select: { id: true, title: true, imageUrl: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sellerEarning.count({ where }),
    ])

    const formatted = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      saleAmount: r.saleAmount,
      platformCommission: r.platformCommission,
      sellerAmount: r.sellerAmount,
      quantity: r.quantity,
      payoutStatus: r.payoutStatus,
      payoutProvider: r.payoutProvider,
      payoutAttemptedAt: r.payoutAttemptedAt,
      payoutCompletedAt: r.payoutCompletedAt,
      payoutCurrency: r.payoutCurrency,
      payoutAmountMinor: r.payoutAmountMinor,
      order: r.order,
      design: r.design,
    }))

    // Totals for current filter (not only current page)
    const [sumSeller, sumCommission, sumSale] = await Promise.all([
      prisma.sellerEarning.aggregate({ _sum: { sellerAmount: true }, where }),
      prisma.sellerEarning.aggregate({ _sum: { platformCommission: true }, where }),
      prisma.sellerEarning.aggregate({ _sum: { saleAmount: true }, where }),
    ])

    return NextResponse.json({
      earnings: formatted,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        sums: {
          sellerAmount: Number(sumSeller._sum.sellerAmount || 0),
          platformCommission: Number(sumCommission._sum.platformCommission || 0),
          saleAmount: Number(sumSale._sum.saleAmount || 0),
        },
      },
    })
  } catch (err) {
    console.error('Profile earnings list error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
