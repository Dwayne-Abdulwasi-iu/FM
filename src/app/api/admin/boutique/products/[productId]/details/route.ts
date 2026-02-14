import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { productId } = await params

    // Fetch product details
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        basePrice: true,
        salePrice: true,
        brand: true,
        material: true,
        careInstructions: true,
        condition: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        sellerId: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            displayName: true
          }
        },
        category: {
          select: { id: true, name: true }
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
            sortOrder: true
          },
          orderBy: { sortOrder: 'asc' }
        },
        variants: {
          select: {
            id: true,
            size: true,
            color: true,
            quantity: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Get per-variant order counts in single aggregation query
    // Only count orders placed while product was LIVE
    const variantOrderCountsResult = await prisma.boutiqueOrderItem.groupBy({
      by: ['variantId'],
      where: {
        productId: product.id,
        order: {
          product: {
            status: 'LIVE'
          }
        }
      },
      _count: { _all: true }
    })

    // Create a map of variantId to orderCount
    const orderCountMap = new Map(
      variantOrderCountsResult.map((item) => [item.variantId, item._count._all])
    )

    // Enrich variants with order counts
    const enrichedVariants = product.variants.map((variant) => {
      const orderCount = orderCountMap.get(variant.id) || 0
      return {
        ...variant,
        orderCount
      }
    })

    // Fetch shipment info if product is in return
    let shipment = null
    if (['IN_RETURN', 'RETURN_REQUESTED', 'RETURN_SHIPPED', 'RETURNED_TO_SELLER'].includes(product.status)) {
      shipment = await prisma.sellerToAdminShipment.findFirst({
        where: {
          sellerId: product.sellerId,
          productIds: { has: product.id }
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          adminNotes: true,
          shippedAt: true,
          deliveredAt: true,
          receiptVerifiedAt: true,
          trackingNumber: true,
          carrier: true,
          itemsExpected: true,
          itemsReceived: true,
          itemsMissing: true,
          itemsDamaged: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return NextResponse.json({
      product: {
        ...product,
        variants: enrichedVariants,
        shipment
      }
    })
  } catch (error) {
    console.error('Error fetching product details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product details' },
      { status: 500 }
    )
  }
}
