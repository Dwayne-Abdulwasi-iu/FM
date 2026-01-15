import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_LIMIT = 50

/**
 * GET /api/coupons
 * Get available coupons (admin sees all, users see active public ones)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'
    
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), MAX_LIMIT)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)
    const includeExpired = searchParams.get('includeExpired') === 'true' && isAdmin

    const now = new Date()
    
    // Build where clause based on user role
    interface CouponWhere {
      isActive?: boolean
      startDate?: { lte: Date }
      OR?: Array<{ endDate: null } | { endDate: { gte: Date } }>
    }
    
    const where: CouponWhere = isAdmin && includeExpired 
      ? {} 
      : {
          isActive: true,
          startDate: { lte: now },
          OR: [
            { endDate: null },
            { endDate: { gte: now } }
          ]
        }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { redemptions: true }
          }
        }
      }),
      prisma.coupon.count({ where })
    ])

    return NextResponse.json({
      coupons,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Get coupons error:', error)
    return NextResponse.json(
      { message: 'Failed to get coupons' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/coupons
 * Create a new coupon (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      code,
      description,
      discountType,
      discountValue,
      maxUses,
      maxUsesPerUser,
      startDate,
      endDate,
      minOrderAmount,
      maxDiscount,
      designerOnly,
      designerId,
      categoryOnly
    } = body

    // Validate required fields
    if (!code || typeof code !== 'string' || code.length < 3) {
      return NextResponse.json(
        { message: 'Coupon code must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (!discountType || !['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
      return NextResponse.json(
        { message: 'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT' },
        { status: 400 }
      )
    }

    if (!discountValue || typeof discountValue !== 'number' || discountValue <= 0) {
      return NextResponse.json(
        { message: 'Discount value must be a positive number' },
        { status: 400 }
      )
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json(
        { message: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      )
    }

    // Normalize coupon code
    const normalizedCode = code.toUpperCase().trim()

    // Check for duplicate code
    const existing = await prisma.coupon.findUnique({
      where: { code: normalizedCode }
    })

    if (existing) {
      return NextResponse.json(
        { message: 'A coupon with this code already exists' },
        { status: 409 }
      )
    }

    // Create coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        description: description?.trim() || null,
        discountType,
        discountValue,
        maxUses: maxUses || null,
        maxUsesPerUser: maxUsesPerUser || 1,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        minOrderAmount: minOrderAmount || null,
        maxDiscount: maxDiscount || null,
        designerOnly: designerOnly || false,
        designerId: designerOnly ? designerId : null,
        categoryOnly: categoryOnly || null
      }
    })

    return NextResponse.json(
      { message: 'Coupon created successfully', coupon },
      { status: 201 }
    )

  } catch (error) {
    console.error('Create coupon error:', error)
    return NextResponse.json(
      { message: 'Failed to create coupon' },
      { status: 500 }
    )
  }
}
