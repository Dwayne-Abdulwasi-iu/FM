import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const stockStatus = searchParams.get('stockStatus') // 'in_stock' or 'out_of_stock'
    const sellerId = searchParams.get('sellerId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const searchQuery = searchParams.get('search')

    // Build where clause
    const where: Prisma.BoutiqueProductWhereInput = {}

    // Always exclude products that never made it to warehouse
    // Only show products that reached warehouse: LIVE, OUT_OF_STOCK, IN_RETURN, RETURN_REQUESTED, RETURN_SHIPPED, RETURNED_TO_SELLER, VERIFICATION_PASSED, RECEIVED_BY_ADMIN
    const warehouseStatuses = [
      'LIVE',
      'OUT_OF_STOCK',
      'IN_RETURN',
      'RETURN_REQUESTED',
      'RETURN_SHIPPED',
      'RETURNED_TO_SELLER',
      'VERIFICATION_PASSED',
      'RECEIVED_BY_ADMIN'
    ]
    where.status = { in: warehouseStatuses }

    // Only filter by specific status if explicitly provided
    if (status && warehouseStatuses.includes(status)) {
      where.status = status
    }

    if (sellerId) {
      where.sellerId = sellerId
    }

    if (stockStatus === 'in_stock') {
      where.currentStock = { gt: 0 }
    } else if (stockStatus === 'out_of_stock') {
      where.currentStock = 0
    }

    if (dateFrom) {
      where.warehouseReceivedAt = Object.assign({}, (where.warehouseReceivedAt as any) || {}, { gte: new Date(dateFrom) })
    }

    if (dateTo) {
      where.warehouseReceivedAt = Object.assign({}, (where.warehouseReceivedAt as any) || {}, { lte: new Date(dateTo) })
    }

    if (searchQuery) {
      // Combine search with status filter using AND
      where.AND = [
        {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { id: { contains: searchQuery } },
            { seller: { name: { contains: searchQuery, mode: 'insensitive' } } },
            { seller: { email: { contains: searchQuery, mode: 'insensitive' } } },
          ]
        }
      ]
    }

    // Fetch products with seller info
    const products = await prisma.boutiqueProduct.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        currency: true,
        currentStock: true,
        originalStock: true,
        thumbnailUrl: true,
        status: true,
        warehouseReceivedAt: true,
        warehouseLocation: true,
        warehouseExpiresAt: true,
        month5NotificationSent: true,
        condition: true,
        shipmentId: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { warehouseReceivedAt: 'desc' },
    })

    // Fetch shipment info for each product
    const productsWithShipment = await Promise.all(
      products.map(async (product) => {
        let shipmentWarehouseAddress = null
        if (product.shipmentId) {
          const shipment = await prisma.sellerToAdminShipment.findUnique({
            where: { id: product.shipmentId },
            select: { warehouseAddress: true }
          })
          shipmentWarehouseAddress = shipment?.warehouseAddress
        }
        return { ...product, shipmentWarehouseAddress }
      })
    )

    // Enrich with calculated data and sales history
    const enrichedProducts = await Promise.all(
      productsWithShipment.map(async (product) => {
        const STORAGE_CYCLE_DAYS = 181
        
        const daysInWarehouse = product.warehouseReceivedAt
          ? Math.floor(
              (Date.now() - new Date(product.warehouseReceivedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0

        const storageCycle = Math.floor(daysInWarehouse / STORAGE_CYCLE_DAYS) + 1
        const daysInCurrentCycle = daysInWarehouse % STORAGE_CYCLE_DAYS

        const daysUntilExpiry = product.warehouseExpiresAt
          ? Math.ceil(
              (new Date(product.warehouseExpiresAt).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : 0

        const isLowStock = (product.currentStock || 0) <= 5
        const isInMonth5 = daysInCurrentCycle >= 119 && daysInCurrentCycle < 180

        // Fetch sales history for this product
        const salesHistory = await prisma.boutiqueOrderItem.findMany({
          where: {
            productId: product.id,
            order: {
              status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] }
            }
          },
          select: {
            id: true,
            quantity: true,
            price: true,
            variantSnapshot: true,
            createdAt: true,
            variant: {
              select: { size: true, color: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        const totalSold = salesHistory.reduce((sum, item) => sum + item.quantity, 0)

        return {
          ...product,
          daysInWarehouse,
          daysInCurrentCycle,
          storageCycle,
          daysUntilExpiry,
          isLowStock,
          isInMonth5,
          displayPrice: product.salePrice || product.basePrice,
          totalSold,
          shipmentWarehouseAddress: product.shipmentWarehouseAddress,
          salesHistory: salesHistory.map(sItem => {
            const variantInfo = sItem.variant
              ? `${sItem.variant.color || ''} ${sItem.variant.size || ''}`.trim()
              : (() => {
                  const snap = sItem.variantSnapshot && typeof sItem.variantSnapshot === 'object' ? sItem.variantSnapshot as Record<string, unknown> : null
                  const color = snap && typeof snap['color'] === 'string' ? snap['color'] as string : ''
                  const size = snap && typeof snap['size'] === 'string' ? snap['size'] as string : ''
                  const info = `${color} ${size}`.trim()
                  return info || 'Standard'
                })()

            return {
              quantity: sItem.quantity,
              variantInfo,
              soldAt: sItem.createdAt,
              price: sItem.price
            }
          })
        }
      })
    )

    return NextResponse.json({
      products: enrichedProducts,
      total: enrichedProducts.length,
    })
  } catch (error) {
    console.error('Admin warehouse inventory fetch error:', error)

    const prismaResp = prismaErrorResponse(
      error,
      'Database temporarily unavailable'
    )
    if (prismaResp) return prismaResp

    return NextResponse.json(
      { error: 'Failed to fetch warehouse inventory' },
      { status: 500 }
    )
  }
}
