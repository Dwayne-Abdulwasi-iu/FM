import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getDaysInWarehouse, getCurrentCycleInfo, isInMonth5, canRepost } from '@/lib/boutique/warehouse'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const products = await prisma.boutiqueProduct.findMany({
      where: {
        sellerId: session.user.id,
        fulfillmentMethod: 'ADMIN_STOCK',
        receivedByAdminAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        basePrice: true,
        thumbnailUrl: true,
        receivedByAdminAt: true,
        currentStock: true,
        status: true,
      },
      orderBy: { receivedByAdminAt: 'desc' },
    })

    const pendingReposts = await prisma.boutiqueRepostRequest.findMany({
      where: {
        productId: { in: products.map(p => p.id) },
        status: 'PENDING'
      },
      select: {
        id: true,
        productId: true,
        requestedStock: true,
        reason: true,
        createdAt: true,
        daysInWarehouse: true,
        originalStock: true,
        notes: true
      }
    })

    // Create lookup map for O(1) access (no DB queries)
    const repostMap = new Map(pendingReposts.map(r => [r.productId, r]))

    // Enrich products with warehouse info (no DB queries)
    const enrichedProducts = products.map(product => {
      // Ensure receivedByAdminAt is a Date
      const receivedDate = product.receivedByAdminAt ? new Date(product.receivedByAdminAt) : null;
      const daysInWarehouse = getDaysInWarehouse(receivedDate);
      const cycleInfo = getCurrentCycleInfo(daysInWarehouse);
      const inMonth5 = isInMonth5(daysInWarehouse);
      const repostCheck = canRepost(daysInWarehouse);
      const pendingRepost = repostMap.get(product.id);

      // Debug log for each product
      console.log('[DEBUG] Product:', {
        id: product.id,
        title: product.title,
        receivedByAdminAt: product.receivedByAdminAt,
        receivedDate,
        daysInWarehouse,
        inMonth5,
        canRepost: repostCheck.can,
        cycleInfo
      });

      return {
        id: product.id,
        title: product.title,
        basePrice: product.basePrice,
        currentStock: product.currentStock || 0,
        thumbnailUrl: product.thumbnailUrl,
        receivedByAdminAt: product.receivedByAdminAt,
        status: product.status,
        daysInWarehouse,
        inMonth5,
        canRepost: repostCheck.can,
        repostReason: repostCheck.reason,
        cycleInfo,
        pendingRepost: pendingRepost ? {
          id: pendingRepost.id,
          units: pendingRepost.requestedStock,
          reason: pendingRepost.reason,
          originalStock: pendingRepost.originalStock,
          notes: pendingRepost.notes,
          createdAt: pendingRepost.createdAt.toISOString()
        } : null
      }
    })

    return NextResponse.json({
      success: true,
      products: enrichedProducts,
      count: enrichedProducts.length,
    })
  } catch (error) {
    console.error('Error fetching warehouse products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch warehouse products' },
      { status: 500 }
    )
  }
}
