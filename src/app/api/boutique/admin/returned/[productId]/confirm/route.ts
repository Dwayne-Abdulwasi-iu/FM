import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/boutique/admin/returned/[productId]/confirm
// Admin confirms return is complete and deletes -2 variant (fee lock)
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

    // Fetch the product with variants for -2 cleanup
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true,
        title: true,
        sellerId: true,
        variants: {
          select: {
            id: true,
            quantity: true,
          },
        },
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
        status: { in: ['RECEIVED_BY_SELLER', 'COMPLETED'] }
      },
    })

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment must be marked as received by seller first' },
        { status: 400 }
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

    // Check if all products in shipment are now confirmed
    const allProductsInShipment = await prisma.boutiqueProduct.findMany({
      where: {
        id: { in: shipment.productIds }
      },
      select: {
        id: true,
        status: true
      }
    })

    // Count how many are now RETURNED_SUCCESSFUL (including this one we just updated)
    const confirmedCount = allProductsInShipment.filter(p => 
      p.status === 'RETURNED_SUCCESSFUL' || p.id === productId
    ).length

    // Only set shipment to COMPLETED if all products are confirmed
    const shipmentNewStatus = confirmedCount === shipment.productIds.length ? 'COMPLETED' : 'RECEIVED_BY_SELLER'

    // Update shipment with resolved status and admin notes
    await prisma.sellerToAdminShipment.update({
      where: { id: shipment.id },
      data: {
        status: shipmentNewStatus,
        disputeNotes: notes ? `${shipment.disputeNotes || ''}\n\n[ADMIN VERIFICATION]: ${notes}` : shipment.disputeNotes,
      },
    })

    // Clean up the -2 variant(s) (admin fee lock) - product is now fully returned
    const minusVariants = product.variants?.filter((v) => v.quantity === -2)
    
    // Validation: should have at least one -2 variant if return was approved
    if (!minusVariants || minusVariants.length === 0) {
      console.warn(`⚠ Warning: No -2 variant found when confirming return for product ${productId}. This may indicate the return wasn't properly approved.`)
    }
    
    if (minusVariants && minusVariants.length > 0) {
      try {
        for (const variant of minusVariants) {
          await prisma.boutiqueProductVariant.delete({
            where: { id: variant.id },
          })
        }
        console.log(`✓ Deleted ${minusVariants.length} -2 fee lock variant(s) for returned product ${productId}`)
      } catch (deleteError) {
        // Log but don't fail the entire return process if variant deletion fails
        console.error(`⚠ Warning: Failed to delete -2 variant(s) for product ${productId}:`, deleteError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Return completed, verified, and finalized',
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
