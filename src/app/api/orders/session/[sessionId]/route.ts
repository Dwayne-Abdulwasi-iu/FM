import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Resolve params (supports Promise or object)
    const paramsObj = await Promise.resolve(context.params)
    const sessionId = paramsObj.sessionId

    // Check if this is a Paystack reference (starts with 'fashion_')
    if (sessionId.startsWith('fashion_')) {
      console.log('[GET /api/orders/session] Looking for Paystack order:', { sessionId, customerId: session.user.id })
      // Find Paystack order by orderNumber
      const order = await prisma.order.findFirst({
        where: {
          orderNumber: sessionId,
          customerId: session.user.id
        },
        include: {
          items: {
            include: {
              design: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  mediaFiles: {
                    select: {
                      id: true,
                      fileUrl: true,
                      fileName: true,
                      fileType: true,
                      mimeType: true,
                      sortOrder: true
                    },
                    orderBy: {
                      sortOrder: 'asc'
                    }
                  },
                  designer: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      console.log('[GET /api/orders/session] Query result:', order ? 'FOUND' : 'NOT FOUND')
      if (!order) {
        console.log('[GET /api/orders/session] Order not found - checking if it exists at all')
        const allOrders = await prisma.order.findMany({
          where: { orderNumber: sessionId },
          select: { id: true, orderNumber: true, customerId: true }
        })
        console.log('[GET /api/orders/session] All orders with this number:', allOrders)
        return NextResponse.json(
          { message: 'Order not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ order })
    }

    // Otherwise, try Stripe
    const stripe = getStripe()
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (!checkoutSession.payment_intent) {
      return NextResponse.json(
        { message: 'Payment intent not found' },
        { status: 404 }
      )
    }

    // Find the order in our database
    const order = await prisma.order.findFirst({
      where: {
        stripePaymentIntentId: checkoutSession.payment_intent as string,
        customerId: session.user.id
      },
      include: {
        items: {
          include: {
            design: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
                mediaFiles: {
                  select: {
                    id: true,
                    fileUrl: true,
                    fileName: true,
                    fileType: true,
                    mimeType: true,
                    sortOrder: true
                  },
                  orderBy: {
                    sortOrder: 'asc'
                  }
                },
                designer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
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

    return NextResponse.json({ order })

  } catch (error) {
    console.error('Get order by session error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}