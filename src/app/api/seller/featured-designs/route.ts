'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { getMaxFeaturedListings } from '@/lib/commission-tiers'
import {
  checkRateLimit,
  logAuditEntry,
  isItemAlreadyFeatured,
  validateItemForFeaturing,
  getIpAddress
} from '@/lib/featured-validation'

/**
 * GET /api/seller/featured-designs
 * Get seller's featured designs with subscription tier limit
 * Query params:
 *   - designId: Check if a specific design is featured (returns { isFeatured: boolean })
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const designId = searchParams.get('designId')

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // If checking if a design is featured
    if (designId) {
      const featured = await prisma.featuredDesign.findFirst({
        where: {
          designId,
          sellerId: session.user.id
        }
      })
      return NextResponse.json({ isFeatured: !!featured })
    }

    // Get seller's subscription tier
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, proTrialActivated: true, proTrialExpiresAt: true }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Check if seller has an active pro trial
    const now = new Date()
    const hasActiveTrial = seller.proTrialActivated && seller.proTrialExpiresAt && seller.proTrialExpiresAt > now
    
    // If user has active trial, they get PRO tier benefits
    const effectiveSubscriptionTier = hasActiveTrial ? 'PRO' : seller.subscriptionTier
    const maxFeatured = getMaxFeaturedListings(effectiveSubscriptionTier)

    // Use raw query to handle addedByAdmin field that might not exist in all docs
    let featuredDesigns: any[] = []
    try {
      const designs = await prisma.featuredDesign.findMany({
        where: { sellerId: session.user.id },
        select: {
          id: true,
          position: true,
          addedAt: true,
          addedByAdmin: true,
          design: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              thumbnailUrl: true,
              price: true,
              totalSales: true,
              totalRevenue: true,
            }
          }
        },
        orderBy: { position: 'asc' }
      })
      
      featuredDesigns = designs.map(d => ({
        ...d,
        addedByAdmin: d.addedByAdmin ?? false
      }))
    } catch (error) {
      // If the query fails due to missing field, try without it
      console.warn('[GET /api/seller/featured-designs] Retrying without addedByAdmin:', error)
      const designs = await prisma.featuredDesign.findMany({
        where: { sellerId: session.user.id },
        select: {
          id: true,
          position: true,
          addedAt: true,
          design: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              thumbnailUrl: true,
              price: true,
              totalSales: true,
              totalRevenue: true,
            }
          }
        },
        orderBy: { position: 'asc' }
      })
      
      featuredDesigns = designs.map((d: any) => ({
        ...d,
        addedByAdmin: false
      }))
    }

    // Get total available designs to feature
    const availableDesigns = await prisma.design.findMany({
      where: {
        designerId: session.user.id,
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
      },
      take: 100
    })

    return NextResponse.json({
      items: featuredDesigns.map(f => ({
        id: f.id,
        itemId: f.design.id,
        title: f.design.title,
        imageUrl: f.design.imageUrl || f.design.thumbnailUrl,
        price: f.design.price,
        totalSales: f.design.totalSales,
        position: f.position,
        addedAt: f.addedAt.toISOString(),
        addedByAdmin: f.addedByAdmin ?? false
      })),
      availableDesigns,
      currentFeaturedCount: featuredDesigns.length,
      subscriptionTier: seller.subscriptionTier,
      proTrialActive: hasActiveTrial,
      proTrialExpiresAt: seller.proTrialExpiresAt ? seller.proTrialExpiresAt.toISOString() : null,
      maxFeatured,
      remainingSlots: Math.max(0, maxFeatured - featuredDesigns.length)
    })
  } catch (error) {
    console.error('[GET /api/seller/featured-designs] Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch featured designs')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to fetch featured designs', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

/**
 * POST /api/seller/featured-designs
 * Add a design to featured (max 6)
 * 
 * Body: {
 *   designId: string,
 *   position?: number (1-6)
 * }
 */
