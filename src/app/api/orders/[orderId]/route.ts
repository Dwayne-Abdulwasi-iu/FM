import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/orders/[orderId]
 * Get details of a specific order
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const params = await context.params
    const orderId = params.orderId
    
    // Guard against undefined or invalid orderId
    if (!orderId || orderId === 'undefined') {
      return NextResponse.json(
        { message: 'Invalid order ID' },
        { status: 400 }
      )
    }
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to view order details' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const isAdmin = session.user.role === 'ADMIN'

    // Fetch order with all related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        items: {
          include: {
            design: {
              select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                thumbnailUrl: true,
                price: true,
                ownershipPrice: true,
                category: true,
                mediaFiles: {
                  select: {
                    id: true,
                    fileUrl: true,
                    fileName: true,
                    fileType: true,
                    mimeType: true,
                    accessType: true,
                    sortOrder: true
                  },
                  orderBy: {
                    sortOrder: 'asc'
                  }
                },
                designer: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    isVerified: true
                  }
                }
              }
            }
          }
        },
        earnings: {
          select: {
            id: true,
            sellerAmount: true,
            platformCommission: true,
            sellerId: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      )
    }

    // Check ownership - only customer or admin can view
    if (order.customerId !== userId && !isAdmin) {
      return NextResponse.json(
        { message: 'You do not have permission to view this order' },
        { status: 403 }
      )
    }

    // Get related purchases for download links
    const purchases = await prisma.purchase.findMany({
      where: {
        orderId: order.id,
        userId
      },
      select: {
        id: true,
        designId: true,
        purchaseType: true,
        accessGranted: true
      }
    })

    return NextResponse.json({
      order: {
        ...order,
        purchases
      }
    })

  } catch (error) {
    console.error('Get order details error:', error)
    return NextResponse.json(
      { message: 'Failed to get order details' },
      { status: 500 }
    )
  }
}
