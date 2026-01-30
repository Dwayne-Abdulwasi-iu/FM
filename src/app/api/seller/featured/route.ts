'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * GET /api/seller/featured
 * Get seller's featured designs and their remaining slots
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const now = new Date()
    
    // Get seller's pro status
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        proSubscriptionActive: true,
        proSubscriptionExpiresAt: true,
        proTrialActivated: true,
        proTrialExpiresAt: true,
        totalEarnings: true,
      }
    })

    if (!seller) {
      return NextResponse.json(
        { message: 'Seller not found' },
        { status: 404 }
      )
    }

    // Check for active pro subscription or trial
    const hasActiveSub = seller.proSubscriptionActive && seller.proSubscriptionExpiresAt && seller.proSubscriptionExpiresAt > now
    const hasActiveTrial = seller.proTrialActivated && seller.proTrialExpiresAt && seller.proTrialExpiresAt > now
    const hasActivePro = hasActiveSub || hasActiveTrial

    // Max featured listings depends on pro status
    const maxFeatured = hasActivePro ? 6 : 5

    // Get currently featured designs
    const featuredDesigns = await prisma.design.findMany({
      where: {
        designerId: session.user.id,
        featured: true
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        thumbnailUrl: true,
        price: true,
        totalSales: true,
        totalRevenue: true,
        createdAt: true
      }
    })

    // Get available designs to feature
    const availableDesigns = await prisma.design.findMany({
      where: {
        designerId: session.user.id,
        featured: false,
        isActive: true,
        approvalStatus: 'APPROVED'
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        thumbnailUrl: true,
        price: true,
        totalSales: true,
        createdAt: true
      },
      take: 10
    })

    return NextResponse.json({
      hasActivePro,
      isPaid: hasActiveSub,
      isTrial: hasActiveTrial,
      maxFeatured,
      currentFeatured: featuredDesigns.length,
      remainingSlots: Math.max(0, maxFeatured - featuredDesigns.length),
      featuredDesigns,
      availableDesigns,
      proExpiresAt: hasActiveSub ? seller.proSubscriptionExpiresAt : null,
      trialExpiresAt: hasActiveTrial ? seller.proTrialExpiresAt : null
    })
  } catch (error) {
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp

    console.error('Error fetching featured:', error)
    return NextResponse.json(
      { message: 'Failed to fetch featured listings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/seller/featured
 * Toggle featured status on a design
 * 
 * Request body:
 * {
 *   designId: string
 *   featured: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { designId, featured } = await request.json()
    if (!designId || typeof featured !== 'boolean') {
      return NextResponse.json(
        { message: 'Missing or invalid designId or featured flag' },
        { status: 400 }
      )
    }

    // Get the design
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        designerId: true,
        featured: true
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (design.designerId !== session.user.id) {
      return NextResponse.json(
        { message: 'Unauthorized - you do not own this design' },
        { status: 403 }
      )
    }

    // If trying to feature, check if within limits
    if (featured && !design.featured) {
      const now = new Date()

      const seller = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          proSubscriptionActive: true,
          proSubscriptionExpiresAt: true,
          proTrialActivated: true,
          proTrialExpiresAt: true
        }
      })

      if (!seller) {
        return NextResponse.json(
          { message: 'Seller not found' },
          { status: 404 }
        )
      }

      // Check pro status
      const hasActiveSub = seller.proSubscriptionActive && seller.proSubscriptionExpiresAt && seller.proSubscriptionExpiresAt > now
      const hasActiveTrial = seller.proTrialActivated && seller.proTrialExpiresAt && seller.proTrialExpiresAt > now
      const hasActivePro = hasActiveSub || hasActiveTrial
      const maxFeatured = hasActivePro ? 6 : 5

      // Count current featured designs
      const currentFeatured = await prisma.design.count({
        where: {
          designerId: session.user.id,
          featured: true
        }
      })

      if (currentFeatured >= maxFeatured) {
        return NextResponse.json(
          {
            message: `You have reached your featured listings limit (${maxFeatured}/${maxFeatured})${hasActivePro ? '' : '. Upgrade to Pro to get 6 featured slots.'}`,
            currentFeatured,
            maxFeatured
          },
          { status: 400 }
        )
      }
    }

    // Update featured status
    const updated = await prisma.design.update({
      where: { id: designId },
      data: { featured },
      select: {
        id: true,
        title: true,
        featured: true,
        imageUrl: true,
        price: true
      }
    })

    return NextResponse.json({
      message: featured ? 'Design added to featured' : 'Design removed from featured',
      design: updated
    })
  } catch (error) {
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp

    console.error('Error updating featured:', error)
    return NextResponse.json(
      { message: 'Failed to update featured status' },
      { status: 500 }
    )
  }
}