export async function POST(request: NextRequest) {
  const ipAddress = getIpAddress(request)
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check rate limit
    const rateLimit = checkRateLimit(session.user.id, 'featured-designs', 'POST')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please wait before trying again.',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimit.resetTime
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { designId, position } = body

    if (!designId) {
      return NextResponse.json(
        { error: 'Design ID is required' },
        { status: 400 }
      )
    }

    // Verify design belongs to seller and is approved
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: { designerId: true, approvalStatus: true, isActive: true }
    })

    if (!design) {
      logAuditEntry({
        userId: session.user.id,
        action: 'FEATURED_ADDED',
        itemType: 'DESIGN',
        itemId: designId,
        timestamp: new Date(),
        ipAddress,
        success: false,
        errorCode: 'DESIGN_NOT_FOUND'
      })
      return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const isAdmin = user?.role === 'ADMIN'

    // Only allow if user is the designer OR is an admin
    if (!isAdmin && design.designerId !== session.user.id) {
      logAuditEntry({
        userId: session.user.id,
        action: 'FEATURED_ADDED',
        itemType: 'DESIGN',
        itemId: designId,
        timestamp: new Date(),
        ipAddress,
        success: false,
        errorCode: 'UNAUTHORIZED'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (design.approvalStatus !== 'APPROVED' || !design.isActive) {
      logAuditEntry({
        userId: session.user.id,
        action: 'FEATURED_ADDED',
        itemType: 'DESIGN',
        itemId: designId,
        timestamp: new Date(),
        ipAddress,
        success: false,
        errorCode: 'DESIGN_NOT_APPROVED'
      })
      return NextResponse.json(
        { error: 'Design must be active and approved to feature' },
        { status: 400 }
      )
    }

    // Get the seller (either the designer or if admin, the designer of this design)
    const sellerId = isAdmin ? design.designerId : session.user.id

    // Check current featured count and verify subscription tier
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { subscriptionTier: true, proTrialActivated: true, proTrialExpiresAt: true }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Check if seller has an active pro trial
    const now = new Date()
    const hasActiveTrial = seller.proTrialActivated && seller.proTrialExpiresAt && seller.proTrialExpiresAt > now
    
    // Ensure subscriptionTier is properly handled (null, undefined, empty string -> treat as no subscription)
    let normalizedTier: string | null = seller.subscriptionTier ?? null
    if (normalizedTier === '' || normalizedTier === 'null') {
      normalizedTier = null
    }
    
    // If user has active trial, they get PRO tier benefits
    const effectiveSubscriptionTier = hasActiveTrial ? 'PRO' : normalizedTier
    const maxFeatured = getMaxFeaturedListings(effectiveSubscriptionTier)

    console.log('[POST /api/seller/featured-designs] Subscription check:', {
      userId: session.user.id,
      sellerId,
      subscriptionTier: seller.subscriptionTier,
      subscriptionTierType: typeof seller.subscriptionTier,
      subscriptionTierLength: typeof seller.subscriptionTier === 'string' ? seller.subscriptionTier.length : 'N/A',
      normalizedTier,
      hasActiveTrial,
      effectiveSubscriptionTier,
      maxFeatured,
      isAdmin
    })

    // Check if seller is allowed to feature at all (admins can bypass)
    // Be explicit: if maxFeatured is 0 AND they're not admin, BLOCK them
    if (!isAdmin && (maxFeatured === 0 || !normalizedTier)) {
      console.warn('[POST /api/seller/featured-designs] BLOCKED - No subscription tier or max is 0', {
        userId: session.user.id,
        sellerId,
        tier: seller.subscriptionTier,
        normalizedTier,
        maxFeatured,
        isAdmin
      })
      return NextResponse.json(
        { 
          error: 'Your subscription is not active. Featured listings are only available with an active subscription.',
          errorCode: 'NO_FEATURED_ACCESS',
          currentTier: normalizedTier || 'FREE',
          maxAllowed: maxFeatured,
          requiredTier: 'STARTER',
          upgradeMessage: 'Upgrade to STARTER (2 featured), PRO (6 featured), or VIP (10 featured) to feature designs'
        },
        { status: 403 }
      )
    }

    const currentFeaturedDesigns = await prisma.featuredDesign.count({
      where: { sellerId }
    })

    const currentFeaturedBoutique = await prisma.featuredBoutiqueProduct.count({
      where: { sellerId }
    })

    const totalFeatured = currentFeaturedDesigns + currentFeaturedBoutique

    if (!isAdmin && totalFeatured >= maxFeatured) {
      return NextResponse.json(
        { 
          error: `You have reached your featured items limit (${totalFeatured}/${maxFeatured}).`,
          errorCode: 'TIER_LIMIT_REACHED',
          currentTier: seller.subscriptionTier,
          current: totalFeatured,
          max: maxFeatured,
          upgradeMessage: 'Upgrade to a higher tier to feature more items'
        },
        { status: 409 }
      )
    }

    // Check if already featured (prevent duplicates)
    const existing = await isItemAlreadyFeatured(designId, 'DESIGN', session.user.id, prisma)
    if (existing) {
      logAuditEntry({
        userId: session.user.id,
        action: 'FEATURED_ADDED',
        itemType: 'DESIGN',
        itemId: designId,
        timestamp: new Date(),
        ipAddress,
        success: false,
        errorCode: 'ALREADY_FEATURED'
      })
      return NextResponse.json(
        { error: 'This design is already featured' },
        { status: 409 }
      )
    }

    // Create featured design
    const nextPosition = position || (totalFeatured + 1)

    const featured = await prisma.featuredDesign.create({
      data: {
        designId,
        sellerId,
        position: nextPosition,
        addedByAdmin: isAdmin
      },
      include: {
        design: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            price: true,
          }
        }
      }
    })

    // Log successful audit entry
    logAuditEntry({
      userId: session.user.id,
      action: 'FEATURED_ADDED',
      itemType: 'DESIGN',
      itemId: designId,
      timestamp: new Date(),
      ipAddress,
      success: true
    })

    return NextResponse.json({
      success: true,
      featured: {
        ...featured,
        addedAt: featured.addedAt.toISOString()
      },
      message: 'Design added to featured'
    })
  } catch (error) {
    console.error('[POST /api/seller/featured-designs]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to add featured design')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to add featured design' }, { status: 500 })
  }
}

