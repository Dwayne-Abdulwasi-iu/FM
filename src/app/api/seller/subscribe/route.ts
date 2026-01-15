import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { isPaystackConfigured } from '@/lib/paystack'
import prisma from '@/lib/prisma'

// Pro subscription price IDs - should be created in Stripe Dashboard
const PRO_PRICE_MONTHLY = process.env.STRIPE_PRO_MONTHLY_PRICE_ID
const PRO_PRICE_YEARLY = process.env.STRIPE_PRO_YEARLY_PRICE_ID

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const stripeReady = isStripeConfigured() && PRO_PRICE_MONTHLY
    const paystackReady = isPaystackConfigured()

    // If Stripe not configured, show coming soon / demo mode
    if (!stripeReady) {
      // For now, subscriptions require Stripe
      // Return demo mode so frontend can show appropriate message
      return NextResponse.json(
        { 
          message: 'Pro subscriptions launching soon! We\'ll notify you when available.',
          demoMode: true,
          paystackAvailable: paystackReady,
          url: null 
        },
        { status: 200 }
      )
    }

    const { plan } = await request.json()
    
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json(
        { message: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    const priceId = plan === 'yearly' ? PRO_PRICE_YEARLY : PRO_PRICE_MONTHLY

    if (!priceId) {
      // If no Stripe prices configured, return placeholder for demo
      return NextResponse.json(
        { 
          message: 'Subscription prices not configured',
          demoMode: true,
          url: null 
        },
        { status: 200 }
      )
    }

    const stripe = getStripe()

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    let customerId: string
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      })
      customerId = customer.id
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/seller/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/seller/upgrade`,
      metadata: {
        userId: session.user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          plan,
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })

  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { message: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        designerTier: true,
      }
    })

    const isProSubscriber = user?.designerTier === 'VIP_DESIGNER' || user?.designerTier === 'VVIP_DESIGNER'

    return NextResponse.json({
      isProSubscriber,
      tier: user?.designerTier || null,
      benefits: {
        commissionDiscount: isProSubscriber ? 1 : 0, // 1% discount
        featuredListings: isProSubscriber ? 5 : 0, // Number of featured slots per month
        prioritySupport: isProSubscriber,
        analyticsAccess: isProSubscriber,
        customStorefront: isProSubscriber,
        earlyAccess: isProSubscriber,
      }
    })

  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json(
      { message: 'Failed to get subscription status' },
      { status: 500 }
    )
  }
}
