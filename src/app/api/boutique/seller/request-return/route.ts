import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { requestWarehouseReturn } from '@/lib/boutique/warehouse'

// POST /api/boutique/seller/request-return
// Seller requests to return product from warehouse
// Creates PENDING_ADMIN_REVIEW shipment (NOT locked yet)
// NO -2 variant created - seller can cancel if they contact support
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      )
    }

    // Get seller
    const seller = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      )
    }

    // Get product
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      include: {
        variants: true,
        seller: { select: { id: true, email: true, name: true } }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify seller owns product
    if (product.sellerId !== seller.id) {
      return NextResponse.json(
        { error: 'Unauthorized - product not owned by seller' },
        { status: 403 }
      )
    }

    // Verify product is in warehouse
    if (!product.warehouseReceivedAt) {
      return NextResponse.json(
        { error: 'Product is not in warehouse' },
        { status: 400 }
      )
    }

    // Verify product is not OUT_OF_STOCK
    // Out of stock products cannot be returned
    if (product.status === 'OUT_OF_STOCK') {
      return NextResponse.json(
        { error: 'Out of stock products cannot be returned' },
        { status: 400 }
      )
    }

    // Request return (creates PENDING_ADMIN_REVIEW shipment, no -2 variant yet)
    const result = await requestWarehouseReturn(productId, seller.id, product)

    // NO EMAIL SENT - Seller must await admin approval
    // Return fee info for seller's modal/verification popup

    return NextResponse.json({
      success: true,
      message: 'Return request submitted for admin review',
      requiresApproval: true,
      feeInfo: {
        adminFeePerVariant: result.adminFeePerVariant,
        totalReturning: result.totalReturning,
        daysInWarehouse: result.daysInWarehouse,
        daysInCurrentCycle: result.daysInCurrentCycle,
        feeDetails: result.feeDetails,
        status: 'PENDING_ADMIN_REVIEW'
      }
    })
  } catch (error) {
    console.error('Request return error:', error)

    if (error instanceof Error && error.message.includes('Return already')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Log specific validation errors for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    const prismaResp = prismaErrorResponse(
      error,
      'Database temporarily unavailable'
    )
    if (prismaResp) return prismaResp

    return NextResponse.json(
      { error: 'Failed to request return' },
      { status: 500 }
    )
  }
}
