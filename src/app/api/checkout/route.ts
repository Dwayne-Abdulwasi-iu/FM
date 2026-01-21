import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import type Stripe from 'stripe'
import { paystack, isPaystackConfigured, convertUSDToNGN } from '@/lib/paystack'
import { initializePayment as initFlutterwavePayment, isFlutterwaveConfigured, getSupportedCountries } from '@/lib/flutterwave'
import prisma from '@/lib/prisma'
import { getCommissionRate } from '@/lib/commission-tiers'
import { fetchExchangeRates, convertFromUSD } from '@/lib/currency'

/**
 * Get the effective price for a design, considering A/B price tests
 * 
 * @param design - The design object with price test fields
 * @param variant - The variant the user was assigned ('A' = original, 'B' = test price)
 * @returns The price to charge and variant info
 */
function getEffectivePrice(
  design: {
    price: number
    priceTestActive: boolean
    priceTestVariant: number | null
    priceTestEndsAt: Date | null
  },
  variant?: 'A' | 'B'
): { price: number; variant: 'A' | 'B'; isTestPrice: boolean } {
  // Check if test is still active
  const isTestActive = design.priceTestActive && 
    design.priceTestVariant !== null && 
    design.priceTestEndsAt && 
    new Date(design.priceTestEndsAt) > new Date()
  
  if (!isTestActive || !variant || variant === 'A') {
    return { price: design.price, variant: 'A', isTestPrice: false }
  }
  
  // User saw variant B (test price)
  return { 
    price: design.priceTestVariant!, 
    variant: 'B', 
    isTestPrice: true 
  }
}

