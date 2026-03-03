import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/admin/seller-badges
 * Get all sellers with their badge status (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const badge = searchParams.get('badge')
    const limitParam = parseInt(searchParams.get('limit') || '50')
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    const where: Record<string, unknown> = {
      // Show all users (ADMIN, USER, SELLER roles) - sellers are anyone with designs/sales
      OR: [
        { totalSales: { gt: 0 } },  // Has made sales
        { designs: { some: {} } }   // Has uploaded designs
      ]
    }

    if (badge) {
      where.verificationBadge = badge
    }

    const [sellers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [
          { totalSales: 'desc' },
          { avgRating: 'desc' }
        ],
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isVerified: true,
          verificationBadge: true,
          designerTier: true,
          totalSales: true,
          avgRating: true,
          createdAt: true,
          _count: {
            select: {
              designs: true,
              reviews: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      sellers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Get seller badges error:', error)
    return NextResponse.json(
      { message: 'Failed to get sellers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/seller-badges
 * Assign or update a seller's verification badge (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sellerId, badge, isVerified, designerTier } = body

    if (!sellerId) {
      return NextResponse.json(
        { message: 'Seller ID is required' },
        { status: 400 }
      )
    }

    // Validate badge type
    const validBadges = ['NONE', 'RISING_STAR', 'TOP_SELLER', 'VERIFIED_PRO', 'ELITE']
    if (badge && !validBadges.includes(badge)) {
      return NextResponse.json(
        { message: 'Invalid badge type' },
        { status: 400 }
      )
    }

    // Validate tier
    const validTiers = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']
    if (designerTier && !validTiers.includes(designerTier)) {
      return NextResponse.json(
        { message: 'Invalid designer tier' },
        { status: 400 }
      )
    }

    // Check seller exists
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, role: true }
    })

    if (!seller) {
      return NextResponse.json(
        { message: 'Seller not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    
    if (badge !== undefined) {
      updateData.verificationBadge = badge
    }
    
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified
    }
    
    if (designerTier !== undefined) {
      updateData.designerTier = designerTier
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No update data provided' },
        { status: 400 }
      )
    }

    // Update seller
    const updatedSeller = await prisma.user.update({
      where: { id: sellerId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        verificationBadge: true,
        designerTier: true
      }
    })

    return NextResponse.json({
      message: 'Seller badge updated successfully',
      seller: updatedSeller
    })

  } catch (error) {
    console.error('Update seller badge error:', error)
    return NextResponse.json(
      { message: 'Failed to update seller badge' },
      { status: 500 }
    )
  }
}