/**
 * DELETE /api/seller/featured-designs?id=<featuredId> OR ?designId=<designId>
 * Remove a design from featured
 * Accepts either featured record ID or design ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Extract ID from query parameter
    const { searchParams } = new URL(request.url)
    const featuredId = searchParams.get('id')
    const designId = searchParams.get('designId')

    if (!featuredId && !designId) {
      return NextResponse.json(
        { error: 'Featured design ID or design ID is required' },
        { status: 400 }
      )
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const isAdmin = user?.role === 'ADMIN'

    // If designId provided, find the featured record first
    let idToDelete = featuredId
    if (designId) {
      const featured = await prisma.featuredDesign.findUnique({
        where: { sellerId_designId: { sellerId: session.user.id, designId } },
        select: { id: true }
      })
      if (!featured && !isAdmin) {
        return NextResponse.json({ error: 'Featured design not found' }, { status: 404 })
      }
      if (featured) {
        idToDelete = featured.id
      } else if (isAdmin) {
        // For admins, find the featured design regardless of seller
        const adminFeatured = await prisma.featuredDesign.findFirst({
          where: { designId },
          select: { id: true }
        })
        if (!adminFeatured) {
          return NextResponse.json({ error: 'Featured design not found' }, { status: 404 })
        }
        idToDelete = adminFeatured.id
      }
    }

    if (!idToDelete) {
      return NextResponse.json(
        { error: 'Invalid featured design ID' },
        { status: 400 }
      )
    }

    // Verify ownership (or admin status)
    const featured = await prisma.featuredDesign.findUnique({
      where: { id: idToDelete }
    })

    if (!featured) {
      return NextResponse.json({ error: 'Featured design not found' }, { status: 404 })
    }

    if (!isAdmin && featured.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete featured design
    await prisma.featuredDesign.delete({
      where: { id: idToDelete }
    })

    // Log successful audit entry
    logAuditEntry({
      userId: session.user.id,
      action: 'FEATURED_REMOVED',
      itemType: 'DESIGN',
      itemId: featured.designId,
      timestamp: new Date(),
      ipAddress: getIpAddress(request),
      success: true
    })

    return NextResponse.json({
      success: true,
      message: 'Design removed from featured'
    })
  } catch (error) {
    console.error('[DELETE /api/seller/featured-designs]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to remove featured design')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to remove featured design' }, { status: 500 })
  }
}

/**
 * PATCH /api/seller/featured-designs?id=<featuredId>&position=<newPosition>
 * Update position of a featured design
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const featuredId = searchParams.get('id')
    const positionStr = searchParams.get('position')

    if (!featuredId || !positionStr) {
      return NextResponse.json(
        { error: 'Missing id or position parameter' },
        { status: 400 }
      )
    }

    const newPosition = parseInt(positionStr, 10)
    if (isNaN(newPosition) || newPosition < 1) {
      return NextResponse.json(
        { error: 'Position must be a positive integer' },
        { status: 400 }
      )
    }

    // Verify ownership
    const featured = await prisma.featuredDesign.findUnique({
      where: { id: featuredId },
      select: { sellerId: true }
    })

    if (!featured) {
      return NextResponse.json({ error: 'Featured design not found' }, { status: 404 })
    }

    if (featured.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update position
    await prisma.featuredDesign.update({
      where: { id: featuredId },
      data: { position: newPosition }
    })

    return NextResponse.json({
      success: true,
      message: 'Position updated'
    })
  } catch (error) {
    console.error('[PATCH /api/seller/featured-designs]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to update position')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
  }
}
