import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { sendWarehouseReturnRejectedNotification } from '@/lib/warehouse-email-functions'

// POST /api/boutique/admin/reject-return
// Admin rejects seller's return request (only if PENDING_ADMIN_REVIEW)
// No -2 variant created, seller must contact support to cancel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { productId, reason } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason required' },
        { status: 400 }
      )
    }

    // Get product with seller info
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      include: {
        seller: { select: { id: true, email: true, name: true } }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Find shipment - check all statuses to provide better error
    const shipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        sellerId: product.sellerId,
        productIds: { has: productId }
      }
    })

    if (!shipment) {
      return NextResponse.json(
        { error: 'No return request found for this product' },
        { status: 404 }
      )
    }

    // Only allow rejection if shipment is still PENDING_ADMIN_REVIEW
    if (shipment.status !== 'PENDING_ADMIN_REVIEW') {
      return NextResponse.json(
        { error: `Cannot reject: shipment is already ${shipment.status}. Admin may have already approved or rejected other products.` },
        { status: 400 }
      )
    }

    // Cancel the shipment
    await prisma.sellerToAdminShipment.update({
      where: { id: shipment.id },
      data: {
        status: 'CANCELLED',
        adminNotes: `[REJECTED BY ADMIN]: ${reason}`
      }
    })

    // Reset product - not in return process anymore
    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        fullReturnEnabled: false,
        status: 'LIVE', // Back to live status
        returnRequestedAt: null
      }
    })

    // Send rejection email to seller
    try {
      await sendWarehouseReturnRejectedNotification({
        sellerName: product.seller.name || 'Seller',
        sellerEmail: product.seller.email,
        productTitle: product.title,
        productId,
        reason
      })
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError)
      // Don't fail the rejection if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Return request rejected. Seller notified.',
      productId,
      reason
    })
  } catch (error) {
    console.error('Reject return error:', error)

    const prismaResp = prismaErrorResponse(error, 'Database error')
    if (prismaResp) return prismaResp

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reject return' },
      { status: 500 }
    )
  }
}
