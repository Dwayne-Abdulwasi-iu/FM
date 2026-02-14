import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { sendWarehouseReturnShippedNotification } from '@/lib/warehouse-email-functions'

// POST /api/boutique/admin/ship-return
// Admin marks return as shipped to seller
// Updates shipment status to SHIPPED_BY_ADMIN
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { productId, trackingNumber, carrier, estimatedDelivery } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      )
    }

    // Get product
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

    // Find approved or already-shipped return shipment
    const shipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        sellerId: product.sellerId,
        productIds: { has: productId },
        status: { in: ['APPROVED_BY_ADMIN', 'SHIPPED_BY_ADMIN'] }
      }
    })

    if (!shipment) {
      return NextResponse.json(
        { error: 'No approved return found for this product' },
        { status: 404 }
      )
    }

    // Update shipment to SHIPPED_BY_ADMIN (idempotent - safe to call multiple times)
    const updatedShipment = await prisma.sellerToAdminShipment.update({
      where: { id: shipment.id },
      data: {
        status: 'SHIPPED_BY_ADMIN',
        carrier: carrier || shipment.carrier,
        trackingNumber: trackingNumber || shipment.trackingNumber,
        adminNotes: `${shipment.adminNotes || ''}\n\n[SHIPPED]: Admin shipped return on ${new Date().toISOString()}`
      }
    })

    // Update product status to SHIPPED_BACK
    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        status: 'SHIPPED_BACK'
      }
    })

    // Send shipping notification to seller
    try {
      await sendWarehouseReturnShippedNotification({
        sellerName: product.seller.name || 'Seller',
        sellerEmail: product.seller.email,
        productTitle: product.title,
        productId,
        trackingNumber,
        carrier,
        estimatedDelivery
      })
    } catch (emailError) {
      console.error('Failed to send shipping notification:', emailError)
      // Don't fail the shipment marking if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Return shipped to seller. Seller notified.',
      shipmentId: shipment.id,
      status: 'SHIPPED_BY_ADMIN',
      trackingNumber,
      carrier
    })
  } catch (error) {
    console.error('Ship return error:', error)

    const prismaResp = prismaErrorResponse(error, 'Database error')
    if (prismaResp) return prismaResp

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to ship return' },
      { status: 500 }
    )
  }
}
