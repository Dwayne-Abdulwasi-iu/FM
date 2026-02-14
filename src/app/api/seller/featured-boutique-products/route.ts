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
  getIpAddress
} from '@/lib/featured-validation'

/**
 * GET /api/seller/featured-boutique-products
 * Get seller's featured boutique products with subscription tier limit
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get seller's subscription tier and trial status
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

    // Use fallback query to handle addedByAdmin field that might not exist in all docs
    let featuredProducts: Array<{
      id: string;
      position: number;
      addedAt: Date;
      addedByAdmin: boolean;
      product: {
        id: string;
        title: string;
        slug: string;
        thumbnailUrl: string | null;
        basePrice: number;
        salePrice: number | null;
        currency: string;
        status: string;
      };
    }> = []
    try {
      const products = await prisma.featuredBoutiqueProduct.findMany({
        where: { sellerId: session.user.id },
        select: {
          id: true,
          position: true,
          addedAt: true,
          addedByAdmin: true,
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailUrl: true,
              basePrice: true,
              salePrice: true,
              currency: true,
              status: true,
            }
          }
        },
        orderBy: { position: 'asc' }
      })
      
      featuredProducts = products.map(p => ({
        ...p,
        addedByAdmin: p.addedByAdmin ?? false
      }))
    } catch (error) {
      // If the query fails due to missing field, try without it
      console.warn('[GET /api/seller/featured-boutique-products] Retrying without addedByAdmin:', error)
      const products = await prisma.featuredBoutiqueProduct.findMany({
        where: { sellerId: session.user.id },
        select: {
          id: true,
          position: true,
          addedAt: true,
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailUrl: true,
              basePrice: true,
              salePrice: true,
              currency: true,
              status: true,
            }
          }
        },
        orderBy: { position: 'asc' }
      })
      
      featuredProducts = products.map((p) => ({
        ...p,
        addedByAdmin: false
      }))
    }

    // Get available boutique products to feature (LIVE only)
    const availableProducts = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId: session.user.id,
        status: 'LIVE'
      },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnailUrl: true,
        basePrice: true,
        salePrice: true,
        currency: true,
      },
      take: 100
    })

    return NextResponse.json({
      items: featuredProducts.map(f => ({
        id: f.id,
        itemId: f.product.id,
        title: f.product.title,
        imageUrl: f.product.thumbnailUrl,
        price: f.product.salePrice || f.product.basePrice,
        position: f.position,
        addedAt: f.addedAt.toISOString(),
        addedByAdmin: f.addedByAdmin ?? false
      })),
      availableProducts,
      currentFeaturedCount: featuredProducts.length,
      subscriptionTier: seller.subscriptionTier,
      proTrialActive: hasActiveTrial,
      proTrialExpiresAt: seller.proTrialExpiresAt ? seller.proTrialExpiresAt.toISOString() : null,
      maxFeatured,
      remainingSlots: Math.max(0, maxFeatured - featuredProducts.length)
    })
  } catch (error) {
    console.error('[GET /api/seller/featured-boutique-products] Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch featured boutique products')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to fetch featured boutique products', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

/**
 * POST /api/seller/featured-boutique-products
 * Add a boutique product to featured (max 6)
 * 
 * Body: {
 *   productId: string,
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
    const rateLimit = checkRateLimit(session.user.id, 'featured-boutique-products', 'POST')
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
    const { productId, position } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const isAdmin = user?.role === 'ADMIN'

    // Verify product exists and (belongs to seller OR user is admin)
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: { sellerId: true, status: true }
    })

    if (!product) {
      logAuditEntry({
        userId: session.user.id,
        action: 'FEATURED_ADDED',
        itemType: 'BOUTIQUE_PRODUCT',
        itemId: productId,
        timestamp: new Date(),
        ipAddress,
        success: false,
        errorCode: 'PRODUCT_NOT_FOUND'
      })
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Only allow if user is the seller OR is an admin
    if (!isAdmin && product.sellerId !== session.user.id) {
      logAuditEntry({
        userId: session.user.id,
        action: 'FEATURED_ADDED',
        itemType: 'BOUTIQUE_PRODUCT',
        itemId: productId,
        timestamp: new Date(),
        ipAddress,
        success: false,
        errorCode: 'UNAUTHORIZED'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (product.status !== 'LIVE') {
      logAuditEntry({
        userId: session.user.id,
        action: 'FEATURED_ADDED',
        itemType: 'BOUTIQUE_PRODUCT',
        itemId: productId,
        timestamp: new Date(),
        ipAddress,
        success: false,
        errorCode: 'PRODUCT_NOT_LIVE'
      })
      return NextResponse.json(
        { error: 'Product must be live to feature' },
        { status: 400 }
      )
    }

    // Get the seller (either the user or if admin, the product owner)
    const sellerId = isAdmin ? product.sellerId : session.user.id

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

    // Check if seller is allowed to feature at all
    // Be explicit: if maxFeatured is 0 AND they're not admin, BLOCK them
    if (!isAdmin && (maxFeatured === 0 || !normalizedTier)) {
      return NextResponse.json(
        { 
          error: 'Your subscription is not active. Featured listings are only available with an active subscription.',
          errorCode: 'NO_FEATURED_ACCESS',
          currentTier: normalizedTier || 'FREE',
          maxAllowed: maxFeatured,
          requiredTier: 'STARTER',
          upgradeMessage: 'Upgrade to STARTER (2 featured), PRO (6 featured), or VIP (10 featured) to feature products'
        },
        { status: 403 }
      )
    }

    const currentFeaturedBoutique = await prisma.featuredBoutiqueProduct.count({
      where: { sellerId }
    })

    const currentFeaturedDesigns = await prisma.featuredDesign.count({
      where: { sellerId }
    })

    const totalFeatured = currentFeaturedBoutique + currentFeaturedDesigns

    if (totalFeatured >= maxFeatured) {
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

    // Create featured product
    const nextPosition = position || (totalFeatured + 1)

    const featured = await prisma.featuredBoutiqueProduct.create({
      data: {
        productId,
        sellerId,
        position: nextPosition,
        addedByAdmin: isAdmin
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            basePrice: true,
            salePrice: true,
            currency: true,
          }
        }
      }
    })

    // Log successful audit entry
    logAuditEntry({
      userId: session.user.id,
      action: 'FEATURED_ADDED',
      itemType: 'BOUTIQUE_PRODUCT',
      itemId: productId,
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
      message: 'Product added to featured'
    })
  } catch (error) {
    console.error('[POST /api/seller/featured-boutique-products]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to add featured product')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to add featured product' }, { status: 500 })
  }
}

/**
 * DELETE /api/seller/featured-boutique-products?id=<featuredId> OR ?productId=<productId>
 * Remove a product from featured
 * Accepts either featured record ID or product ID
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
    const productId = searchParams.get('productId')

    if (!featuredId && !productId) {
      return NextResponse.json(
        { error: 'Featured product ID or product ID is required' },
        { status: 400 }
      )
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const isAdmin = user?.role === 'ADMIN'

    // If productId provided, find the featured record first
    let idToDelete = featuredId
    if (productId) {
      const featured = await prisma.featuredBoutiqueProduct.findUnique({
        where: { sellerId_productId: { sellerId: session.user.id, productId } },
        select: { id: true }
      })
      if (!featured && !isAdmin) {
        return NextResponse.json({ error: 'Featured product not found' }, { status: 404 })
      }
      if (featured) {
        idToDelete = featured.id
      } else if (isAdmin) {
        // For admins, find the featured product regardless of seller
        const adminFeatured = await prisma.featuredBoutiqueProduct.findFirst({
          where: { productId },
          select: { id: true }
        })
        if (!adminFeatured) {
          return NextResponse.json({ error: 'Featured product not found' }, { status: 404 })
        }
        idToDelete = adminFeatured.id
      }
    }

    if (!idToDelete) {
      return NextResponse.json(
        { error: 'Invalid featured product ID' },
        { status: 400 }
      )
    }

    // Verify ownership (or admin status)
    const featured = await prisma.featuredBoutiqueProduct.findUnique({
      where: { id: idToDelete }
    })

    if (!featured) {
      return NextResponse.json({ error: 'Featured product not found' }, { status: 404 })
    }

    if (!isAdmin && featured.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete featured product
    await prisma.featuredBoutiqueProduct.delete({
      where: { id: idToDelete }
    })

    // Log successful audit entry
    logAuditEntry({
      userId: session.user.id,
      action: 'FEATURED_REMOVED',
      itemType: 'BOUTIQUE_PRODUCT',
      itemId: featured.productId,
      timestamp: new Date(),
      ipAddress: getIpAddress(request),
      success: true
    })

    return NextResponse.json({
      success: true,
      message: 'Product removed from featured'
    })
  } catch (error) {
    console.error('[DELETE /api/seller/featured-boutique-products]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to remove featured product')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to remove featured product' }, { status: 500 })
  }
}

/**
 * PATCH /api/seller/featured-boutique-products?id=<featuredId>&position=<newPosition>
 * Update position of a featured boutique product
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
    const featured = await prisma.featuredBoutiqueProduct.findUnique({
      where: { id: featuredId },
      select: { sellerId: true }
    })

    if (!featured) {
      return NextResponse.json({ error: 'Featured product not found' }, { status: 404 })
    }

    if (featured.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update position
    await prisma.featuredBoutiqueProduct.update({
      where: { id: featuredId },
      data: { position: newPosition }
    })

    return NextResponse.json({
      success: true,
      message: 'Position updated'
    })
  } catch (error) {
    console.error('[PATCH /api/seller/featured-boutique-products]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to update position')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
  }
}
