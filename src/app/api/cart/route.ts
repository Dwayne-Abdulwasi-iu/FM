import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        design: {
          include: {
            designer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate total based on purchase type
    const total = cartItems.reduce((sum, item) => {
      const price = item.purchaseType === 'OWNERSHIP' && item.design.ownershipPrice
        ? item.design.ownershipPrice
        : item.design.price
      return sum + (price * item.quantity)
    }, 0)

    return NextResponse.json({
      items: cartItems,
      total,
      count: cartItems.length
    })

  } catch (error) {
    console.error('Get cart error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { designId, quantity = 1, purchaseType = 'REGULAR' } = await request.json()

    if (!designId) {
      return NextResponse.json(
        { message: 'Design ID is required' },
        { status: 400 }
      )
    }

    if (!['REGULAR', 'OWNERSHIP'].includes(purchaseType)) {
      return NextResponse.json(
        { message: 'Invalid purchase type' },
        { status: 400 }
      )
    }

    // Check if design exists and is available
    // For development, be more lenient with approval status
    const design = await prisma.design.findUnique({
      where: { 
        id: designId
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found or not available' },
        { status: 404 }
      )
    }

    // Check if design is inactive (but allow pending approval for testing)
    if (!design.isActive) {
      return NextResponse.json(
        { message: 'Design is not available' },
        { status: 404 }
      )
    }

    // Check if user is trying to buy their own design
    if (design.designerId === session.user.id) {
      return NextResponse.json(
        { message: 'Cannot add your own design to cart' },
        { status: 400 }
      )
    }

    // Check ownership availability
    if (purchaseType === 'OWNERSHIP' && design.isOwned) {
      return NextResponse.json(
        { message: 'This design is already exclusively owned' },
        { status: 400 }
      )
    }

    // Check if design supports the requested purchase type
    if (purchaseType === 'OWNERSHIP' && design.buyingTypes === 'REGULAR') {
      return NextResponse.json(
        { message: 'This design does not support ownership purchase' },
        { status: 400 }
      )
    }

    if (purchaseType === 'REGULAR' && design.buyingTypes === 'OWNERSHIP') {
      return NextResponse.json(
        { message: 'This design only supports ownership purchase' },
        { status: 400 }
      )
    }

    // Check if ownership price is set for ownership purchases
    if (purchaseType === 'OWNERSHIP' && !design.ownershipPrice) {
      return NextResponse.json(
        { message: 'Ownership price not set for this design' },
        { status: 400 }
      )
    }

    // Check if item already exists in cart with same purchase type
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        userId: session.user.id,
        designId,
        purchaseType
      }
    })

    if (existingItem) {
      // For ownership, quantity should always be 1
      if (purchaseType === 'OWNERSHIP') {
        return NextResponse.json(
          { message: 'Ownership item already in cart' },
          { status: 400 }
        )
      }
      
      // Update quantity for regular purchases
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          design: {
            include: {
              designer: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })

      return NextResponse.json({
        message: 'Cart updated successfully',
        item: updatedItem
      })
    }

    // Create new cart item
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: session.user.id,
        designId,
        quantity: purchaseType === 'OWNERSHIP' ? 1 : quantity,
        purchaseType
      },
      include: {
        design: {
          include: {
            designer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Item added to cart successfully',
      item: cartItem
    })

  } catch (error) {
    console.error('Add to cart error:', error)
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

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json(
        { message: 'Item ID is required' },
        { status: 400 }
      )
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id
      }
    })

    if (!cartItem) {
      return NextResponse.json(
        { message: 'Cart item not found' },
        { status: 404 }
      )
    }

    await prisma.cartItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({
      message: 'Item removed from cart successfully'
    })

  } catch (error) {
    console.error('Remove from cart error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}