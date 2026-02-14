import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { approveWarehouseReturn } from '@/lib/boutique/warehouse'

// POST /api/boutique/admin/approve-return
// Admin approves seller's return request
// Creates -2 variant (irreversible fee lock)
// Sends approval email to seller
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { productId, notes } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      )
    }

    // Get product with seller info
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      include: {
        variants: {
          select: { id: true, quantity: true }
        },
        seller: { select: { id: true, email: true, name: true } }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify shipment exists and is pending or being processed
    const shipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        sellerId: product.sellerId,
        productIds: { has: productId },
        status: { in: ['PENDING_ADMIN_REVIEW', 'APPROVED_BY_ADMIN'] }
      }
    })

    if (!shipment) {
      return NextResponse.json(
        { error: 'No pending return request found for this product. Return may have been already approved, rejected, or shipped.' },
        { status: 404 }
      )
    }

    // Approve return (creates -2 variant)
    const approvalResult = await approveWarehouseReturn(
      productId,
      product.sellerId,
      product,
      notes
    )

    // Send approval email to seller with fee details
    try {
      const { sendWarehouseReturnApprovedNotification } = await import('@/lib/email')
      await sendWarehouseReturnApprovedNotification({
        sellerName: product.seller.name || 'Seller',
        sellerEmail: product.seller.email,
        productTitle: product.title,
        productId,
        daysInWarehouse: approvalResult.daysInWarehouse,
        adminFee: approvalResult.adminFeePerVariant,
        itemsReturning: shipment.itemsExpected
      })
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't fail the approval if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Return approved. Seller notified. -2 variant created (irreversible)',
      shipmentId: shipment.id,
      approvalDetails: {
        adminFeePerVariant: approvalResult.adminFeePerVariant,
        daysInWarehouse: approvalResult.daysInWarehouse,
        status: 'APPROVED_BY_ADMIN',
        sellerNotified: true
      }
    })
  } catch (error) {
    console.error('Approve return error:', error)

    const prismaResp = prismaErrorResponse(error, 'Database error')
    if (prismaResp) return prismaResp

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to approve return' },
      { status: 500 }
    )
  }
}
