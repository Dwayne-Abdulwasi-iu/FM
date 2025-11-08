import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    const { provider, id } = await request.json() as { provider: 'stripe' | 'paystack'; id: string }
    if (!provider || !id) {
      return NextResponse.json({ message: 'provider and id are required' }, { status: 400 })
    }

    if (provider === 'stripe') {
      return NextResponse.json(await syncStripeOrder(id, session.user.id))
    }

    if (provider === 'paystack') {
      return NextResponse.json(await syncPaystackOrder(id, session.user.id))
    }

    return NextResponse.json({ message: 'Unsupported provider' }, { status: 400 })
  } catch (error) {
    console.error('Order sync error:', error)
    const maybe = prismaErrorResponse(error)
    if (maybe) return maybe
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

async function syncStripeOrder(checkoutSessionId: string, userId: string) {
  // Try existing order by PI or orderNumber first
  let created = false

  // Retrieve Checkout Session
  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId)
  const paymentIntentId = typeof checkoutSession.payment_intent === 'string'
    ? checkoutSession.payment_intent
    : (checkoutSession.payment_intent && typeof checkoutSession.payment_intent === 'object' && 'id' in checkoutSession.payment_intent
      ? (checkoutSession.payment_intent as { id: string }).id
      : '')

  // Look up existing order
  let order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntentId, customerId: userId },
    include: {
      items: { include: { design: { include: { designer: true } } } }
    }
  })

  if (!order) {
    const metadata = checkoutSession.metadata || undefined
    const userIdMeta = metadata?.userId
    const platformFeeCents = parseFloat(metadata?.platformFee || '0') || 0
    const orderItemsMeta = metadata?.orderItems ? JSON.parse(metadata.orderItems) as Array<{
      designId: string; quantity: number; price: number; purchaseType?: 'REGULAR' | 'OWNERSHIP'
    }> : []

    if (userIdMeta !== userId) {
      return { message: 'Session does not belong to the current user' , status: 403 }
    }

    if (checkoutSession.payment_status !== 'paid' || orderItemsMeta.length === 0) {
      return { message: 'Payment not completed or missing items', status: 409 }
    }

    const orderNumber = `FM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const amountTotalCents = checkoutSession.amount_total ?? 0

    order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'COMPLETED',
        totalAmount: amountTotalCents / 100,
        platformFee: platformFeeCents / 100,
        customerId: userId,
        stripePaymentIntentId: paymentIntentId,
        items: {
          create: orderItemsMeta.map((item) => ({
            designId: item.designId,
            quantity: item.quantity,
            price: item.price,
            purchaseType: item.purchaseType || 'REGULAR'
          }))
        }
      },
      include: { items: { include: { design: { include: { designer: true } } } } }
    })
    created = true

    // Update design stats, earnings, and purchases
    for (const item of order.items) {
      const saleAmount = item.price * item.quantity
      const platformCommission = saleAmount * 0.05
      const sellerEarning = saleAmount - platformCommission

      const updateData: {
        totalSales: { increment: number }
        totalRevenue: { increment: number }
        isOwned?: boolean
        ownedBy?: string
        isActive?: boolean
      } = {
        totalSales: { increment: item.quantity },
        totalRevenue: { increment: saleAmount }
      }

      if (item.purchaseType === 'OWNERSHIP') {
        updateData.isOwned = true
        updateData.ownedBy = userId
        updateData.isActive = false
      }

      await prisma.design.update({ where: { id: item.designId }, data: updateData })

      await prisma.sellerEarning.create({
        data: {
          sellerId: item.design.designerId,
          orderId: order.id,
          designId: item.designId,
          saleAmount,
          platformCommission,
          sellerAmount: sellerEarning,
          quantity: item.quantity,
        }
      })

      await prisma.purchase.create({
        data: {
          userId,
          designId: item.designId,
          orderId: order.id,
          purchaseType: item.purchaseType || 'REGULAR',
          purchasePrice: item.price,
          accessGranted: true,
        }
      })
    }

    // Clear cart
    for (const item of orderItemsMeta) {
      await prisma.cartItem.deleteMany({
        where: { userId, designId: item.designId, purchaseType: item.purchaseType || 'REGULAR' }
      })
    }
  }

  return { order, created }
}

async function syncPaystackOrder(reference: string, userId: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return { message: 'Paystack not configured', status: 503 }
  }

  // Verify transaction with Paystack
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}` , {
    headers: { Authorization: `Bearer ${secret}` }
  })

  if (!res.ok) {
    return { message: 'Failed to verify transaction with Paystack', status: 502 }
  }

  const data = await res.json()
  const charge = data?.data
  if (!charge || charge.status !== 'success') {
    return { message: 'Transaction not successful', status: 409 }
  }

  const metadata = charge.metadata || {}
  const userIdMeta = metadata.userId
  const platformFee = parseFloat(metadata.platformFee || '0') || 0
  const orderItems = metadata.orderItems ? JSON.parse(metadata.orderItems) as Array<{
    designId: string; quantity: number; price: number; purchaseType?: 'REGULAR' | 'OWNERSHIP'
  }> : []
  const originalAmountUSD = parseFloat(metadata.originalAmountUSD || '0') || 0

  if (userIdMeta !== userId) {
    return { message: 'Reference does not belong to the current user', status: 403 }
  }

  // Check if order already exists
  let order = await prisma.order.findFirst({
    where: { OR: [ { stripePaymentIntentId: reference }, { orderNumber: reference } ], customerId: userId },
    include: { items: { include: { design: { include: { designer: true } } } } }
  })

  if (!order) {
    order = await prisma.order.create({
      data: {
        orderNumber: reference,
        customerId: userId,
        totalAmount: originalAmountUSD,
        platformFee: platformFee,
        status: 'COMPLETED',
        stripePaymentIntentId: reference,
        items: {
          create: orderItems.map((item) => ({
            designId: item.designId,
            quantity: item.quantity,
            price: item.price,
            purchaseType: item.purchaseType || 'REGULAR'
          }))
        }
      },
      include: { items: { include: { design: { include: { designer: true } } } } }
    })

    // Update stats, earnings, and purchases
    for (const item of order.items) {
      const saleAmount = item.price * item.quantity
      const commission = saleAmount * 0.05
      const sellerAmount = saleAmount - commission

      const updateData: {
        totalSales: { increment: number }
        totalRevenue: { increment: number }
        isOwned?: boolean
        ownedBy?: string
        isActive?: boolean
      } = {
        totalSales: { increment: item.quantity },
        totalRevenue: { increment: saleAmount }
      }

      if (item.purchaseType === 'OWNERSHIP') {
        updateData.isOwned = true
        updateData.ownedBy = userId
        updateData.isActive = false
      }

      await prisma.design.update({ where: { id: item.designId }, data: updateData })

      await prisma.sellerEarning.create({
        data: {
          saleAmount,
          platformCommission: commission,
          sellerAmount,
          quantity: item.quantity,
          sellerId: item.design.designerId,
          orderId: order.id,
          designId: item.designId,
        }
      })

      await prisma.purchase.create({
        data: {
          userId,
          designId: item.designId,
          orderId: order.id,
          purchaseType: item.purchaseType || 'REGULAR',
          purchasePrice: item.price,
          accessGranted: true,
        }
      })
    }

    // Clear cart
    for (const item of orderItems) {
      await prisma.cartItem.deleteMany({
        where: { userId, designId: item.designId, purchaseType: item.purchaseType || 'REGULAR' }
      })
    }
  }

  return { order, created: false }
}
