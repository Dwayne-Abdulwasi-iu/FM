import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const orderSearch = searchParams.get('orderId') || ''
    const type = searchParams.get('type') || 'all' // all, users, sellers, designers
    const tier = searchParams.get('tier') || '' // DESIGNER, GOLD_DESIGNER, VIP_DESIGNER, VVIP_DESIGNER
    const status = searchParams.get('status') || '' // verified, unverified
    const pageParam = parseInt(searchParams.get('page') || '1')
    const limitParam = parseInt(searchParams.get('limit') || '20')
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100)
    const skip = (page - 1) * limit

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    
    // Search by name, username, email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Search by order ID - find user who is seller for that order
    if (orderSearch) {
      // Check design orders
      const designOrder = await prisma.order.findFirst({
        where: {
          orderNumber: { contains: orderSearch, mode: 'insensitive' }
        },
        include: {
          items: {
            include: {
              design: {
                select: { designerId: true }
              }
            }
          }
        }
      })

      // Check boutique orders
      const boutiqueOrder = await prisma.boutiqueOrder.findFirst({
        where: {
          orderNumber: { contains: orderSearch, mode: 'insensitive' }
        },
        select: { sellerId: true }
      })

      // Check commission requests by ID (starts with "CR-")
      const commission = await prisma.commissionRequest.findFirst({
        where: {
          id: { contains: orderSearch, mode: 'insensitive' }
        },
        select: { designerId: true }
      })

      const sellerIds: string[] = []
      if (designOrder) {
        designOrder.items.forEach(item => {
          if (item.design?.designerId) {
            sellerIds.push(item.design.designerId)
          }
        })
      }
      if (boutiqueOrder?.sellerId) sellerIds.push(boutiqueOrder.sellerId)
      if (commission?.designerId) sellerIds.push(commission.designerId)

      if (sellerIds.length > 0) {
        where.id = { in: [...new Set(sellerIds)] }
      } else {
        // No matching orders found
        return NextResponse.json({
          users: [],
          pagination: { page, limit, total: 0, pages: 0 }
        })
      }
    }

    // Filter by user type
    if (type === 'sellers') {
      where.OR = [
        { designs: { some: {} } },
        { boutiqueProducts: { some: {} } },
      ]
    } else if (type === 'designers') {
      where.designs = { some: {} }
    } else if (type === 'boutique_sellers') {
      where.boutiqueProducts = { some: {} }
    }

    // Filter by designer tier
    if (tier) {
      where.designerTier = tier
    }

    // Filter by verification status
    if (status === 'verified') {
      where.isVerified = true
    } else if (status === 'unverified') {
      where.isVerified = false
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          displayName: true,
          image: true,
          role: true,
          isVerified: true,
          designerTier: true,
          totalSales: true,
          totalEarnings: true,
          createdAt: true,
          _count: {
            select: {
              designs: true,
              orders: true,
              boutiqueProducts: true,
              boutiqueOrdersSeller: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users: users.map(user => ({
        ...user,
        isSeller: (user._count.designs > 0 || user._count.boutiqueProducts > 0),
        designCount: user._count.designs,
        orderCount: user._count.orders,
        boutiqueProductCount: user._count.boutiqueProducts,
        boutiqueOrderCount: user._count.boutiqueOrdersSeller,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get user segments for broadcast
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { targetType, targetTier } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    switch (targetType) {
      case 'ALL':
        // No filter - all users
        break
      case 'USERS':
        // Users who have never uploaded a design or boutique product
        where.AND = [
          { designs: { none: {} } },
          { boutiqueProducts: { none: {} } },
        ]
        break
      case 'SELLERS':
        // Users who have uploaded designs or boutique products
        where.OR = [
          { designs: { some: {} } },
          { boutiqueProducts: { some: {} } },
        ]
        break
      case 'DESIGNERS':
        // Users who have uploaded designs
        where.designs = { some: {} }
        break
      case 'TIER_SPECIFIC':
        if (targetTier) {
          where.designerTier = targetTier
        }
        break
      case 'VERIFIED_ONLY':
        where.isVerified = true
        break
    }

    const count = await prisma.user.count({ where })

    // Get sample users for preview
    const sampleUsers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        designerTier: true,
      },
      take: 5,
    })

    return NextResponse.json({
      count,
      sampleUsers,
      targetType,
      targetTier,
    })
  } catch (error) {
    console.error('Error getting user segments:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}