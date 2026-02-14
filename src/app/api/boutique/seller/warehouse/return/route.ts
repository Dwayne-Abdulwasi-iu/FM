import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { sendWarehouseReturnApprovedNotification } from '@/lib/email'

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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Verify seller owns product
    if (product.sellerId !== seller.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if product is in warehouse
    if (!product.warehouseReceivedAt) {
      return NextResponse.json(
        { error: 'Product not in warehouse' },
        { status: 400 }
      )
    }

    // Find the -1 variant (the one locked for warehouse storage)
    const minusOneVariant = product.variants.find((v) => v.quantity === -1)

    if (!minusOneVariant) {
      return NextResponse.json(
        { error: 'Warehouse lock variant not found. Contact support.' },
        { status: 400 }
      )
    }

    // Release the -1 variant (delete it)
    await prisma.boutiqueProductVariant.delete({
      where: { id: minusOneVariant.id }
    })

    // Clear warehouse metadata
    const updatedProduct = await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        warehouseReceivedAt: null,
        warehouseExpiresAt: null,
        warehouseLocation: null,
        month5NotificationSent: false,
        shipmentId: null,
      }
    })

    // Send confirmation email
    try {
      await sendWarehouseReturnApprovedNotification({
        sellerName: seller.name || 'Seller',
        sellerEmail: seller.email,
        productTitle: product.title,
        productId: product.id,
      })
    } catch (emailError) {
      console.error(`Failed to send return confirmation email for ${productId}:`, emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Product returned from warehouse successfully',
      product: updatedProduct,
    })
  } catch (error) {
    console.error('Return from warehouse error:', error)

    const prismaResp = prismaErrorResponse(
      error,
      'Database temporarily unavailable'
    )
    if (prismaResp) return prismaResp

    return NextResponse.json(
      { error: 'Failed to return product from warehouse' },
      { status: 500 }
    )
  }
}
