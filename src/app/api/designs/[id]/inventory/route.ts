import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/designs/[id]/inventory
 * Get inventory status for a design
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const designId = params.id

    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        title: true,
        stockType: true,
        stockQuantity: true,
        lowStockThreshold: true,
        totalSales: true
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    // Calculate inventory status
    let inventoryStatus = 'IN_STOCK'
    let isLowStock = false

    if (design.stockType === 'SOLD_OUT') {
      inventoryStatus = 'SOLD_OUT'
    } else if (design.stockType === 'LIMITED' && design.stockQuantity !== null) {
      if (design.stockQuantity <= 0) {
        inventoryStatus = 'SOLD_OUT'
      } else if (design.lowStockThreshold && design.stockQuantity <= design.lowStockThreshold) {
        inventoryStatus = 'LOW_STOCK'
        isLowStock = true
      }
    }

    return NextResponse.json({
      designId: design.id,
      title: design.title,
      stockType: design.stockType,
      stockQuantity: design.stockQuantity,
      lowStockThreshold: design.lowStockThreshold,
      totalSales: design.totalSales,
      inventoryStatus,
      isLowStock,
      isAvailable: inventoryStatus !== 'SOLD_OUT'
    })

  } catch (error) {
    console.error('Get inventory error:', error)
    return NextResponse.json(
      { message: 'Failed to get inventory' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/designs/[id]/inventory
 * Update inventory for a design (owner only)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to update inventory' },
        { status: 401 }
      )
    }

    const params = await context.params
    const designId = params.id
    const userId = session.user.id

    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: { id: true, designerId: true }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (design.designerId !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'You can only update inventory for your own designs' },
        { status: 403 }
      )
    }

    const { stockType, stockQuantity, lowStockThreshold } = await request.json()

    // Validate stock type
    const validStockTypes = ['UNLIMITED', 'LIMITED', 'SOLD_OUT']
    if (stockType && !validStockTypes.includes(stockType)) {
      return NextResponse.json(
        { message: 'Invalid stock type' },
        { status: 400 }
      )
    }

    // Validate stock quantity for LIMITED type
    if (stockType === 'LIMITED' && (stockQuantity === undefined || stockQuantity < 0)) {
      return NextResponse.json(
        { message: 'Stock quantity is required for limited stock designs' },
        { status: 400 }
      )
    }

    interface UpdateData {
      stockType?: string
      stockQuantity?: number | null
      lowStockThreshold?: number | null
    }

    const updateData: UpdateData = {}
    
    if (stockType) {
      updateData.stockType = stockType
      // Clear quantity for unlimited, set for limited
      if (stockType === 'UNLIMITED') {
        updateData.stockQuantity = null
      } else if (stockType === 'LIMITED') {
        updateData.stockQuantity = Math.max(0, parseInt(stockQuantity) || 0)
      } else if (stockType === 'SOLD_OUT') {
        updateData.stockQuantity = 0
      }
    }

    if (stockQuantity !== undefined && stockType !== 'UNLIMITED') {
      updateData.stockQuantity = Math.max(0, parseInt(stockQuantity) || 0)
    }

    if (lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = Math.max(1, parseInt(lowStockThreshold) || 5)
    }

    const updatedDesign = await prisma.design.update({
      where: { id: designId },
      data: updateData,
      select: {
        id: true,
        title: true,
        stockType: true,
        stockQuantity: true,
        lowStockThreshold: true
      }
    })

    return NextResponse.json({
      message: 'Inventory updated successfully',
      inventory: updatedDesign
    })

  } catch (error) {
    console.error('Update inventory error:', error)
    return NextResponse.json(
      { message: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}
