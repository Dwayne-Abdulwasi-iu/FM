import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { paystack, isPaystackConfigured, convertUSDToNGN } from '@/lib/paystack'
import prisma from '@/lib/prisma'

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST to initiate checkout' },
    { status: 405 }
  )
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

    let cartItems, paymentMethod
    try {
      const body = await request.json()
      cartItems = body.cartItems
      paymentMethod = body.paymentMethod || 'stripe'
    } catch (parseError) {
      console.error('Failed to parse checkout request body:', parseError)
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      )
    }

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
        { message: 'Stripe not activated. Use Paystack instead.' },
        { status: 503 }
      )
    }

    if (paymentMethod === 'paystack' && !paystackConfigured) {
      return NextResponse.json(
        { message: 'Paystack not activated. Use Stripe instead.' },
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

    // Platform takes 10% from sellers, not buyers
    const platformFeeTotal = Math.round(totalAmount * 0.10 * 100) // 10% in cents

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
      const amountInNGN = await convertUSDToNGN(totalAmount)
      
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
          const designerAmountNGN = await convertUSDToNGN(designerTotal)
          
          // For flat split: share is the amount in kobo to go to the subaccount
          // Seller gets 90% of their items total
          subaccounts.push({
            subaccount: sellerAccount.subaccountCode,
            share: Math.round(designerAmountNGN * 0.90 * 100), // 90% to designer in kobo
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
          platformFee: Math.round(amountInNGN * 0.10).toString(),
          orderItems: JSON.stringify(orderItems),
          originalAmountUSD: totalAmount.toString(),
          splitPaymentEnabled: subaccounts.length > 0
        }
      }
      
      // For single seller orders, use direct subaccount attachment
      // This automatically splits based on the subaccount's percentage_charge
      // For multi-seller orders, use split with flat amounts
      if (subaccounts.length === 1) {
        // Single seller - use subaccount directly (cleaner, auto-splits)
        transactionData.subaccount = subaccounts[0].subaccount
        // Note: bearer is not needed here - Paystack uses the subaccount's percentage_charge
        console.log('Single seller - using direct subaccount:', subaccounts[0].subaccount)
      } else if (subaccounts.length > 1) {
        // Multiple sellers - use split payments
        transactionData.split = {
          type: "flat", // flat means each subaccount gets a fixed amount
          bearer_type: "account", // Main account (platform) pays transaction fees
          subaccounts: subaccounts.map(s => ({
            subaccount: s.subaccount,
            share: s.share, // Amount in kobo to credit to this subaccount
          }))
        }
        console.log('Multi-seller split payment configuration:', JSON.stringify(transactionData.split, null, 2))
      } else {
        // No sellers with subaccounts - this shouldn't happen if payment method is 'paystack'
        console.warn('No sellers with Paystack subaccounts found')
        return NextResponse.json(
          { message: 'Unable to process payment. Sellers are not set up for Paystack payments.' },
          { status: 503 }
        )
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
    console.error('Checkout error:', error)
    
    // Handle Stripe authentication errors
    if (error instanceof Error && error.message?.includes('Invalid API Key')) {
      return NextResponse.json(
        { message: 'Stripe not properly configured. Use Paystack instead.' },
        { status: 503 }
      )
    }
    
    // Handle other Stripe errors
    if (error instanceof Error && (error.message?.includes('StripeAuthenticationError') || error.name?.includes('Stripe'))) {
      return NextResponse.json(
        { message: 'Stripe authentication failed. Use Paystack instead.' },
        { status: 503 }
      )
    }
    
    // Handle Paystack API errors
    if (error instanceof Error && error.message?.includes('Request failed with status code 400')) {
      return NextResponse.json(
        { message: 'Paystack configuration error. Please verify your seller account is properly set up.' },
        { status: 503 }
      )
    }
    
    if (error instanceof Error && error.message?.includes('Request failed')) {
      return NextResponse.json(
        { message: 'Payment gateway error. Please try again or contact support.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { message: 'Checkout failed. Please try another payment method.' },
      { status: 500 }
    )
  }
}