async function convertCurrencyLive(amountUSD: number, targetCurrency: string): Promise<number> {
  if (targetCurrency === 'USD') return amountUSD
  
  // For NGN, use the paystack live rate (more reliable for payments)
  if (targetCurrency === 'NGN') {
    return await convertUSDToNGN(amountUSD)
  }
  
  // For other currencies, use the currency lib which fetches from API
  const rates = await fetchExchangeRates()
  return Math.round(convertFromUSD(amountUSD, targetCurrency, rates) * 100) / 100
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

    console.log('[CHECKOUT] POST /api/checkout called', { userId: session.user.id })
    
    let cartItems, paymentMethod, phoneNumber, countryCode, shippingAddress
    try {
      const body = await request.json()
      cartItems = body.cartItems
      paymentMethod = body.paymentMethod || 'stripe'
      console.log('[CHECKOUT] Request body:', { paymentMethod, itemCount: cartItems?.length })
      phoneNumber = body.phoneNumber // For M-Pesa
      countryCode = body.countryCode || 'KE' // For Flutterwave/M-Pesa
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
    const mpesaConfigured = !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET)
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
          { message: 'Stripe not configured. Please choose another payment method.' },
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
          { message: 'Paystack not configured. Please choose another payment method.' },
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
    designTitle?: string;
    // POD-specific fields
    podProductId?: string;
    podProductName?: string;
    podProvider?: string;
    // A/B test tracking
    priceTestVariant?: 'A' | 'B';
    isTestPrice?: boolean;
  }
  const orderItems: OrderItem[] = []

    for (const item of cartItems) {
      const design = await prisma.design.findUnique({
        where: { 
          id: item.designId, 
          isActive: true, 
          approvalStatus: 'APPROVED' 
        },
        include: { designer: true },
        // We need the raw design for price test fields
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
      // For A/B test items, use the variant price the user was shown
      let price: number
      let priceTestVariant: 'A' | 'B' | undefined
      let isTestPrice = false
      
      if (item.purchaseType === 'POD' && item.podPrice) {
        price = item.podPrice
      } else if (item.purchaseType === 'OWNERSHIP' && design.ownershipPrice) {
        price = design.ownershipPrice
      } else {
        // Check for A/B price test
        // The cart item may include a 'variant' field indicating which price the user saw
        const effectivePrice = getEffectivePrice(
          {
            price: design.price,
            priceTestActive: design.priceTestActive,
            priceTestVariant: design.priceTestVariant,
            priceTestEndsAt: design.priceTestEndsAt,
          },
          item.variant as 'A' | 'B' | undefined
        )
        price = effectivePrice.price
        priceTestVariant = effectivePrice.variant
        isTestPrice = effectivePrice.isTestPrice
        
        // Security: If user claims variant B but test is not active or variant price doesn't match,
        // fall back to original price (prevents manipulation)
        if (item.variant === 'B' && !effectivePrice.isTestPrice) {
          console.warn(`[Checkout] User tried variant B but test not active for design ${design.id}`)
          price = design.price
          priceTestVariant = 'A'
          isTestPrice = false
        }
      }

      if (item.purchaseType === 'OWNERSHIP' && !design.ownershipPrice) {
        return NextResponse.json(
          { message: `Ownership price not set for design "${design.title}"` },
          { status: 400 }
        )
      }

      const itemTotal = price * item.quantity
      totalAmount += itemTotal

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
          unit_amount: Math.round(price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })

      // Build order item with POD fields if applicable
      const orderItem: OrderItem = {
        designId: design.id,
        quantity: item.quantity,
        price: price,
        purchaseType: item.purchaseType || 'REGULAR',
        designerId: design.designerId,
        designTitle: design.title
      }
      
      // Add POD-specific fields if this is a POD item
      if (isPodItem) {
        orderItem.podProductId = item.podProductId
        orderItem.podProductName = item.podProductName
        orderItem.podProvider = item.podProvider
      }
      
      // Track A/B price test variant if applicable
      if (priceTestVariant) {
        orderItem.priceTestVariant = priceTestVariant
        orderItem.isTestPrice = isTestPrice
        
        // Update the test statistics for this sale
        if (isTestPrice) {
          // Async update - don't block checkout
          prisma.design.update({
            where: { id: design.id },
            data: {
              priceTestSalesB: { increment: item.quantity },
              priceTestRevenueB: { increment: price * item.quantity },
            },
          }).catch(err => console.error('[Checkout] Failed to update price test stats:', err))
        } else {
          prisma.design.update({
            where: { id: design.id },
            data: {
              priceTestSalesA: { increment: item.quantity },
              priceTestRevenueA: { increment: price * item.quantity },
            },
          }).catch(err => console.error('[Checkout] Failed to update price test stats:', err))
        }
      }
      
      orderItems.push(orderItem)
    }

    // Check if any items are POD orders
    const hasPodItems = orderItems.some(item => item.purchaseType === 'POD')

    if (paymentMethod === 'stripe') {
      // Create Stripe checkout session (initialize Stripe lazily)
      // Note: Platform collects full payment, then calculates tiered commission per-seller in webhook
      // Commission rates range from 0.1% (STARTER) to 10% (NEW) based on seller earnings tier
      const stripe = getStripe()
      
      // Build metadata - include shipping address if POD items present
      const sessionMetadata: Record<string, string> = {
        userId: session.user.id,
        orderItems: JSON.stringify(orderItems),
        orderType: hasPodItems ? 'POD' : 'DIGITAL'
      }
      
      // Add shipping address to metadata if POD items exist
      if (hasPodItems && shippingAddress) {
        sessionMetadata.shippingAddress = JSON.stringify(shippingAddress)
      }
      
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems as Stripe.Checkout.SessionCreateParams.LineItem[],
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/cart`,
        customer_email: session.user.email || undefined,
        metadata: sessionMetadata
      })

      return NextResponse.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
        paymentMethod: 'stripe'
      })
    } else if (paymentMethod === 'paystack') {
      console.log('[CHECKOUT] Processing Paystack payment')
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
      
      const paymentReference = `fashion_${Date.now()}_${session.user.id}`
      
      // CREATE ORDER FIRST - this was missing!
      console.log('[CHECKOUT] Creating Paystack order with reference:', paymentReference)
      const paystackOrder = await prisma.order.create({
        data: {
          orderNumber: paymentReference,
          customerId: session.user.id,
          status: 'PENDING',
          totalAmount: totalAmount,
          platformFee: totalPlatformFee,
          paymentMethod: 'PAYSTACK',
          orderType: hasPodItems ? 'POD' : 'DIGITAL',
          items: {
            create: orderItems.map(item => ({
              designId: item.designId,
              quantity: item.quantity,
              price: item.price,
              purchaseType: item.purchaseType || 'REGULAR'
            }))
          },
          ...(hasPodItems && shippingAddress ? {
            shippingName: shippingAddress.fullName,
            shippingAddress1: shippingAddress.address,
            shippingCity: shippingAddress.city,
            shippingState: shippingAddress.state,
            shippingZip: shippingAddress.postalCode,
            shippingCountry: shippingAddress.country,
            shippingPhone: shippingAddress.phone,
          } : {})
        }
      })
      
      console.log('[CHECKOUT] Paystack order created successfully:', {
        id: paystackOrder.id,
        orderNumber: paystackOrder.orderNumber
      })
      
      // Create Paystack transaction with split payments
      const transactionMetadata: Record<string, string | boolean> = {
        userId: session.user.id,
        orderId: paystackOrder.id,
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
        amount: Math.round(amountInNGN * 100), // Paystack expects kobo (NGN * 100)
        currency: 'NGN',
        reference: paymentReference,
        callback_url: `${process.env.NEXTAUTH_URL}/checkout/success?reference=${paymentReference}`,
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
        orderId: paystackOrder.id,
        reference: transaction.data.reference,
        url: transaction.data.authorization_url,
        paymentMethod: 'paystack',
        splitPaymentEnabled: subaccounts.length > 0,
        designersWithSubaccounts: subaccounts.length
      })
    } else if (paymentMethod === 'flutterwave') {
      // Flutterwave for pan-African payments
      const supportedCountries = getSupportedCountries()
      const countryInfo = supportedCountries.find(c => c.code === countryCode) || supportedCountries.find(c => c.code === 'NG')!
      const currency = countryInfo.currency
      const amountLocal = await convertCurrencyLive(totalAmount, currency)

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
        orderData.shippingAddress1 = shippingAddress.address
        orderData.shippingCity = shippingAddress.city
        orderData.shippingState = shippingAddress.state
        orderData.shippingZip = shippingAddress.postalCode
        orderData.shippingCountry = shippingAddress.country
        orderData.shippingPhone = shippingAddress.phone
      }

      // Create pending order first
      const order = await prisma.order.create({
        data: orderData as Parameters<typeof prisma.order.create>[0]['data']
      })

      try {
        // Build Flutterwave meta with POD info if applicable
        const flwMeta: Record<string, string> = {
          orderId: order.id,
          userId: session.user.id,
          platformFee: Math.round(totalAmount * 0.10).toString(),
          orderType: hasPodItems ? 'POD' : 'DIGITAL'
        }
        
        if (hasPodItems && shippingAddress) {
          flwMeta.shippingAddress = JSON.stringify(shippingAddress)
        }
        
        const flwResult = await initFlutterwavePayment({
          orderId: order.id,  // This becomes tx_ref in Flutterwave
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

        // Store Flutterwave reference (order.id is used as tx_ref)
        await prisma.order.update({
          where: { id: order.id },
          data: {
            flutterwaveRef: order.id  // tx_ref in Flutterwave = order.id
          }
        })

        return NextResponse.json({
          orderId: order.id,
          reference: order.id,
          url: flwResult.data.link,
          paymentMethod: 'flutterwave',
          currency: currency,
          amount: amountLocal
        })
      } catch (flwError) {
        // Rollback order if Flutterwave fails
        await prisma.order.delete({ where: { id: order.id } })
        
        // Log Flutterwave error details
        console.error('[CHECKOUT] Flutterwave error:', flwError);
        
        // Check if this is a network/IP block issue (403, Cloudflare, connection error)
        const errorMsg = flwError instanceof Error ? flwError.message : String(flwError);
        const isNetworkIssue = errorMsg.includes('403') || 
                              errorMsg.includes('Forbidden') || 
                              errorMsg.includes('Cloudflare') ||
                              errorMsg.includes('blocked') ||
                              errorMsg.includes('Request failed');
        
        if (isNetworkIssue && paystackConfigured) {
          // For network issues, automatically retry with Paystack
          console.log('[CHECKOUT] Flutterwave network error (likely IP whitelist issue), auto-retrying with Paystack');
          
          const paymentReference = `fashion_${Date.now()}_${session.user.id}`
          
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
              const designerTotal = orderItems
                .filter(item => item.designerId === designerId)
                .reduce((sum, item) => sum + (item.price * item.quantity), 0)

              const commissionRate = getCommissionRate(seller?.totalEarnings || 0)
              const platformFee = designerTotal * commissionRate
              const designerEarnings = designerTotal - platformFee

              subaccounts.push({
                subaccount: sellerAccount.subaccountCode,
                share: Math.round(designerEarnings * 100),
                commissionRate: commissionRate,
                designerTotal: designerTotal
              })
            }
          }

          // Create new order for Paystack
          console.log('[CHECKOUT] Creating Paystack order with reference:', paymentReference)
          const paystackOrder = await prisma.order.create({
            data: {
              orderNumber: paymentReference,
              customerId: session.user.id,
              status: 'PENDING',
              totalAmount: totalAmount,
              platformFee: totalAmount * 0.10,
              paymentMethod: 'PAYSTACK',
              orderType: hasPodItems ? 'POD' : 'DIGITAL',
              items: {
                create: orderItems.map(item => ({
                  designId: item.designId,
                  quantity: item.quantity,
                  price: item.price,
                  purchaseType: item.purchaseType || 'REGULAR'
                }))
              },
              ...(hasPodItems && shippingAddress ? {
                shippingName: shippingAddress.fullName,
                shippingAddress1: shippingAddress.address,
                shippingCity: shippingAddress.city,
                shippingState: shippingAddress.state,
                shippingZip: shippingAddress.postalCode,
                shippingCountry: shippingAddress.country,
                shippingPhone: shippingAddress.phone,
              } : {})
            }
          })

          console.log('[CHECKOUT] Paystack order created successfully:', {
            id: paystackOrder.id,
            orderNumber: paystackOrder.orderNumber,
            customerId: paystackOrder.customerId,
            totalAmount: paystackOrder.totalAmount
          })

          const paystackResult = await paystack.transaction.initialize({
            email: session.user.email || 'customer@example.com',
            amount: Math.round(amountInNGN * 100),
            reference: paymentReference,
            metadata: {
              orderId: paystackOrder.id,
              userId: session.user.id,
              subaccounts: subaccounts,
              orderType: hasPodItems ? 'POD' : 'DIGITAL'
            }
          })

          return NextResponse.json({
            orderId: paystackOrder.id,
            reference: paystackResult.data.reference,
            url: paystackResult.data.authorization_url,
            paymentMethod: 'paystack'
          })
        }
        
        throw flwError;
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
