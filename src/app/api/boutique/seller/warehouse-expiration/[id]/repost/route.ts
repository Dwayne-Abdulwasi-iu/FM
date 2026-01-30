import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { submitRepostRequest } from '@/lib/boutique/warehouse'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: productId } = await params
    const { reason, notes } = await request.json()

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    // Verify product belongs to seller
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      include: { variants: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Not your product' }, { status: 403 })
    }

    // Submit repost request
    const repostRequest = await submitRepostRequest(
      productId,
      session.user.id,
      reason,
      notes,
      product
    )

    return NextResponse.json({
      success: true,
      message: 'Repost request submitted for admin review',
      requestId: repostRequest.id,
    })
  } catch (error) {
    console.error('Error submitting repost:', error)
    const message = error instanceof Error ? error.message : 'Failed to submit repost request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
