import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { getDaysInWarehouse } from '@/lib/boutique/warehouse'

// GET /api/boutique/admin/warehouse-returns-pending
// Admin endpoint to fetch all pending warehouse returns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Fetch all shipments (all statuses for dashboard filtering)
    const shipments = await prisma.sellerToAdminShipment.findMany({
      include: {
        seller: {
          select: { id: true, email: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Enhance with product info and calculate fees
    const requests = await Promise.all(
      shipments.map(async shipment => {
        const products = await prisma.boutiqueProduct.findMany({
          where: { id: { in: shipment.productIds } },
          select: {
            id: true,
            title: true,
            warehouseReceivedAt: true
          }
        })

        const firstProduct = products[0]
        const daysInWarehouse = firstProduct
          ? getDaysInWarehouse(firstProduct.warehouseReceivedAt)
          : 0

        // Fee calculation
        const adminFeePerVariant = daysInWarehouse <= 119 ? 2 : 1

        return {
          shipment: {
            ...shipment,
            products: products
          },
          daysInWarehouse,
          adminFeePerVariant
        }
      })
    )

    return NextResponse.json({
      success: true,
      requests,
      total: requests.length
    })
  } catch (error) {
    console.error('Fetch returns error:', error)

    const prismaResp = prismaErrorResponse(error, 'Database error')
    if (prismaResp) return prismaResp

    return NextResponse.json(
      { error: 'Failed to fetch warehouse returns' },
      { status: 500 }
    )
  }
}
