import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = (page - 1) * limit

    // Get user's designs with order count
    const designs = await prisma.design.findMany({
      where: { designerId: session.user.id },
      include: {
        _count: {
          select: {
            orderItems: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })

    // Get total count for pagination
    const totalDesigns = await prisma.design.count({
      where: { designerId: session.user.id }
    })

    const totalPages = Math.ceil(totalDesigns / limit)

    // Format designs with sales count
    const formattedDesigns = designs.map((design) => ({
      id: design.id,
      title: design.title,
      description: design.description,
      price: design.price,
      imageUrl: design.imageUrl,
      category: design.category,
      tags: design.tags,
      isActive: design.isActive,
      isOwned: design.isOwned,
      totalSales: design.totalSales,
      totalRevenue: design.totalRevenue,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
      salesCount: design._count.orderItems
    }))

    return NextResponse.json({
      designs: formattedDesigns,
      pagination: {
        currentPage: page,
        totalPages,
        totalDesigns,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('Profile designs error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { designId, action } = await request.json()

    if (!designId || !action) {
      return NextResponse.json(
        { message: 'Design ID and action are required' },
        { status: 400 }
      )
    }

    // Verify the design belongs to the user
    const design = await prisma.design.findFirst({
      where: {
        id: designId,
        designerId: session.user.id
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found or access denied' },
        { status: 404 }
      )
    }

    let updatedDesign

    switch (action) {
      case 'toggle':
        // Sellers are not allowed to activate/deactivate designs; admin only
        return NextResponse.json(
          { message: 'Only admins can activate/deactivate designs. Please contact support.' },
          { status: 403 }
        )

      case 'delete':
        // Check if design has any orders
        const orderCount = await prisma.order.count({
          where: { 
            items: {
              some: {
                designId
              }
            }
          }
        })

        if (orderCount > 0) {
          return NextResponse.json(
            { message: 'Cannot delete design with existing orders' },
            { status: 400 }
          )
        }

        await prisma.design.delete({
          where: { id: designId }
        })

        return NextResponse.json({ 
          message: 'Design deleted successfully',
          deleted: true 
        })

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({ 
      design: updatedDesign,
      message: `Design ${action}d successfully` 
    })

  } catch (error) {
    console.error('Design action error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

  let body: { designId?: string } | null
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { message: 'Request body required' },
        { status: 400 }
      )
    }

  const { designId } = body || {}

    if (!designId) {
      return NextResponse.json(
        { message: 'Design ID is required' },
        { status: 400 }
      )
    }

    // Verify the design belongs to the user
    const design = await prisma.design.findFirst({
      where: {
        id: designId,
        designerId: session.user.id
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found or access denied' },
        { status: 404 }
      )
    }

    // Prevent deletion if there are any orders containing the design
    const orderCount = await prisma.order.count({
      where: {
        items: {
          some: { designId }
        }
      }
    })

    if (orderCount > 0) {
      return NextResponse.json(
        { message: 'Cannot delete design with existing orders' },
        { status: 400 }
      )
    }

    // Prevent deletion if design has been sold as ownership or is currently owned
    if (design.isOwned) {
      return NextResponse.json(
        { message: 'Cannot delete owned design. Please deactivate instead.' },
        { status: 400 }
      )
    }

    const ownershipPurchases = await prisma.purchase.count({
      where: { designId, purchaseType: 'OWNERSHIP' }
    })

    if (ownershipPurchases > 0) {
      return NextResponse.json(
        { message: 'Cannot delete design that has been purchased with ownership.' },
        { status: 400 }
      )
    }

    await prisma.design.delete({ where: { id: designId } })

    return NextResponse.json({
      message: 'Design deleted successfully',
      deleted: true
    })
  } catch (error) {
    console.error('Design delete error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}