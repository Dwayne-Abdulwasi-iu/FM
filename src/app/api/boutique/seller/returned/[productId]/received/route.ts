import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/boutique/seller/returned/[productId]/received
// Seller confirms they received the returned product from admin
// Shipment status: SHIPPED_BY_ADMIN → RECEIVED_BY_SELLER
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { productId } = await context.params

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID required' },
        { status: 400 }
      )
    }

    // Fetch the product
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true,
        sellerId: true,
        title: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify seller ownership
    if (product.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Product must be in RETURN_IN_PROGRESS status
    if (product.status !== 'RETURN_IN_PROGRESS') {
      return NextResponse.json(
        { success: false, message: 'Product is not in return workflow' },
        { status: 400 }
      )
    }

    // Find the shipment record - must be in SHIPPED_BY_ADMIN or RECEIVED_BY_SELLER status
    const shipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        sellerId: session.user.id,
        productIds: {
          has: productId,
        },
        status: { in: ['SHIPPED_BY_ADMIN', 'RECEIVED_BY_SELLER'] }
      },
    })

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'No shipped return found' },
        { status: 404 }
      )
    }

    // Update product status to SELLER_RECEIVED
    const updatedProduct = await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        status: 'SELLER_RECEIVED',
      },
      select: {
        id: true,
        status: true,
        title: true,
      },
    })

    // Check if all products in shipment are now received
    const allProductsInShipment = await prisma.boutiqueProduct.findMany({
      where: {
        id: { in: shipment.productIds }
      },
      select: {
        id: true,
        status: true
      }
    })

    // Count how many are now SELLER_RECEIVED (including this one we just updated)
    const receivedCount = allProductsInShipment.filter(p => 
      p.status === 'SELLER_RECEIVED' || p.id === productId
    ).length

    // Update shipment to RECEIVED_BY_SELLER (idempotent - safe to call multiple times)
    await prisma.sellerToAdminShipment.update({
      where: { id: shipment.id },
      data: {
        status: 'RECEIVED_BY_SELLER',
        sellerNotes: `${shipment.sellerNotes || ''}\n\nSeller confirmed receipt on ${new Date().toISOString()}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Product marked as received. Admin will verify next.',
      product: updatedProduct,
    })
  } catch (error) {
    console.error('Error marking product received:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to mark product received' },
      { status: 500 }
    )
  }
}
