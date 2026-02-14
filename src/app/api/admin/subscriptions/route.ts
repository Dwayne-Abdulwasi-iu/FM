import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * GET /api/admin/subscriptions
 * Get all active subscriptions with user details
 * 
 * Query params:
 * - tier: 'STARTER' | 'PRO' | 'VIP' (filter)
 * - search: search by email or name
 * - sort: 'expiresAt' | 'subscriptionTier' | 'createdAt'
 * - status: 'ACTIVE' | 'EXPIRED' | 'TRIAL'
 * - page: pagination (default 1)
 * - limit: items per page (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'expiresAt'
    const status = searchParams.get('status') || 'ACTIVE'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    // Build filter
    const whereFilter: any = {}

    // Subscription tier filter
    if (tier && ['STARTER', 'PRO', 'VIP'].includes(tier)) {
      whereFilter.subscriptionTier = tier
    }

    // Status filter
    if (status === 'TRIAL') {
      whereFilter.AND = [
        { proTrialActivated: true },
        { proTrialExpiresAt: { gt: new Date() } }
      ]
    } else if (status === 'ACTIVE') {
      whereFilter.AND = [
        {
          OR: [
            { // Paid subscription active
              AND: [
                { proSubscriptionActive: true },
                { proSubscriptionExpiresAt: { gt: new Date() } }
              ]
            },
            { // Or trial still active
              AND: [
                { proTrialActivated: true },
                { proTrialExpiresAt: { gt: new Date() } }
              ]
            }
          ]
        }
      ]
    } else if (status === 'EXPIRED') {
      whereFilter.AND = [
        {
          OR: [
            { proSubscriptionExpiresAt: { lte: new Date() } },
            { proTrialExpiresAt: { lte: new Date() } }
          ]
        }
      ]
    }

    // Search filter
    if (search) {
      whereFilter.AND = (whereFilter.AND || [])
      whereFilter.AND.push({
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    // Get total count
    const total = await prisma.user.count({ where: whereFilter })

    // Get subscriptions
    const users = await prisma.user.findMany({
      where: whereFilter,
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        subscriptionTier: true,
        subscriptionPrice: true,
        billingCycle: true,
        proSubscriptionActive: true,
        proSubscriptionExpiresAt: true,
        proSubscriptionStartedAt: true,
        proTrialActivated: true,
        proTrialExpiresAt: true,
        totalEarnings: true,
        createdAt: true,
        role: true,
      },
      orderBy: sort === 'subscriptionTier' 
        ? { subscriptionTier: 'asc' }
        : sort === 'createdAt'
        ? { createdAt: 'desc' }
        : { proSubscriptionExpiresAt: 'asc' },
      skip,
      take: limit
    })

    const now = new Date()

    // Format response
    const subscriptions = users.map(user => {
      const isPaidActive = user.proSubscriptionActive && user.proSubscriptionExpiresAt && user.proSubscriptionExpiresAt > now
      const isTrialActive = user.proTrialActivated && user.proTrialExpiresAt && user.proTrialExpiresAt > now

      let daysRemaining = null
      let expiresAt = null
      let subscriptionType = null

      if (isPaidActive) {
        subscriptionType = 'PAID'
        expiresAt = user.proSubscriptionExpiresAt
        daysRemaining = Math.ceil((user.proSubscriptionExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      } else if (isTrialActive) {
        subscriptionType = 'TRIAL'
        expiresAt = user.proTrialExpiresAt
        daysRemaining = Math.ceil((user.proTrialExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name || user.displayName,
        tier: user.subscriptionTier,
        price: user.subscriptionPrice,
        billingCycle: user.billingCycle,
        subscriptionType, // 'PAID', 'TRIAL', null
        expiresAt,
        daysRemaining,
        status: isTrialActive || isPaidActive ? 'ACTIVE' : 'EXPIRED',
        startedAt: user.proSubscriptionStartedAt,
        trialActivatedAt: null,
        paidStartedAt: user.proSubscriptionStartedAt,
        totalEarnings: user.totalEarnings,
        joinedAt: user.createdAt,
        isAdmin: user.role === 'ADMIN',
      }
    })

    const totalPages = Math.ceil(total / limit)
    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasMore: page < totalPages
      },
      filters: {
        tier,
        status,
        search
      }
    })
  } catch (error) {
    console.error('[GET /api/admin/subscriptions]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch subscriptions')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}


