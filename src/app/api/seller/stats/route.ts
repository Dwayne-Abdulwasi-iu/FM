import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateAllBadges } from '@/lib/badge-service'

/**
 * GET /api/seller/stats
 * Get seller stats for badge display
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        totalSales: true,
        avgRating: true,
        verificationBadge: true,
        isVerified: true,
        _count: {
          select: {
            designs: {
              where: {
                isActive: true,
                approvalStatus: 'APPROVED'
              }
            }
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

    const isManuallyVerified = seller.isVerified && ['VERIFIED_PRO', 'ELITE'].includes(seller.verificationBadge || '')

    // Calculate all earned badges
    const allBadges = calculateAllBadges({
      totalSales: seller.totalSales || 0,
      avgRating: seller.avgRating || 0,
      designCount: seller._count.designs || 0,
      isManuallyVerified
    })

    return NextResponse.json({
      totalSales: seller.totalSales || 0,
      avgRating: seller.avgRating || 0,
      designCount: seller._count.designs || 0,
      currentBadge: seller.verificationBadge || null,
      allBadges
    })
  } catch (error) {
    console.error('Error fetching seller stats:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
