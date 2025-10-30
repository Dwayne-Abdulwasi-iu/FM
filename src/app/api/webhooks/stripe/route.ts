import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Minimal local types for Stripe webhook payloads (keep narrow and safe)
type StripeOrderItem = {
  designId: string
  quantity: number
  price: number
  purchaseType?: 'REGULAR' | 'OWNERSHIP'
  designerId?: string
}

type StripeCheckoutSession = {
  // Stripe's SDK can set metadata to null — allow null to match runtime shapes
  metadata?: { userId?: string; platformFee?: string; orderItems?: string } | null
  amount_total?: number | null
  payment_intent?: string | null
}

type StripePaymentIntent = {
  id: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { message: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    void error
    console.error('Webhook error:', error)
    return NextResponse.json(
      { message: 'Webhook error' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: unknown) {
  try {
    // Coerce the incoming runtime object to our narrow local shape
    const s = session as StripeCheckoutSession

    const userId = s?.metadata?.userId
    if (!userId) {
      console.error('Stripe checkout.session completed webhook missing metadata.userId, skipping order creation')
      return
    }

    const platformFee = parseFloat(s?.metadata?.platformFee || '0')
    let orderItems: StripeOrderItem[] = []
    try {
      orderItems = JSON.parse(s?.metadata?.orderItems || '[]')
    } catch (err) {
      console.error('Failed to parse orderItems from session metadata:', err)
      orderItems = []
    }

    // Generate unique order number
    const orderNumber = `FM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Determine a stable stripe payment intent id (payment_intent can be string or object)
    let stripePaymentIntentId: string | undefined = undefined
    if (s.payment_intent) {
      if (typeof s.payment_intent === 'string') stripePaymentIntentId = s.payment_intent
      else if (typeof s.payment_intent === 'object' && 'id' in (s.payment_intent as { id?: string })) stripePaymentIntentId = (s.payment_intent as { id?: string }).id
      else stripePaymentIntentId = String(s.payment_intent)
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'COMPLETED',
  totalAmount: (s.amount_total ?? 0) / 100, // Convert from cents
  platformFee: platformFee / 100, // Convert from cents
        customerId: userId,
  stripePaymentIntentId: stripePaymentIntentId,
        items: {
          create: orderItems.map((item: StripeOrderItem) => ({
              designId: item.designId,
              quantity: item.quantity,
              price: item.price,
              purchaseType: item.purchaseType || 'REGULAR'
            }))
        }
      },
      include: {
        items: {
          include: {
            design: {
              include: {
                designer: true
              }
            }
          }
        }
      }
    })

    // Update design sales statistics, create seller earnings, and handle purchases
    for (const item of orderItems) {
      const saleAmount = item.price * item.quantity
      const platformCommission = saleAmount * 0.05 // 5% commission
      const sellerEarning = saleAmount - platformCommission // 95% to seller

      // Build update payload inline (avoid a loosely-typed intermediate variable)
      const designUpdateData = {
        totalSales: { increment: item.quantity },
        totalRevenue: { increment: saleAmount },
        ...(item.purchaseType === 'OWNERSHIP'
          ? { isOwned: true, ownedBy: userId, isActive: false }
          : {})
      }

      await prisma.design.update({
        where: { id: item.designId },
        data: designUpdateData
      })

      // Create seller earning record
      await prisma.sellerEarning.create({
        data: {
          sellerId: (item.designerId ?? '') as string,
          orderId: order.id,
          designId: item.designId,
          saleAmount: saleAmount,
          platformCommission: platformCommission,
          sellerAmount: sellerEarning,
          quantity: item.quantity
        }
      })

      // Create purchase record for access control
      await prisma.purchase.create({
        data: {
          userId: userId,
          designId: item.designId,
          orderId: order.id,
          purchaseType: item.purchaseType || 'REGULAR',
          purchasePrice: item.price,
          accessGranted: true
        }
      })
    }

    // Clear user's cart - need to account for purchase type
    for (const item of orderItems) {
      await prisma.cartItem.deleteMany({
        where: {
          userId,
          designId: item.designId,
          purchaseType: item.purchaseType || 'REGULAR'
        }
      })
    }

    console.log(`Order ${orderNumber} created successfully`)
  } catch (error) {
    void error
    console.error('Error handling checkout completion:', error)
  }
}

async function handlePaymentSucceeded(paymentIntent: unknown) {
  const pi = paymentIntent as StripePaymentIntent
  try {
    // Update order status if needed
    await prisma.order.updateMany({
      where: {
        stripePaymentIntentId: pi.id
      },
      data: {
        status: 'COMPLETED'
      }
    })

    console.log(`Payment ${pi.id} succeeded`)
  } catch (error) {
    void error
    console.error('Error handling payment success:', error)
  }
}