import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * GET /api/featured-items
 * Get admin-featured items (public endpoint - no auth required)
 * 
 * Query params:
 * - itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT' (optional filter)
 * - limit: items per page (default 10, max 50)
 * - page: pagination (default 1)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get('itemType')
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}
    if (itemType && ['DESIGN', 'BOUTIQUE_PRODUCT'].includes(itemType)) {
      where.itemType = itemType
    }

    // Fetch admin featured items
    const items = await prisma.adminFeaturedItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { position: 'asc' }
    })

    const total = await prisma.adminFeaturedItem.count({ where })

    // Transform response based on item type
    const transformedItems = await Promise.all(items.map(async (item) => {
      if (item.itemType === 'DESIGN') {
        const design = await prisma.design.findUnique({
          where: { id: item.itemId },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            price: true,
            category: true,
            totalSales: true,
            totalRevenue: true,
            designerId: true,
            designer: {
              select: {
                id: true,
                name: true,
                displayName: true,
                email: true,
                image: true,
                designerTier: true
              }
            }
          }
        })

        if (!design) return null

        return {
          id: item.id,
          itemId: design.id,
          itemType: 'DESIGN',
          title: design.title,
          imageUrl: design.imageUrl,
          price: design.price,
          category: design.category,
          totalSales: design.totalSales,
          totalRevenue: design.totalRevenue,
          position: item.position,
          addedAt: item.addedAt.toISOString(),
          seller: {
            id: design.designerId,
            name: design.designer?.displayName || design.designer?.name,
            email: design.designer?.email,
            image: design.designer?.image,
            designerTier: design.designer?.designerTier
          }
        }
      } else if (item.itemType === 'BOUTIQUE_PRODUCT') {
        const product = await prisma.boutiqueProduct.findUnique({
          where: { id: item.itemId },
          select: {
            id: true,
            slug: true,
            title: true,
            thumbnailUrl: true,
            basePrice: true,
            category: {
              select: { name: true }
            },
            status: true,
            sellerId: true,
            seller: {
              select: {
                id: true,
                name: true,
                displayName: true,
                email: true,
                image: true
              }
            }
          }
        })

        if (!product || product.status !== 'LIVE') return null

        return {
          id: item.id,
          itemId: product.id,
          itemType: 'BOUTIQUE_PRODUCT',
          title: product.title,
          slug: product.slug,
          imageUrl: product.thumbnailUrl,
          price: product.basePrice,
          basePrice: product.basePrice,
          category: product.category.name,
          position: item.position,
          addedAt: item.addedAt.toISOString(),
          seller: {
            id: product.sellerId,
            name: product.seller?.displayName || product.seller?.name,
            email: product.seller?.email,
            image: product.seller?.image
          }
        }
      }
      return null
    }))

    // Filter out null results
    const validItems = transformedItems.filter(Boolean)

    return NextResponse.json({
      items: validItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[GET /api/featured-items]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch featured items')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to fetch featured items' }, { status: 500 })
  }
}
