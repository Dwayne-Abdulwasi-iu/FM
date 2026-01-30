import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendStorageOptionConfirmationEmail } from '@/lib/emails/boutique'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storageOption, notes } = await request.json()

    // Validate option
    const validOptions = ['FULL_RETURN', 'PARTIAL_LIQUIDATION', 'FLEXIBLE_STORAGE']
    if (!validOptions.includes(storageOption)) {
      return NextResponse.json(
        { error: 'Invalid storage option' },
        { status: 400 }
      )
    }

    // Get product to verify ownership
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id },
      include: { seller: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    if (product.sellerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if product is within decision window (days 150-180)
    const daysInWarehouse = product.daysInWarehouseStartedAt
      ? Math.floor(
          (new Date().getTime() - new Date(product.daysInWarehouseStartedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0

    if (daysInWarehouse < 150 || daysInWarehouse > 180) {
      return NextResponse.json(
        { error: 'Can only choose storage option between day 150-180' },
        { status: 400 }
      )
    }

    // Update product with storage option
    const updatedProduct = await prisma.boutiqueProduct.update({
      where: { id },
      data: {
        storageOption,
        storageOptionChosenAt: new Date(),
        storageOptionNotes: notes,
      },
    })

    // Send email confirmation
    try {
      await sendStorageOptionConfirmationEmail(product.seller.email || '', product.title, storageOption)
    } catch (emailError) {
      console.error('Failed to send storage option email:', emailError)
    }

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct.id,
        title: updatedProduct.title,
        storageOption: updatedProduct.storageOption,
        storageOptionChosenAt: updatedProduct.storageOptionChosenAt,
      },
    })
  } catch (error) {
    console.error('Error setting storage option:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        storageOption: true,
        storageOptionChosenAt: true,
        warehouseExpiresAt: true,
        daysInWarehouseStartedAt: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching storage option:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
