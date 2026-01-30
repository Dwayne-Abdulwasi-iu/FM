import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import { getStripe } from '@/lib/stripe'
import { paystack } from '@/lib/paystack'
import { isEligibleForProTrial, getRemainingTrialDays } from '@/lib/pro-trial'

/**
 * GET /api/subscriptions/pro
 * Get user's Pro subscription status (including trial status)
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        totalEarnings: true,
        proSubscriptionActive: true,
        proSubscriptionExpiresAt: true,
        proTrialActivated: true,
        proTrialActivatedAt: true,
        proTrialExpiresAt: true,
      }
    })

    const totalEarnings = seller?.totalEarnings ?? 0
    const isStarter = totalEarnings < 100
    const isProSubscriber = seller?.proSubscriptionActive ?? false
    const isEligible = await isEligibleForProTrial(session.user.id)
    
    const now = new Date()
    const isTrialActive = seller?.proTrialActivated && 
                         seller?.proTrialExpiresAt && 
                         seller.proTrialExpiresAt > now
    const remainingTrialDays = isTrialActive ? await getRemainingTrialDays(session.user.id) : null

    return NextResponse.json({
      isProSubscriber,
      isStarter,
      totalEarnings,
      proSubscriptionLocked: isStarter,
      lockedMessage: isStarter ? 'Pro subscription unlocks at NEW tier ($100+ earnings)' : null,
      remainingToUnlock: isStarter ? 100 - totalEarnings : 0,
      subscription: seller?.proSubscriptionActive ? {
        expiresAt: seller.proSubscriptionExpiresAt
      } : null,
      trial: {
        isEligible,
        isActive: isTrialActive,
        activatedAt: seller?.proTrialActivatedAt,
        expiresAt: seller?.proTrialExpiresAt,
        remainingDays: remainingTrialDays,
      }
    })
  } catch (error) {
    console.error('[GET /api/subscriptions/pro]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch subscription')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

/**
 * POST /api/subscriptions/pro
 * Initiate Pro subscription with Stripe or Paystack
 * 
 * Body:
 * {
 *   billingPeriod: 'MONTHLY' | 'YEARLY',
 *   processor: 'stripe' | 'paystack'
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { billingPeriod, processor, currency = 'USD' } = body

    if (!['MONTHLY', 'YEARLY'].includes(billingPeriod)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 })
    }

    if (!['stripe', 'paystack'].includes(processor)) {
      return NextResponse.json({ error: 'Invalid processor' }, { status: 400 })
    }

    if (!['USD', 'NGN'].includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    // Get seller - ensure they have a seller account
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        totalEarnings: true,
        preferredCurrency: true,
        sellerAccount: { select: { id: true } }
      }
    })

    if (!seller) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    
    if (!seller.sellerAccount) {
      return NextResponse.json({ 
        error: 'You must have a seller account to upgrade to Pro' 
      }, { status: 403 })
    }

    // Check if seller is in STARTER tier (earnings < $100)
    if (seller.totalEarnings < 100) {
      return NextResponse.json({ 
        error: 'Pro subscription is only available after you reach NEW tier ($100+ earnings)',
        tier: 'STARTER',
        earnedSoFar: seller.totalEarnings,
        requiredEarnings: 100,
        remainingToUnlock: 100 - seller.totalEarnings
      }, { status: 403 })
    }

    // Update user's preferred currency
    if (currency) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { preferredCurrency: currency }
      }).catch(() => null)
    }

    // Pricing (USD)
    const monthlyPrice = 9.99
    const yearlyPrice = 99.99
    const usdAmount = billingPeriod === 'YEARLY' ? yearlyPrice : monthlyPrice

    if (processor === 'stripe') {
      // Create Stripe checkout session
      const stripe = getStripe()
      
      try {
        // Create checkout session
        const stripeSession = await stripe.checkout.sessions.create({
          customer_email: seller.email || undefined,
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [{
            price: billingPeriod === 'YEARLY' 
              ? (process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly')
              : (process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly'),
            quantity: 1
          }],
          success_url: `${process.env.NEXTAUTH_URL}/seller/upgrade?success=true`,
          cancel_url: `${process.env.NEXTAUTH_URL}/seller/upgrade?canceled=true`,
          metadata: {
            userId: seller.id,
            billingPeriod,
            type: 'pro_subscription'
          }
        })

        return NextResponse.json({
          success: true,
          url: stripeSession.url
        })
      } catch (error) {
        console.error('[Stripe Pro Subscription]', error)
        return NextResponse.json({ error: 'Failed to create Stripe checkout' }, { status: 500 })
      }
    } else {
      // Paystack subscription - redirect to Paystack checkout
      try {
        const amountInKobo = Math.round(usdAmount * 100)
        
        // Initialize payment with metadata for subscription
        const reference = `pro_${seller.id}_${Date.now()}`
        
        const response = await paystack.transaction.initialize({
          email: seller.email,
          amount: amountInKobo,
          reference,
          metadata: {
            userId: seller.id,
            billingPeriod,
            amount: usdAmount,
            type: 'pro_subscription'
          }
        })

        if (!response.status) {
          return NextResponse.json({ error: 'Failed to initialize Paystack payment' }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          url: response.data.authorization_url
        })
      } catch (error) {
        console.error('[Paystack Pro Subscription]', error)
        return NextResponse.json({ error: 'Failed to create Paystack payment' }, { status: 500 })
      }
    }
  } catch (error) {
    console.error('[POST /api/subscriptions/pro]', error)
    const prismaResp = prismaErrorResponse(error, 'Failed to activate subscription')
    if (prismaResp) return prismaResp
    return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 })
  }
}
