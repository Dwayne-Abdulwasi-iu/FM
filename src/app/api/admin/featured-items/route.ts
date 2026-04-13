import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * GET /api/admin/featured-items
 * Get all featured items (both designs and boutique products) - admin only
 * 
 * Query params:
 * - itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT' (filter)
 * - search: search by seller name/email or item title
 * - sort: 'addedAt' | 'position' (default: addedAt)
 * - page: pagination (default 1)
 * - limit: items per page (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get('itemType')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'addedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const priceSort = searchParams.get('priceSort') || ''
    const ownership = searchParams.get('ownership') || ''
    const addedByAdmin = searchParams.get('addedByAdmin') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    // Get featured designs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let designFeatures: any[] = []
    let designCount = 0

    // Get featured boutique products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let boutiqueFeatures: any[] = []
    let boutiqueCount = 0

    // Get admin featured items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let adminFeatures: any[] = []
    let adminCount = 0

    if (!itemType || itemType === 'DESIGN') {
      const designs = await prisma.featuredDesign.findMany({
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              displayName: true,
              subscriptionTier: true,
              totalEarnings: true,
              createdAt: true
            }
          },
          design: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              price: true,
              totalSales: true,
              totalRevenue: true,
              createdAt: true
            }
          }
        },
        orderBy: sort === 'position' ? { position: 'asc' } : { addedAt: 'desc' }
      })

      // Client-side search filtering for designs
      const filtered = designs
        .filter(f => {
          if (!search) return true
          const searchLower = search.toLowerCase()
          return (
            f.design.title.toLowerCase().includes(searchLower) ||
            (f.seller.email && f.seller.email.toLowerCase().includes(searchLower)) ||
            (f.seller.name && f.seller.name.toLowerCase().includes(searchLower))
          )
        })
      
      designCount = filtered.length

      designFeatures = filtered
        .slice(itemType ? skip : 0, itemType ? skip + limit : undefined)
        .map(f => ({
          id: f.id,
          itemType: 'DESIGN',
          itemId: f.design.id,
          title: f.design.title,
          imageUrl: f.design.imageUrl,
          price: f.design.price,
          totalSales: f.design.totalSales,
          totalRevenue: f.design.totalRevenue,
          seller: {
            ...f.seller,
            createdAt: f.seller.createdAt.toISOString()
          },
          position: f.position,
          addedAt: f.addedAt.toISOString(),
          addedByAdmin: f.addedByAdmin ?? false,
          itemCreatedAt: f.design.createdAt.toISOString()
        }))
    }

    if (!itemType || itemType === 'BOUTIQUE_PRODUCT') {
      const boutiques = await prisma.featuredBoutiqueProduct.findMany({
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              displayName: true,
              subscriptionTier: true,
              totalEarnings: true,
              createdAt: true
            }
          },
          product: {
            select: {
              id: true,
              slug: true,
              title: true,
              thumbnailUrl: true,
              basePrice: true,
              salePrice: true,
              status: true,
              createdAt: true
            }
          }
        },
        orderBy: sort === 'position' ? { position: 'asc' } : { addedAt: 'desc' }
      })

      // Client-side search filtering for boutique products
      const filtered = boutiques
        .filter(f => {
          if (!search) return true
          const searchLower = search.toLowerCase()
          return (
            f.product.title.toLowerCase().includes(searchLower) ||
            (f.seller.email && f.seller.email.toLowerCase().includes(searchLower)) ||
            (f.seller.name && f.seller.name.toLowerCase().includes(searchLower))
          )
        })
      
      boutiqueCount = filtered.length

      boutiqueFeatures = filtered
        .slice(!itemType ? 0 : skip, !itemType ? undefined : skip + limit)
        .map(f => ({
          id: f.id,
          itemType: 'BOUTIQUE_PRODUCT',
          itemId: f.product.id,
          slug: f.product.slug,
          title: f.product.title,
          imageUrl: f.product.thumbnailUrl,
          price: f.product.salePrice || f.product.basePrice,
          status: f.product.status,
          seller: {
            ...f.seller,
            createdAt: f.seller.createdAt.toISOString()
          },
          position: f.position,
          addedAt: f.addedAt.toISOString(),
          addedByAdmin: f.addedByAdmin ?? false,
          itemCreatedAt: f.product.createdAt.toISOString()
        }))
    }

    if (!itemType || itemType === 'DESIGN' || itemType === 'BOUTIQUE_PRODUCT') {
      const adminItems = await prisma.adminFeaturedItem.findMany({
        orderBy: { addedAt: 'desc' }
      })

      // OPTIMIZATION: Batch fetch designs and products in one query each (eliminates N+1)
      const designIds = adminItems.filter(i => i.itemType === 'DESIGN').map(i => i.itemId)
      const productIds = adminItems.filter(i => i.itemType === 'BOUTIQUE_PRODUCT').map(i => i.itemId)

      // Fetch all designs at once
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const designsByIdMap = new Map<string, any>()
      if (designIds.length > 0) {
        const designs = await prisma.design.findMany({
          where: { id: { in: designIds } },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            price: true,
            createdAt: true,
            designerId: true,
            designer: { select: { id: true, name: true, email: true } }
          }
        })
        designs.forEach(d => designsByIdMap.set(d.id, d))
      }

      // Fetch all products at once
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productsByIdMap = new Map<string, any>()
      if (productIds.length > 0) {
        const products = await prisma.boutiqueProduct.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            slug: true,
            title: true,
            thumbnailUrl: true,
            basePrice: true,
            salePrice: true,
            status: true,
            createdAt: true,
            sellerId: true,
            seller: { select: { id: true, name: true, email: true } }
          }
        })
        products.forEach(p => productsByIdMap.set(p.id, p))
      }

      // Map admin items to their details
      const adminWithDetails = adminItems
        .map(item => {
          if (item.itemType === 'DESIGN') {
            const design = designsByIdMap.get(item.itemId)
            if (design) {
              return {
                id: item.id,
                itemType: 'DESIGN',
                itemId: design.id,
                title: design.title,
                imageUrl: design.imageUrl,
                price: design.price,
                seller: {
                  id: design.designer.id,
                  name: design.designer.name,
                  email: design.designer.email
                },
                position: 0,
                addedAt: item.addedAt.toISOString(),
                addedByAdmin: true,
                itemCreatedAt: design.createdAt.toISOString()
              }
            }
          } else if (item.itemType === 'BOUTIQUE_PRODUCT') {
            const product = productsByIdMap.get(item.itemId)
            if (product) {
              return {
                id: item.id,
                itemType: 'BOUTIQUE_PRODUCT',
                itemId: product.id,
                slug: product.slug,
                title: product.title,
                imageUrl: product.thumbnailUrl,
                price: product.salePrice || product.basePrice,
                status: product.status,
                seller: {
                  id: product.seller.id,
                  name: product.seller.name,
                  email: product.seller.email
                },
                position: 0,
                addedAt: item.addedAt.toISOString(),
                addedByAdmin: true,
                itemCreatedAt: product.createdAt.toISOString()
              }
            }
          }
          return null
        })
        .filter((item): item is any => item !== null)

      adminFeatures = adminWithDetails
      if (itemType) {
        adminFeatures = adminFeatures.filter(f => f.itemType === itemType)
      }
      adminCount = adminFeatures.length
    }

    // Combine and sort
    let allFeatures = [...designFeatures, ...boutiqueFeatures, ...adminFeatures]
    
    // Apply ownership filter
    if (ownership) {
      allFeatures = allFeatures.filter(f => f.itemType === ownership)
    }

    // Apply addedByAdmin filter
    if (addedByAdmin) {
      const isAdminOnly = addedByAdmin === 'admin'
      allFeatures = allFeatures.filter(f => f.addedByAdmin === isAdminOnly)
    }

    // Sort by selected criteria
    allFeatures.sort((a, b) => {
      let compareValue = 0

      if (priceSort === 'highest') {
        compareValue = b.price - a.price
      } else if (priceSort === 'lowest') {
        compareValue = a.price - b.price
      } else if (sort === 'position') {
        compareValue = a.position - b.position
      } else if (sort === 'sales') {
        compareValue = (b.totalSales || 0) - (a.totalSales || 0)
      } else {
        // Default: sort by date published
        compareValue = new Date(b.itemCreatedAt).getTime() - new Date(a.itemCreatedAt).getTime()
      }

      // Apply sort order
      return sortOrder === 'asc' ? -compareValue : compareValue
    })

    const totalCount = designCount + boutiqueCount + adminCount
    const totalPages = Math.ceil(totalCount / limit)
    const pageItems = allFeatures.slice((itemType ? 0 : (page - 1) * limit), (itemType ? undefined : page * limit))

    return NextResponse.json({
      items: pageItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages,
        hasMore: page < totalPages
      },
      filters: {
        itemType,
        search,
        sort
      }
    })
  } catch (error) {
    console.error('[GET /api/admin/featured-items]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch featured items')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to fetch featured items' }, { status: 500 })
  }
}

