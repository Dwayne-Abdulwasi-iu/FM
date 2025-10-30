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
  metadata: {
    userId: string
    platformFee: string
    orderItems: string
  }
  amount_total: number
  payment_intent?: string
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

async function handleCheckoutCompleted(session: StripeCheckoutSession) {
  try {
    const userId = session.metadata.userId
    const platformFee = parseFloat(session.metadata.platformFee)
    const orderItems: StripeOrderItem[] = JSON.parse(session.metadata.orderItems)

    // Generate unique order number
    const orderNumber = `FM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'COMPLETED',
        totalAmount: session.amount_total / 100, // Convert from cents
        platformFee: platformFee / 100, // Convert from cents
        customerId: userId,
        stripePaymentIntentId: session.payment_intent,
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

      // Update design statistics
      const updateData = {
        totalSales: { increment: item.quantity },
        totalRevenue: { increment: saleAmount } // Total revenue (before commission)
      }

      // Handle ownership transfer
      if (item.purchaseType === 'OWNERSHIP') {
        updateData.isOwned = true
        updateData.ownedBy = userId
        updateData.isActive = false // Make design unavailable for future purchases
      }

      await prisma.design.update({
        where: { id: item.designId },
        data: updateData
      })

      // Create seller earning record
      await prisma.sellerEarning.create({
        data: {
          sellerId: item.designerId,
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

async function handlePaymentSucceeded(paymentIntent: StripePaymentIntent) {
  try {
    // Update order status if needed
    await prisma.order.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id
      },
      data: {
        status: 'COMPLETED'
      }
    })

    console.log(`Payment ${paymentIntent.id} succeeded`)
  } catch (error) {
    void error
    console.error('Error handling payment success:', error)
  }
}