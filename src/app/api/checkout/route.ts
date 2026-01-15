import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { paystack, isPaystackConfigured, convertUSDToNGN } from '@/lib/paystack'
import { initializePayment as initFlutterwavePayment, isFlutterwaveConfigured, getSupportedCountries } from '@/lib/flutterwave'
import { calculateRefereeDiscount } from '@/lib/referral-service'
import prisma from '@/lib/prisma'
import { getCommissionRate } from '@/lib/commission-tiers'

// Currency conversion rates (in production, fetch from API)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1550, // Nigerian Naira
  GHS: 15,   // Ghanaian Cedi
  ZAR: 18,   // South African Rand
}

function convertCurrency(amountUSD: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1
  return Math.round(amountUSD * rate * 100) / 100
}

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

    let cartItems, paymentMethod, phoneNumber, countryCode, referralCode, shippingAddress
    try {
      const body = await request.json()
      cartItems = body.cartItems
      paymentMethod = body.paymentMethod || 'stripe'
      phoneNumber = body.phoneNumber // For M-Pesa
      countryCode = body.countryCode || 'KE' // For Flutterwave/M-Pesa
      referralCode = body.referralCode // For referral discounts
      shippingAddress = body.shippingAddress // For POD orders
    } catch (parseError) {
      console.error('Failed to parse checkout request body:', parseError)
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Determine if this is a POD order (has physical products)
    const hasPODItems = cartItems?.some((item: { purchaseType?: string }) => item.purchaseType === 'POD')
    
    // POD orders require shipping address
    if (hasPODItems && !shippingAddress) {
      return NextResponse.json(
        { message: 'Shipping address required for physical products' },
        { status: 400 }
      )
    }

    // Check if at least one payment system is configured
    const stripeConfigured = isStripeConfigured() && process.env.STRIPE_SECRET_KEY !== 'sk_test_REDACTED'
    const paystackConfigured = isPaystackConfigured()
    const mpesaConfigured = isMpesaConfigured()
    const flutterwaveConfigured = isFlutterwaveConfigured()
    
    if (!stripeConfigured && !paystackConfigured && !mpesaConfigured && !flutterwaveConfigured) {
      return NextResponse.json(
        { message: 'Payment system not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // Validate M-Pesa requirements
    if (paymentMethod === 'mpesa') {
      if (!mpesaConfigured) {
        return NextResponse.json(
          { message: 'M-Pesa is not available. Please choose another payment method.' },
          { status: 503 }
        )
      }
      if (!phoneNumber) {
        return NextResponse.json(
          { message: 'Phone number is required for M-Pesa payments' },
          { status: 400 }
        )
      }
    }

    // Validate Flutterwave requirements
    if (paymentMethod === 'flutterwave') {
      if (!flutterwaveConfigured) {
        return NextResponse.json(
          { message: 'Flutterwave is not available. Please choose another payment method.' },
          { status: 503 }
        )
      }
      const supportedCountries = getSupportedCountries()
      const countrySupported = supportedCountries.find(c => c.code === countryCode)
      if (!countrySupported) {
        return NextResponse.json(
          { message: `Flutterwave is not available in ${countryCode}. Please choose another payment method.` },
          { status: 400 }
        )
      }
    }

    // Fallback logic for unavailable payment methods
    if (paymentMethod === 'stripe' && !stripeConfigured) {
      if (paystackConfigured) {
        paymentMethod = 'paystack'
        console.log('[CHECKOUT] Stripe not configured, auto-redirecting to Paystack')
      } else if (flutterwaveConfigured) {
        paymentMethod = 'flutterwave'
        console.log('[CHECKOUT] Stripe not configured, auto-redirecting to Flutterwave')
      } else {
        return NextResponse.json(
          { message: 'Stripe not activated and no alternative payment methods available.' },
          { status: 503 }
        )
      }
    }

    if (paymentMethod === 'paystack' && !paystackConfigured) {
      if (stripeConfigured) {
        paymentMethod = 'stripe'
        console.log('[CHECKOUT] Paystack not configured, auto-redirecting to Stripe')
      } else if (flutterwaveConfigured) {
        paymentMethod = 'flutterwave'
        console.log('[CHECKOUT] Paystack not configured, auto-redirecting to Flutterwave')
      } else {
        return NextResponse.json(
          { message: 'Paystack not activated and no alternative payment methods available.' },
          { status: 503 }
        )
      }
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
  type OrderItem = { 
    designId: string; 
    quantity: number; 
    price: number; 
    purchaseType?: string; 
    designerId?: string;
    // POD-specific fields
    podProductId?: string;
    podProductName?: string;
    podProvider?: string;
  }
  const orderItems: OrderItem[] = []

  // First pass: calculate total for referral discount
  for (const item of cartItems) {
    const design = await prisma.design.findUnique({
      where: { id: item.designId },
      select: { price: true, ownershipPrice: true }
    })
    if (design) {
      // For POD items, use the podPrice from the cart; otherwise use design price
      let price: number
      if (item.purchaseType === 'POD' && item.podPrice) {
        price = item.podPrice
      } else if (item.purchaseType === 'OWNERSHIP' && design.ownershipPrice) {
        price = design.ownershipPrice
      } else {
        price = design.price
      }
      totalAmount += price * item.quantity
    }
  }

  // Calculate referral discount if applicable
  let referralDiscount = 0
  let referralDiscountPercent = 0
  if (referralCode && session.user.id) {
    const discount = await calculateRefereeDiscount(session.user.id, totalAmount)
    if (discount.hasDiscount) {
      referralDiscountPercent = discount.discountPercent
      referralDiscount = discount.discountAmount
    }
  }

  // Reset total for second pass
  totalAmount = 0

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
      // For POD items, use the podPrice from the cart; otherwise use design price
      let price: number
      if (item.purchaseType === 'POD' && item.podPrice) {
        price = item.podPrice
      } else if (item.purchaseType === 'OWNERSHIP' && design.ownershipPrice) {
        price = design.ownershipPrice
      } else {
        price = design.price
      }

      if (item.purchaseType === 'OWNERSHIP' && !design.ownershipPrice) {
        return NextResponse.json(
          { message: `Ownership price not set for design "${design.title}"` },
          { status: 400 }
        )
      }

      const itemTotal = price * item.quantity
      totalAmount += itemTotal
    }

    // Apply referral discount if applicable
    if (referralDiscountPercent > 0) {
      referralDiscount = totalAmount * (referralDiscountPercent / 100)
      totalAmount = totalAmount - referralDiscount
      console.log(`[CHECKOUT] Applied ${referralDiscountPercent}% referral discount: -$${referralDiscount.toFixed(2)}`)
    }

    // Rebuild line items with discounted prices for payment gateways
    for (const item of cartItems) {
      const design = await prisma.design.findUnique({
        where: { id: item.designId },
        include: { designer: true }
      })

      if (!design) continue

      // For POD items, use the podPrice from the cart; otherwise use design price
      let price: number
      if (item.purchaseType === 'POD' && item.podPrice) {
        price = item.podPrice
      } else if (item.purchaseType === 'OWNERSHIP' && design.ownershipPrice) {
        price = design.ownershipPrice
      } else {
        price = design.price
      }

      // Apply discount proportionally
      const discountedPrice = referralDiscountPercent > 0 
        ? price * (1 - referralDiscountPercent / 100)
        : price

      // Customer pays the full listed price - no additional fees
      const isPodItem = item.purchaseType === 'POD'
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${design.title}${item.purchaseType === 'OWNERSHIP' ? ' (Exclusive Rights)' : isPodItem ? ` - ${item.podProductName || 'POD Product'}` : ''}`,
            description: item.purchaseType === 'OWNERSHIP' 
              ? `Exclusive ownership rights with branding permission. ${design.description || ''}`.trim()
              : isPodItem 
                ? `Print-on-Demand: ${item.podProductName || 'Custom product'} via ${item.podProvider || 'POD provider'}`
                : design.description || undefined,
            images: design.thumbnailUrl ? [design.thumbnailUrl] : undefined,
          },
          unit_amount: Math.round(discountedPrice * 100), // Convert to cents (with discount applied)
        },
        quantity: item.quantity,
      })

      // Build order item with POD fields if applicable
      const orderItem: OrderItem = {
        designId: design.id,
        quantity: item.quantity,
        price: discountedPrice, // Store discounted price
        purchaseType: item.purchaseType || 'REGULAR',
        designerId: design.designerId
      }
      
      // Add POD-specific fields if this is a POD item
      if (isPodItem) {
        orderItem.podProductId = item.podProductId
        orderItem.podProductName = item.podProductName
        orderItem.podProvider = item.podProvider
      }
      
      orderItems.push(orderItem)
    }

    // Platform commission is tiered (0.1% - 10%) based on seller earnings
    // For multi-seller orders, we use 10% as an estimate here; actual is calculated per-seller in webhook
    const platformFeeEstimate = Math.round(totalAmount * 0.10 * 100) // Estimated 10% in cents
    
    // Check if any items are POD orders
    const hasPodItems = orderItems.some(item => item.purchaseType === 'POD')

    if (paymentMethod === 'stripe') {
      // Create Stripe checkout session (initialize Stripe lazily)
      const stripe = getStripe()
      
      // Build metadata - include shipping address if POD items present
      const sessionMetadata: Record<string, string> = {
        userId: session.user.id,
        platformFee: platformFeeEstimate.toString(),
        orderItems: JSON.stringify(orderItems),
        orderType: hasPodItems ? 'POD' : 'DIGITAL'
      }
      
      // Add shipping address to metadata if POD items exist
      if (hasPodItems && shippingAddress) {
        sessionMetadata.shippingAddress = JSON.stringify(shippingAddress)
      }
      
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/cart`,
        customer_email: session.user.email || undefined,
        metadata: sessionMetadata,
        payment_intent_data: {
          application_fee_amount: platformFeeEstimate,
          metadata: {
            userId: session.user.id,
            platformFee: platformFeeEstimate.toString()
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
      type Subaccount = { subaccount: string; share: number; commissionRate: number; designerTotal: number }
      const subaccounts: Subaccount[] = []
      
      for (const designerId of designerIds) {
        // Get seller account and user info for tiered commission
        const [sellerAccount, seller] = await Promise.all([
          prisma.sellerAccount.findUnique({
            where: { userId: designerId }
          }),
          prisma.user.findUnique({
            where: { id: designerId },
            select: { totalEarnings: true, designerTier: true }
          })
        ])
        
        if (sellerAccount?.subaccountCode) {
          // Calculate designer's total amount from this order
          const designerItems = orderItems.filter(item => item.designerId === designerId)
          const designerTotal = designerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
          const designerAmountNGN = await convertUSDToNGN(designerTotal)
          
          // Get tiered commission rate for this seller
          const totalEarnings = seller?.totalEarnings ?? 0
          const isProSubscriber = seller?.designerTier === 'VIP_DESIGNER' || seller?.designerTier === 'VVIP_DESIGNER'
          const commissionRate = getCommissionRate(totalEarnings, isProSubscriber)
          const sellerRate = 1 - commissionRate // e.g., 0.90 for 10% commission, 0.999 for STARTER
          
          // For flat split: share is the amount in kobo to go to the subaccount
          subaccounts.push({
            subaccount: sellerAccount.subaccountCode,
            share: Math.round(designerAmountNGN * sellerRate * 100), // Tiered % to designer in kobo
            commissionRate: commissionRate, // Store for metadata calculation
            designerTotal: designerTotal, // Store USD amount for fee calculation
          })
        }
      }
      
      // Calculate total platform fee based on tiered rates
      const totalPlatformFee = subaccounts.reduce((sum, s) => {
        return sum + (s.designerTotal * s.commissionRate)
      }, 0)
      
      // Create Paystack transaction with split payments
      const transactionMetadata: Record<string, string | boolean> = {
        userId: session.user.id,
        platformFee: totalPlatformFee.toFixed(2), // Calculated from tiered rates
        orderItems: JSON.stringify(orderItems),
        originalAmountUSD: totalAmount.toString(),
        splitPaymentEnabled: subaccounts.length > 0,
        orderType: hasPodItems ? 'POD' : 'DIGITAL'
      }
      
      // Add shipping address to metadata if POD items exist
      if (hasPodItems && shippingAddress) {
        transactionMetadata.shippingAddress = JSON.stringify(shippingAddress)
      }
      
      const transactionData: Record<string, unknown> = {
        email: session.user.email || 'customer@example.com',
        amount: amountInNGN * 100, // Paystack expects kobo (NGN * 100)
        currency: 'NGN',
        reference: `fashion_${Date.now()}_${session.user.id}`,
        callback_url: `${process.env.NEXTAUTH_URL}/checkout/success`,
        metadata: transactionMetadata
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
        designersWithSubaccounts: subaccounts.length,
        referralDiscount: referralDiscount > 0 ? referralDiscount : undefined
      })
    } else if (paymentMethod === 'flutterwave') {
      // Flutterwave for pan-African payments
      const supportedCountries = getSupportedCountries()
      const countryInfo = supportedCountries.find(c => c.code === countryCode) || supportedCountries.find(c => c.code === 'NG')!
      const currency = countryInfo.currency
      const amountLocal = convertCurrency(totalAmount, currency)

      // Build order data with POD fields if applicable
      const orderData: Record<string, unknown> = {
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        customerId: session.user.id,
        status: 'PENDING',
        totalAmount: totalAmount,
        platformFee: totalAmount * 0.10,
        paymentMethod: 'FLUTTERWAVE',
        orderType: hasPodItems ? 'POD' : 'DIGITAL',
        items: {
          create: orderItems.map(item => ({
            designId: item.designId,
            quantity: item.quantity,
            price: item.price,
            purchaseType: item.purchaseType || 'REGULAR'
          }))
        }
      }
      
      // Add shipping address for POD orders
      if (hasPodItems && shippingAddress) {
        orderData.shippingName = shippingAddress.fullName
        orderData.shippingAddress = shippingAddress.address
        orderData.shippingCity = shippingAddress.city
        orderData.shippingState = shippingAddress.state
        orderData.shippingPostalCode = shippingAddress.postalCode
        orderData.shippingCountry = shippingAddress.country
        orderData.shippingPhone = shippingAddress.phone
      }

      // Create pending order first
      const order = await prisma.order.create({
        data: orderData as Parameters<typeof prisma.order.create>[0]['data']
      })

      try {
        const txRef = `FM_${order.id}_${Date.now()}`
        
        // Build Flutterwave meta with POD info if applicable
        const flwMeta: Record<string, string> = {
          orderId: order.id,
          userId: session.user.id,
          platformFee: Math.round(totalAmount * 0.10).toString(),
          txRef: txRef,
          orderType: hasPodItems ? 'POD' : 'DIGITAL'
        }
        
        if (hasPodItems && shippingAddress) {
          flwMeta.shippingAddress = JSON.stringify(shippingAddress)
        }
        
        const flwResult = await initFlutterwavePayment({
          orderId: order.id,
          amount: amountLocal,
          currency: currency,
          email: session.user.email || 'customer@example.com',
          name: session.user.name || 'Customer',
          redirectUrl: `${process.env.NEXTAUTH_URL}/checkout/success?method=flutterwave&order_id=${order.id}`,
          meta: flwMeta,
          customizations: {
            title: 'Fashion Marketplace',
            description: `Order #${order.id}`,
            logo: `${process.env.NEXTAUTH_URL}/logo.png`
          }
        })

        if (!flwResult.data?.link) {
          throw new Error('Failed to get Flutterwave payment link')
        }

        // Update order with Flutterwave reference
        await prisma.order.update({
          where: { id: order.id },
          data: {
            flutterwaveRef: txRef
          }
        })

        return NextResponse.json({
          orderId: order.id,
          reference: txRef,
          url: flwResult.data.link,
          paymentMethod: 'flutterwave',
          currency: currency,
          amount: amountLocal,
          referralDiscount: referralDiscount > 0 ? referralDiscount : undefined
        })
      } catch (flwError) {
        // Rollback order if Flutterwave fails
        await prisma.order.delete({ where: { id: order.id } })
        throw flwError
      }
    }

    // If no payment method matched
    return NextResponse.json(
      { message: 'Invalid payment method' },
      { status: 400 }
    )

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

    // Handle M-Pesa errors
    if (error instanceof Error && error.message?.includes('M-Pesa')) {
      return NextResponse.json(
        { message: 'M-Pesa payment failed. Please check your phone number and try again.' },
        { status: 503 }
      )
    }

    // Handle Flutterwave errors
    if (error instanceof Error && error.message?.includes('Flutterwave')) {
      return NextResponse.json(
        { message: 'Flutterwave payment initialization failed. Please try another payment method.' },
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
