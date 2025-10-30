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

  // Resolve params (supports Promise or object) and retrieve the checkout session from Stripe
  const paramsObj = await Promise.resolve(context.params)
  // Initialize Stripe lazily and retrieve the checkout session
  const stripe = getStripe()
  const checkoutSession = await stripe.checkout.sessions.retrieve(paramsObj.sessionId)
    
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