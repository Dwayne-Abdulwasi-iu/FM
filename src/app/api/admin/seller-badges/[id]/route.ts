import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/seller-badges/[id]
 * Get a specific seller's badge and achievement data
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const seller = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        totalSales: true,
        avgRating: true,
        verificationBadge: true,
        designerTier: true,
        createdAt: true,
        trustScore: true,
        _count: {
          select: {
            designs: true,
            reviews: true,
          }
        }
      }
    })

    if (!seller) {
      return NextResponse.json(
        { message: 'Seller not found' },
        { status: 404 }
      )
    }

    // Calculate suggested badge based on achievements
    const suggestedBadge = calculateSuggestedBadge(seller)

    return NextResponse.json({
      seller,
      suggestedBadge,
      achievements: {
        totalSales: seller.totalSales,
        avgRating: seller.avgRating,
        reviewCount: seller._count.reviews,
        designCount: seller._count.designs,
        accountAgeDays: Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        trustScore: seller.trustScore,
      }
    })

  } catch (error) {
    console.error('Get seller badge error:', error)
    return NextResponse.json(
      { message: 'Failed to get seller' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/seller-badges/[id]
 * Manually assign badge (override auto-assignment)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { badge } = body

    // Validate badge value
    const validBadges = ['RISING_STAR', 'TOP_SELLER', 'VERIFIED_PRO', null]
    if (!validBadges.includes(badge)) {
      return NextResponse.json(
        { message: 'Invalid badge value' },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        verificationBadge: badge,
      },
      select: {
        id: true,
        name: true,
        email: true,
        verificationBadge: true,
      }
    })

    return NextResponse.json({
      message: 'Badge updated successfully',
      seller: updated
    })

  } catch (error) {
    console.error('Update seller badge error:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { message: 'Seller not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { message: 'Failed to update badge' },
      { status: 500 }
    )
  }
}

/**
 * Calculate suggested badge based on seller achievements
 * AUTO-BADGE LOGIC:
 * - RISING_STAR: New seller with 5+ sales and 4.5+ rating
 * - TOP_SELLER: 50+ sales with 4.7+ rating or 100+ sales with 4.5+ rating
 * - VERIFIED_PRO: 200+ sales with 4.8+ rating and 30+ reviews
 */
function calculateSuggestedBadge(seller: {
  totalSales: number
  avgRating: number
  _count: { reviews: number }
  createdAt: Date
}): string | null {
  const accountAgeDays = Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const isNewSeller = accountAgeDays < 90
  
  // VERIFIED_PRO: Highest tier - 200+ sales, 4.8+ rating, 30+ reviews
  if (seller.totalSales >= 200 && seller.avgRating >= 4.8 && seller._count.reviews >= 30) {
    return 'VERIFIED_PRO'
  }

  // TOP_SELLER: Experienced seller - 100+ sales with 4.5+ rating OR 50+ sales with 4.7+ rating
  if (
    (seller.totalSales >= 100 && seller.avgRating >= 4.5) ||
    (seller.totalSales >= 50 && seller.avgRating >= 4.7)
  ) {
    return 'TOP_SELLER'
  }

  // RISING_STAR: New seller doing well - 5+ sales, 4.5+ rating, account < 90 days
  if (isNewSeller && seller.totalSales >= 5 && seller.avgRating >= 4.5) {
    return 'RISING_STAR'
  }

  return null
}
