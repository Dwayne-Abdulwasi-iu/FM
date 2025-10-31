import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { paystack, isPaystackConfigured, convertUSDToNGN } from '@/lib/paystack'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { cartItems, paymentMethod = 'stripe' } = await request.json()

    // Check if at least one payment system is configured
  const stripeConfigured = isStripeConfigured() && process.env.STRIPE_SECRET_KEY !== 'sk_test_REDACTED'
    const paystackConfigured = isPaystackConfigured()
    
    if (!stripeConfigured && !paystackConfigured) {
      return NextResponse.json(
        { message: 'Payment system not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // Check if requested payment method is available
    if (paymentMethod === 'stripe' && !stripeConfigured) {
      return NextResponse.json(
        { message: 'Stripe payment not available. Try Paystack.' },
        { status: 503 }
      )
    }

    if (paymentMethod === 'paystack' && !paystackConfigured) {
      return NextResponse.json(
        { message: 'Paystack payment not available. Try Stripe.' },
        { status: 503 }
      )
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { message: 'Cart is empty' },
        { status: 400 }
      )
    }

  // Verify cart items and calculate total
  let totalAmount = 0
  const lineItems: unknown[] = []
  type OrderItem = { designId: string; quantity: number; price: number; purchaseType?: string; designerId?: string }
  const orderItems: OrderItem[] = []

    for (const item of cartItems) {
      const design = await prisma.design.findUnique({
        where: { 
          id: item.designId, 
          isActive: true, 
          approvalStatus: 'APPROVED' 
        },
        include: { designer: true }
      })

      if (!design) {
        return NextResponse.json(
          { message: `Design ${item.designId} not found or not available` },
          { status: 400 }
        )
      }

      // Check if ownership purchase is still available
      if (item.purchaseType === 'OWNERSHIP' && design.isOwned) {
        return NextResponse.json(
          { message: `Design "${design.title}" is already exclusively owned` },
          { status: 400 }
        )
      }

      // Get correct price based on purchase type
      const price = item.purchaseType === 'OWNERSHIP' && design.ownershipPrice 
        ? design.ownershipPrice 
        : design.price

      if (item.purchaseType === 'OWNERSHIP' && !design.ownershipPrice) {
        return NextResponse.json(
          { message: `Ownership price not set for design "${design.title}"` },
          { status: 400 }
        )
      }

      const itemTotal = price * item.quantity
      totalAmount += itemTotal

      // Customer pays the full listed price - no additional fees
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${design.title}${item.purchaseType === 'OWNERSHIP' ? ' (Exclusive Rights)' : ''}`,
            description: item.purchaseType === 'OWNERSHIP' 
              ? `Exclusive ownership rights with branding permission. ${design.description || ''}`.trim()
              : design.description || undefined,
            images: design.thumbnailUrl ? [design.thumbnailUrl] : undefined,
          },
          unit_amount: Math.round(price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })

      orderItems.push({
        designId: design.id,
        quantity: item.quantity,
        price: price,
        purchaseType: item.purchaseType || 'REGULAR',
        designerId: design.designerId
      })
    }

    // Platform takes 5% from sellers, not buyers
    const platformFeeTotal = Math.round(totalAmount * 0.05 * 100) // 5% in cents

    if (paymentMethod === 'stripe') {
      // Create Stripe checkout session (initialize Stripe lazily)
      const stripe = getStripe()
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/cart`,
        customer_email: session.user.email || undefined,
        metadata: {
          userId: session.user.id,
          platformFee: platformFeeTotal.toString(),
          orderItems: JSON.stringify(orderItems)
        },
        payment_intent_data: {
          application_fee_amount: platformFeeTotal,
          metadata: {
            userId: session.user.id,
            platformFee: platformFeeTotal.toString()
          }
        }
    // Stripe's SDK typing can be noisy here; narrow the rest of our code and allow this single cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

      return NextResponse.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
        paymentMethod: 'stripe'
      })
    } else if (paymentMethod === 'paystack') {
      // Convert USD to NGN for Paystack
      const amountInNGN = convertUSDToNGN(totalAmount)
      
      // Get unique designers from order items and check their subaccounts
      const designerIds = [...new Set(orderItems.map(item => item.designerId))]
  type Subaccount = { subaccount: string; share: number }
  const subaccounts: Subaccount[] = []
      
      for (const designerId of designerIds) {
        const sellerAccount = await prisma.sellerAccount.findUnique({
          where: { userId: designerId }
        })
        
        if (sellerAccount?.subaccountCode) {
          // Calculate designer's total amount from this order
          const designerItems = orderItems.filter(item => item.designerId === designerId)
          const designerTotal = designerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
          const designerAmountNGN = convertUSDToNGN(designerTotal)
          
          subaccounts.push({
            subaccount: sellerAccount.subaccountCode,
            share: Math.round(designerAmountNGN * 0.95 * 100), // 95% to designer in kobo
          })
        }
      }
      
      // Create Paystack transaction with split payments
      const transactionData: Record<string, unknown> = {
        email: session.user.email || 'customer@example.com',
        amount: amountInNGN * 100, // Paystack expects kobo (NGN * 100)
        currency: 'NGN',
        reference: `fashion_${Date.now()}_${session.user.id}`,
        callback_url: `${process.env.NEXTAUTH_URL}/checkout/success`,
        metadata: {
          userId: session.user.id,
          platformFee: Math.round(amountInNGN * 0.05).toString(),
          orderItems: JSON.stringify(orderItems),
          originalAmountUSD: totalAmount.toString(),
          splitPaymentEnabled: subaccounts.length > 0
        }
      }
      
      // Add split configuration if we have subaccounts
      if (subaccounts.length > 0) {
        transactionData.split = {
          type: "flat",
          subaccounts: subaccounts
        }
        console.log('Split payment configuration:', JSON.stringify(transactionData.split, null, 2))
      }
      
      const transaction = await paystack.transaction.initialize(transactionData)

      if (!transaction.status) {
        throw new Error('Failed to initialize Paystack transaction')
      }

      return NextResponse.json({
        reference: transaction.data.reference,
        url: transaction.data.authorization_url,
        paymentMethod: 'paystack',
        splitPaymentEnabled: subaccounts.length > 0,
        designersWithSubaccounts: subaccounts.length
      })
    }

  } catch (error) {
    void error
    console.error('Checkout error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}