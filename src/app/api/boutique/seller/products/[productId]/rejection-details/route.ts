import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { productId } = await params

    // Get product and verify seller ownership
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
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

    if (product.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get shipment details (discrepancy, rejection reason, return date)
    const shipment = await prisma.sellerToAdminShipment.findFirst({
      where: {
        productIds: { has: productId },
      },
      select: {
        id: true,
        status: true,
        itemsMissing: true,
        itemsDamaged: true,
        hasDiscrepancy: true,
        disputeNotes: true,
      },
    })

    return NextResponse.json({
      success: true,
      shipment: shipment || null,
    })
  } catch (error) {
    console.error('Error fetching rejection details:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rejection details' },
      { status: 500 }
    )
  }
}
