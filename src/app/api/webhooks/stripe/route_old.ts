import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
// ...existing code...
import prisma from '@/lib/prisma'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
async function handleCheckoutCompleted(session: any) {
  // Implement order creation and stats update logic here
}

async function handlePaymentSucceeded(paymentIntent: any) {
  // Implement payment success logic here
}
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event

    try {
      const stripe = getStripe()
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
    console.error('Webhook error:', error)
    return NextResponse.json(
      { message: 'Webhook error' },
      { status: 500 }
    )
  }
}



async function handlePaymentSucceeded(paymentIntent: any) {
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
    console.error('Error handling payment success:', error)
  }
}