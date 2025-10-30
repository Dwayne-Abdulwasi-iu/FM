import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
    const formattedDesigns = designs.map((design: any) => ({
      id: design.id,
      title: design.title,
      description: design.description,
      price: design.price,
      imageUrl: design.imageUrl,
      category: design.category,
      tags: design.tags,
      isActive: design.isActive,
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
    void error
    console.error('Profile designs error:', error)
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
        updatedDesign = await prisma.design.update({
          where: { id: designId },
          data: { isActive: !design.isActive }
        })
        break

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
    void error
    console.error('Design action error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}