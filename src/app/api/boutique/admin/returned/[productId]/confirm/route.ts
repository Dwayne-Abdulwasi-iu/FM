import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/boutique/admin/returned/[productId]/confirm
// Admin confirms return is complete
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { productId } = await context.params

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { notes } = body

    // Fetch the product
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true,
        title: true,
        sellerId: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Product must be in SELLER_RECEIVED status
    if (product.status !== 'SELLER_RECEIVED') {
      return NextResponse.json(
        { success: false, message: 'Product must be marked as received by seller first' },
        { status: 400 }
      )
    }

    // Find and update the shipment
    const shipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        sellerId: product.sellerId,
        productIds: {
          has: productId,
        },
      },
    })

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment record not found' },
        { status: 404 }
      )
    }

    // Update product status to RETURNED_SUCCESSFUL
    const updatedProduct = await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        status: 'RETURNED_SUCCESSFUL',
      },
      select: {
        id: true,
        status: true,
        title: true,
      },
    })

    // Update shipment with resolved status and admin notes
    await prisma.sellerToAdminShipment.update({
      where: { id: shipment.id },
      data: {
        status: 'RESOLVED',
        disputeNotes: notes ? `${shipment.disputeNotes || ''}\n\n[ADMIN VERIFICATION]: ${notes}` : shipment.disputeNotes,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Return completed and verified',
      product: updatedProduct,
    })
  } catch (error) {
    console.error('Error confirming return:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to confirm return' },
      { status: 500 }
    )
  }
}
