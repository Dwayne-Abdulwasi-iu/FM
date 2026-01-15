import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const MAX_LIMIT = 50

/**
 * GET /api/orders
 * Get current user's order history with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to view your orders' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    
    // Pagination with max limit
    const requestedLimit = parseInt(searchParams.get('limit') || '10')
    const limit = Math.min(Math.max(1, isNaN(requestedLimit) ? 10 : requestedLimit), MAX_LIMIT)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)
    
    // Filtering options
    const status = searchParams.get('status') // PENDING, COMPLETED, FAILED, REFUNDED
    const sortOrder = searchParams.get('sort') === 'asc' ? 'asc' : 'desc'

    // Build where clause
    const where: {
      customerId: string
      status?: string
    } = { customerId: userId }
    
    if (status) {
      where.status = status.toUpperCase()
    }

    // Fetch orders with related data
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              design: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  thumbnailUrl: true,
                  price: true,
                  ownershipPrice: true,
                  designer: {
                    select: {
                      id: true,
                      name: true,
                      image: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: sortOrder },
        take: limit,
        skip: offset
      }),
      prisma.order.count({ where })
    ])

    // Calculate summary statistics
    const stats = await prisma.order.aggregate({
      where: { 
        customerId: userId,
        status: 'COMPLETED'
      },
      _sum: { totalAmount: true },
      _count: true
    })

    return NextResponse.json({
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      summary: {
        completedOrders: stats._count,
        totalSpent: stats._sum.totalAmount || 0
      }
    })

  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { message: 'Failed to get orders' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/orders/[orderId]
 * Get details of a specific order
 * Note: This is handled in api/orders/[orderId]/route.ts
 */
