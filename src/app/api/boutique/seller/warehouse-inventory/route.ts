import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller
    const seller = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const statusFilter = searchParams.get('status') // Can be 'LIVE', 'OUT_OF_STOCK', 'RETURNED', or null for all
    const stockStatus = searchParams.get('stockStatus') // 'in_stock' or 'out_of_stock'
    const dateFromStr = searchParams.get('dateFrom')
    const dateToStr = searchParams.get('dateTo')
    const searchQueryRaw = searchParams.get('search')
    
    // Sanitize search query - limit length to prevent DoS
    const MAX_SEARCH_LENGTH = 100
    const searchQuery = searchQueryRaw?.trim() && searchQueryRaw.trim().length > 0 && searchQueryRaw.trim().length <= MAX_SEARCH_LENGTH ? searchQueryRaw.trim() : null

    // Validate and parse dates with max bounds
    let dateFrom: Date | null = null
    let dateTo: Date | null = null
    const MAX_DATE_RANGE_DAYS = 365 * 2 // 2 years
    
    if (dateFromStr) {
      const parsed = new Date(dateFromStr)
      if (!isNaN(parsed.getTime())) {
        dateFrom = parsed
      }
    }
    
    if (dateToStr) {
      const parsed = new Date(dateToStr)
      if (!isNaN(parsed.getTime())) {
        dateTo = parsed
      }
    }

    // Validate date range - swap if needed and enforce max range
    if (dateFrom && dateTo && dateFrom > dateTo) {
      // Swap dates if they're in wrong order
      const temp = dateFrom
      dateFrom = dateTo
      dateTo = temp
    }
    
    // Enforce max range to prevent expensive queries
    if (dateFrom && dateTo) {
      const rangeMs = dateTo.getTime() - dateFrom.getTime()
      const rangeDays = rangeMs / (1000 * 60 * 60 * 24)
      if (rangeDays > MAX_DATE_RANGE_DAYS) {
        dateTo = new Date(dateFrom.getTime() + MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000)
      }
    }

    // Validate statusFilter - trim first, then validate
    const validStatuses = ['LIVE', 'OUT_OF_STOCK', 'RETURNED', 'IN_RETURN', 'SHIPPED_BACK']
    const trimmedStatus = statusFilter?.trim() || null
    const sanitizedStatusFilter = trimmedStatus && validStatuses.includes(trimmedStatus) ? trimmedStatus : null

    // Validate stockStatus
    const validStockStatuses = ['in_stock', 'out_of_stock']
    const sanitizedStockStatus = stockStatus && validStockStatuses.includes(stockStatus) ? stockStatus : null
    
    // Validate limit - max 100 results to prevent performance issues
    const RESULT_LIMIT = 100

    // Build where clause - show all warehouse products (LIVE, OUT_OF_STOCK, RETURNED, IN_RETURN, SHIPPED_BACK)
    const whereConditions: any[] = [
      { sellerId: seller.id },
      { warehouseReceivedAt: { not: null } }, // Must have been received in warehouse
      { 
        status: {
          in: sanitizedStatusFilter ? [sanitizedStatusFilter] : ['LIVE', 'OUT_OF_STOCK', 'RETURNED', 'IN_RETURN', 'SHIPPED_BACK']
        }
      }
    ]

    // Add stock status filter
    if (sanitizedStockStatus === 'in_stock') {
      whereConditions.push({ currentStock: { gt: 0 } })
    } else if (sanitizedStockStatus === 'out_of_stock') {
      whereConditions.push({
        OR: [
          { currentStock: 0 },
          { currentStock: null }
        ]
      })
    }

    // Add date range filters with validated dates
    if (dateFrom && dateTo) {
      whereConditions.push({ 
        warehouseReceivedAt: {
          gte: dateFrom,
          lte: dateTo
        }
      })
    } else if (dateFrom) {
      whereConditions.push({ warehouseReceivedAt: { gte: dateFrom } })
    } else if (dateTo) {
      whereConditions.push({ warehouseReceivedAt: { lte: dateTo } })
    }

    // Build the final where clause with AND logic
    const where: any = {
      AND: whereConditions
    }

    // Add search query as OR condition (optional)
    if (searchQuery) {
      where.AND.push({
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          // Don't search by ID with contains - IDs are UUIDs and contains is inefficient
        ]
      })
    }

    // Fetch products - all warehouse products with their current status
    // Limit to 100 products per request to prevent performance issues
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
        warehouseExpiresAt: true,
        outOfStockAt: true,
        returnedToSellerAt: true,
        month5NotificationSent: true,
        condition: true,
        shipmentId: true,
      },
      orderBy: { warehouseReceivedAt: 'desc' },
      take: RESULT_LIMIT,
    })

    // Fetch all shipments in one query to avoid N+1
    const shipmentIds = products.map(p => p.shipmentId).filter(Boolean) as string[]
    const shipments = shipmentIds.length > 0 
      ? await prisma.sellerToAdminShipment.findMany({
          where: { id: { in: shipmentIds } },
          select: { id: true, warehouseAddress: true }
        })
      : []
    const shipmentMap = new Map(shipments.map(s => [s.id, s.warehouseAddress]))

    // Fetch all sales history at once to avoid N+1 (limit to last 50 sales per product)
    const productIds = products.map(p => p.id)
    const allSalesHistory = productIds.length > 0
      ? await prisma.boutiqueOrderItem.findMany({
          where: {
            productId: { in: productIds },
            order: {
              status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] }
            }
          },
          select: {
            id: true,
            productId: true,
            quantity: true,
            price: true,
            variantSnapshot: true,
            createdAt: true,
            variant: {
              select: { size: true, color: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 500, // Limit total sales history to prevent slow queries
        })
      : []

    // Fetch all return requests for these products at once
    const allReturns = productIds.length > 0
      ? await prisma.boutiqueReturn.findMany({
          where: {
            orderItem: {
              productId: { in: productIds }
            },
            status: { in: ['PENDING', 'APPROVED', 'ITEM_SHIPPED', 'ITEM_RECEIVED'] }
          },
          select: {
            id: true,
            status: true,
            orderItem: {
              select: { productId: true }
            }
          }
        })
      : []
    
    // Group sales by product ID for quick lookup
    const salesByProductId = new Map<string, typeof allSalesHistory>()
    for (const sale of allSalesHistory) {
      if (!salesByProductId.has(sale.productId)) {
        salesByProductId.set(sale.productId, [])
      }
      salesByProductId.get(sale.productId)!.push(sale)
    }

    // Group returns by product ID for quick lookup
    const returnsByProductId = new Map<string, typeof allReturns>()
    for (const ret of allReturns) {
      const productId = ret.orderItem?.productId
      if (productId) {
        if (!returnsByProductId.has(productId)) {
          returnsByProductId.set(productId, [])
        }
        returnsByProductId.get(productId)!.push(ret)
      }
    }

    // Enrich products with shipment info
    const productsWithShipment = products.map(product => ({
      ...product,
      shipmentWarehouseAddress: product.shipmentId ? (shipmentMap.get(product.shipmentId) || null) : null
    }))

    // Enrich with calculated data (no async sales fetch needed - already have data)
    const enrichedProducts = productsWithShipment.map((product) => {
        const STORAGE_CYCLE_DAYS = 181
        
        // Validate warehouse received date is valid timestamp
        let warehouseReceivedTime = 0
        if (product.warehouseReceivedAt) {
          const parsed = new Date(product.warehouseReceivedAt)
          warehouseReceivedTime = !isNaN(parsed.getTime()) ? parsed.getTime() : 0
        }
        
        const daysInWarehouse = warehouseReceivedTime > 0
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - warehouseReceivedTime) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 0

        const storageCycle = Math.max(1, Math.floor(daysInWarehouse / (STORAGE_CYCLE_DAYS || 1)) + 1)
        const daysInCurrentCycle = STORAGE_CYCLE_DAYS > 0 ? daysInWarehouse % STORAGE_CYCLE_DAYS : 0

        // Validate warehouse expiry date is valid timestamp
        let daysUntilExpiry: number | null = null
        if (product.warehouseExpiresAt) {
          const parsed = new Date(product.warehouseExpiresAt)
          if (!isNaN(parsed.getTime())) {
            daysUntilExpiry = Math.ceil(
              (parsed.getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          }
        }

        const isLowStock = (product.currentStock || 0) <= 5
        // Only calculate isInMonth5 if product hasn't expired and has valid expiry date
        const isInMonth5 = product.warehouseExpiresAt && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysInCurrentCycle >= 119 && daysInCurrentCycle < 180

        // Get return requests for this product (but only if product is not OUT_OF_STOCK)
        // Out of stock products cannot have returns
        let returnStatus: string | null = null
        if (product.status !== 'OUT_OF_STOCK') {
          const productReturns = returnsByProductId.get(product.id) || []
          const pendingReturns = productReturns.filter(r => r.status === 'PENDING')
          const approvedReturns = productReturns.filter(r => r.status === 'APPROVED')
          const shippedReturns = productReturns.filter(r => r.status === 'ITEM_SHIPPED')
          const receivedReturns = productReturns.filter(r => r.status === 'ITEM_RECEIVED')
          
          if (pendingReturns.length > 0) {
            returnStatus = 'AWAITING_ADMIN_APPROVAL'
          } else if (approvedReturns.length > 0) {
            returnStatus = 'RETURN_APPROVED'
          } else if (shippedReturns.length > 0) {
            returnStatus = 'RETURN_IN_TRANSIT'
          } else if (receivedReturns.length > 0) {
            returnStatus = 'RETURN_RECEIVED'
          }
        }

        // Get sales history for this product from batch-fetched data
        const productSalesHistory = salesByProductId.get(product.id) || []
        const totalSold = productSalesHistory.reduce((sum, item) => sum + (item.quantity || 0), 0)

        return {
          ...product,
          daysInWarehouse,
          daysInCurrentCycle,
          storageCycle,
          daysUntilExpiry,
          isLowStock,
          isInMonth5,
          displayPrice: product.salePrice ?? product.basePrice ?? null,
          totalSold,
          returnStatus,
          shipmentWarehouseAddress: product.shipmentWarehouseAddress,
          salesHistory: productSalesHistory.map(item => {
            let variantInfo = 'Standard'
            if (item.variant && (item.variant.color || item.variant.size)) {
              variantInfo = `${item.variant.color || ''} ${item.variant.size || ''}`.trim()
            } else if (item.variantSnapshot && typeof item.variantSnapshot === 'object') {
              const snapshot = item.variantSnapshot as Record<string, any>
              if (snapshot.color || snapshot.size) {
                variantInfo = `${snapshot.color || ''} ${snapshot.size || ''}`.trim()
              }
            }
            return {
              quantity: item.quantity || 0,
              variantInfo,
              soldAt: item.createdAt,
              price: item.price || 0
            }
          })
        }
      })

    return NextResponse.json({
      products: enrichedProducts,
    })
  } catch (error) {
    console.error('Warehouse inventory fetch error:', error)

    const prismaResp = prismaErrorResponse(
      error,
      'Database temporarily unavailable'
    )
    if (prismaResp) return prismaResp

    // Log unexpected errors for debugging
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }

    return NextResponse.json(
      { error: 'Failed to fetch warehouse inventory' },
      { status: 500 }
    )
  }
}
