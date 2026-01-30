import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse body for future use (tracking info, etc)
    await request.json()

    // Update product status to RETURNED_TO_SELLER
    const updated = await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: {
        status: 'RETURNED_TO_SELLER',
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Product marked as returned to seller',
      product: updated,
    })
  } catch (error) {
    console.error('Error marking product as returned:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to mark product as returned' },
      { status: 500 }
    )
  }
}
