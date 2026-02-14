import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

// POST /api/boutique/seller/cancel-return
// Seller cancels return request (only if PENDING_ADMIN_REVIEW)
// Once admin approves (creates -2 variant), cancellation blocked
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
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
      select: { id: true }
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
      select: { id: true, sellerId: true }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.sellerId !== seller.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Find shipment - must be PENDING_ADMIN_REVIEW
    const shipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        sellerId: seller.id,
        productIds: { has: productId },
        status: 'PENDING_ADMIN_REVIEW'
      }
    })

    if (!shipment) {
      return NextResponse.json(
        { error: 'No pending return request found. Admin may have already acted on this.' },
        { status: 404 }
      )
    }

    // Cancel the shipment
    await prisma.sellerToAdminShipment.update({
      where: { id: shipment.id },
      data: {
        status: 'CANCELLED',
        adminNotes: '[CANCELLED BY SELLER]: Seller changed their mind'
      }
    })

    // Reset product
    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        fullReturnEnabled: false,
        status: 'LIVE',
        returnRequestedAt: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Return request cancelled successfully. Product is back in your inventory.',
      productId
    })
  } catch (error) {
    console.error('Cancel return error:', error)

    const prismaResp = prismaErrorResponse(error, 'Database error')
    if (prismaResp) return prismaResp

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to cancel return' },
      { status: 500 }
    )
  }
}
