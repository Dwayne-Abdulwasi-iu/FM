import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/boutique/admin/rejected/[productId]/create-return
// Admin initiates return shipment creation
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

    // Fetch the rejected product
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        status: true,
        sellerId: true,
        rejectionReason: true,
        rejectionEmailLastSentAt: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.status !== 'REJECTED') {
      return NextResponse.json(
        { success: false, message: 'Product is not in rejected status' },
        { status: 400 }
      )
    }

    // Check if a return shipment already exists for this product
    const existingShipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        sellerId: product.sellerId,
        productIds: {
          has: productId,
        },
        status: {
          in: ['PENDING', 'RETURN_SCHEDULED', 'SHIPPED', 'IN_TRANSIT'],
        },
      },
    })

    if (existingShipment) {
      return NextResponse.json(
        { success: false, message: 'A return shipment already exists for this product' },
        { status: 409 }
      )
    }

    // Create a return shipment record
    const returnShipment = await prisma.sellerToAdminShipment.create({
      data: {
        sellerId: product.sellerId,
        productIds: [productId],
        status: 'RETURN_SCHEDULED',
        disputeNotes: `Return initiated by admin on ${new Date().toLocaleDateString()}. Product: ${product.title}. Reason: ${product.rejectionReason || 'Quality check failed'}`,
        createdAt: new Date(),
      },
    })

    // Update product status to indicate return is in progress
    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        status: 'RETURN_IN_PROGRESS',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Return shipment created successfully',
      shipment: returnShipment,
    })
  } catch (error) {
    console.error('Error creating return shipment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create return shipment' },
      { status: 500 }
    )
  }
}
