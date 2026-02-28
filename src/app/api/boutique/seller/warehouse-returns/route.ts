import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { getDaysInWarehouse } from '@/lib/boutique/warehouse'

// GET /api/boutique/seller/warehouse-returns
// Seller endpoint to fetch their warehouse return requests
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get seller
    const seller = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      )
    }

    // Fetch all shipments for this seller
    const shipments = await prisma.sellerToAdminShipment.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' }
    })

    // Enhance with product info and calculate fees
    const returns = await Promise.all(
      shipments.flatMap(async shipment => {
        const products = await prisma.boutiqueProduct.findMany({
          where: { id: { in: shipment.productIds } },
          select: {
            id: true,
            title: true,
            warehouseReceivedAt: true
          }
        })

        return products.map(product => {
          const daysInWarehouse = getDaysInWarehouse(product.warehouseReceivedAt)
          const adminFeePerVariant = daysInWarehouse <= 119 ? 2 : 1

          return {
            id: `${shipment.id}-${product.id}`,
            shipmentId: shipment.id,
            productId: product.id,
            productTitle: product.title,
            status: shipment.status,
            createdAt: shipment.createdAt,
            daysInWarehouse,
            adminFeePerVariant,
            carrier: shipment.carrier,
            trackingNumber: shipment.trackingNumber,
            estimatedDelivery: shipment.expectedDeliveryDate?.toISOString()
          }
        })
      })
    ).then(all => all.flat())

    return NextResponse.json({
      success: true,
      returns,
      total: returns.length
    })
  } catch (error) {
    console.error('Fetch warehouse returns error:', error)

    const prismaResp = prismaErrorResponse(error, 'Database error')
    if (prismaResp) return prismaResp

    return NextResponse.json(
      { error: 'Failed to fetch warehouse returns' },
      { status: 500 }
    )
  }
}
