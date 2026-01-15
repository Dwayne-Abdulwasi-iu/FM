import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    maxDesigns: 5,
    maxDownloads: null,
    commissionRate: 10,
    prioritySupport: false,
    analyticsAccess: false,
    features: [
      'Up to 5 designs',
      'Basic listing',
      '10% platform commission',
      'Standard support'
    ]
  },
  BASIC: {
    name: 'Basic',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    maxDesigns: 25,
    maxDownloads: null,
    commissionRate: 7,
    prioritySupport: false,
    analyticsAccess: true,
    features: [
      'Up to 25 designs',
      'Featured placement',
      '7% platform commission',
      'Basic analytics',
      'Standard support'
    ]
  },
  PRO: {
    name: 'Pro',
    priceMonthly: 29.99,
    priceYearly: 299.99,
    maxDesigns: null,  // Unlimited
    maxDownloads: null,
    commissionRate: 5,
    prioritySupport: true,
    analyticsAccess: true,
    features: [
      'Unlimited designs',
      'Priority featured placement',
      '5% platform commission',
      'Advanced analytics',
      'Priority support',
      'Custom profile page',
      'Early access to features'
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceMonthly: 99.99,
    priceYearly: 999.99,
    maxDesigns: null,
    maxDownloads: null,
    commissionRate: 3,
    prioritySupport: true,
    analyticsAccess: true,
    features: [
      'Everything in Pro',
      '3% platform commission',
      'Dedicated account manager',
      'API access',
      'White-label options',
      'Custom integrations',
      'SLA guarantees'
    ]
  }
}

/**
 * GET /api/subscriptions
 * Get current user's subscription or available plans
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const searchParams = request.nextUrl.searchParams
    const showPlans = searchParams.get('plans') === 'true'

    // If just requesting plans, no auth needed
    if (showPlans) {
      return NextResponse.json({
        plans: Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
          planType: key,
          ...plan
        }))
      })
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to view subscription' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      // Return free tier info
      return NextResponse.json({
        subscription: null,
        currentPlan: {
          planType: 'FREE',
          ...SUBSCRIPTION_PLANS.FREE
        },
        availablePlans: Object.entries(SUBSCRIPTION_PLANS)
          .filter(([key]) => key !== 'FREE')
          .map(([key, plan]) => ({
            planType: key,
            ...plan
          }))
      })
    }

    const planDetails = SUBSCRIPTION_PLANS[subscription.planType as keyof typeof SUBSCRIPTION_PLANS] 
      || SUBSCRIPTION_PLANS.FREE

    return NextResponse.json({
      subscription: {
        ...subscription,
        features: planDetails.features
      },
      currentPlan: {
        planType: subscription.planType,
        ...planDetails
      },
      availablePlans: Object.entries(SUBSCRIPTION_PLANS)
        .filter(([key]) => key !== subscription.planType)
        .map(([key, plan]) => ({
          planType: key,
          ...plan
        }))
    })

  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { message: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscriptions
 * Create or upgrade subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to subscribe' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { planType, billingCycle } = await request.json()

    // Validate plan
    if (!planType || !SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json(
        { message: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    if (planType === 'FREE') {
      return NextResponse.json(
        { message: 'Use DELETE to cancel and return to free tier' },
        { status: 400 }
      )
    }

    const validCycles = ['MONTHLY', 'YEARLY']
    if (billingCycle && !validCycles.includes(billingCycle)) {
      return NextResponse.json(
        { message: 'Invalid billing cycle' },
        { status: 400 }
      )
    }

    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]
    const cycle = billingCycle || 'MONTHLY'
    const _price = cycle === 'YEARLY' ? (plan.priceYearly || plan.priceMonthly * 12) : plan.priceMonthly

    // Check for existing subscription
    const existing = await prisma.subscription.findUnique({
      where: { userId }
    })

    const nextBillingDate = new Date()
    if (cycle === 'MONTHLY') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
    }

    // In production, create Stripe/Paystack subscription here
    // For now, just create the database record
    
    const subscriptionData = {
      planType,
      planName: plan.name,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      billingCycle: cycle,
      status: 'ACTIVE',
      maxDesigns: plan.maxDesigns,
      maxDownloads: plan.maxDownloads,
      commissionRate: plan.commissionRate,
      prioritySupport: plan.prioritySupport,
      analyticsAccess: plan.analyticsAccess,
      nextBillingDate
    }

    let subscription
    if (existing) {
      subscription = await prisma.subscription.update({
        where: { userId },
        data: subscriptionData
      })
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          ...subscriptionData
        }
      })
    }

    // In production, return Stripe checkout URL or Paystack payment link
    return NextResponse.json({
      message: `Subscribed to ${plan.name} plan successfully`,
      subscription,
      // checkoutUrl: 'https://stripe.com/checkout/...'  // Add in production
    })

  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json(
      { message: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/subscriptions
 * Cancel subscription (returns to free tier)
 */
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      return NextResponse.json(
        { message: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Mark as cancelled (will remain active until end of billing period)
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        // Keep endDate as nextBillingDate so they keep access until then
        endDate: subscription.nextBillingDate
      }
    })

    return NextResponse.json({
      message: 'Subscription cancelled. You will retain access until the end of your billing period.',
      accessUntil: subscription.nextBillingDate
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { message: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