/**
 * POST /api/admin/featured-items
 * Admin add item to featured (no limit)
 * 
 * Body: {
 *   itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT',
 *   itemId: string,
 *   position?: number,
 *   reason?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { itemType, itemId, position = 0, reason } = body
    console.log('[POST /api/admin/featured-items] Body received:', { itemType, itemId, position, reason })

    if (!itemType || !itemId) {
      return NextResponse.json({ error: 'itemType and itemId required' }, { status: 400 })
    }

    if (!['DESIGN', 'BOUTIQUE_PRODUCT'].includes(itemType)) {
      return NextResponse.json({ error: 'Invalid itemType' }, { status: 400 })
    }

    // Verify item exists
    if (itemType === 'DESIGN') {
      const design = await prisma.design.findUnique({ where: { id: itemId } })
      if (!design) {
        return NextResponse.json({ error: 'Design not found' }, { status: 404 })
      }
    } else {
      const product = await prisma.boutiqueProduct.findUnique({ where: { id: itemId } })
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
    }

    // Create admin featured item
    const featured = await prisma.adminFeaturedItem.create({
      data: {
        itemType,
        itemId,
        position,
        reason,
        addedBy: session.user.id
      }
    })

    console.log('[POST /api/admin/featured-items] Successfully created:', featured.id)
    return NextResponse.json({
      success: true,
      featured,
      message: `${itemType === 'DESIGN' ? 'Design' : 'Product'} added to featured`
    }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Item already featured' }, { status: 409 })
    }
    console.error('[POST /api/admin/featured-items]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to add featured item')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to add featured item' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/featured-items/:id
 * Admin remove item from featured
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const itemType = searchParams.get('itemType')
    const source = searchParams.get('source')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    if (!itemType) {
      return NextResponse.json({ error: 'Item type required' }, { status: 400 })
    }

    // Delete from the appropriate table based on source
    if (source === 'ADMIN_FEATURED') {
      await prisma.adminFeaturedItem.delete({
        where: { id }
      })
    } else if (itemType === 'DESIGN') {
      await prisma.featuredDesign.delete({
        where: { id }
      })
    } else if (itemType === 'BOUTIQUE_PRODUCT') {
      await prisma.featuredBoutiqueProduct.delete({
        where: { id }
      })
    } else {
      return NextResponse.json({ error: 'Invalid item type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Item removed from featured' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Featured item not found' }, { status: 404 })
    }
    console.error('[DELETE /api/admin/featured-items]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to remove featured item')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to remove featured item' }, { status: 500 })
  }
}
