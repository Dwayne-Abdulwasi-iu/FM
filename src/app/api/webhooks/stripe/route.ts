import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'
import { checkAndPromoteDesigners } from '@/lib/seller-promotion'
import { sendPaymentReceivedToDesigner, sendAdminPODAlert, sendSaleNotificationEmail } from '@/lib/email'
import { getCommissionRate, getCommissionTier } from '@/lib/commission-tiers'
import { checkAndUpdateSellerTier } from '@/lib/tier-management'
import { fulfillPODOrder } from '@/lib/pod-service'
import { queueFailedNotification } from '@/lib/notification-queue'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Minimal local types for Stripe webhook payloads (keep narrow and safe)
type StripeOrderItem = {
  designId: string
  quantity: number
  price: number
  purchaseType?: 'REGULAR' | 'OWNERSHIP' | 'POD'
  designerId?: string
  designTitle?: string
  podProductId?: string
  podVariantId?: string
  podProductName?: string
}

type StripeCheckoutSession = {
  // Stripe's SDK can set metadata to null — allow null to match runtime shapes
  metadata?: { 
    userId?: string
    platformFee?: string
    orderItems?: string
    shippingAddress?: string
    // Commission-specific fields
    type?: string
    commissionRequestId?: string
    designerId?: string
    requesterId?: string
    designerEarnings?: string
  } | null
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
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { message: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // IDEMPOTENCY: Check if we've already processed this event
    const existingEvent = await prisma.processedWebhookEvent.findUnique({
      where: { eventId: event.id }
    })
    
    if (existingEvent) {
      console.log(`Duplicate Stripe event ${event.id}, skipping`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Record this event as being processed
    await prisma.processedWebhookEvent.create({
      data: {
        eventId: event.id,
        provider: 'stripe',
        eventType: event.type
      }
    })

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

    // Check if this is a commission payment
    if (s?.metadata?.type === 'commission') {
      await handleCommissionPaymentCompleted(s)
      return
    }

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
      const sellerId = (item.designerId ?? '') as string
      
      // Get seller's current tier and calculate dynamic commission
      const seller = await prisma.user.findUnique({
        where: { id: sellerId },
        select: { totalEarnings: true, designerTier: true }
      })
      
      const totalEarnings = seller?.totalEarnings ?? 0
      const isProSubscriber = seller?.designerTier === 'VIP_DESIGNER' || seller?.designerTier === 'VVIP_DESIGNER'
      const commissionRate = getCommissionRate(totalEarnings, isProSubscriber)
      const tier = getCommissionTier(totalEarnings)
      
      const platformCommission = saleAmount * commissionRate
      const sellerEarning = saleAmount - platformCommission
      
      console.log(`[Stripe Tiered Commission] Seller ${sellerId}: Tier=${tier}, Rate=${(commissionRate * 100).toFixed(1)}%, Commission=$${platformCommission.toFixed(2)}`)

      // For ownership purchases, use atomic conditional update to prevent race conditions
      if (item.purchaseType === 'OWNERSHIP') {
        // Only set ownership if not already owned (atomic check)
        const updateResult = await prisma.design.updateMany({
          where: { 
            id: item.designId,
            isOwned: false // Atomic condition - only update if not already owned
          },
          data: {
            totalSales: { increment: item.quantity },
            totalRevenue: { increment: saleAmount },
            isOwned: true,
            ownedBy: userId,
            isActive: false
          }
        })
        
        if (updateResult.count === 0) {
          // Design was already owned - this shouldn't happen but log for debugging
          console.error(`Race condition detected: Design ${item.designId} was purchased for ownership but is already owned`)
          // Continue processing other items - the customer will need a refund for this item
          continue
        }
      } else {
        // Regular purchase - just update stats
        await prisma.design.update({
          where: { id: item.designId },
          data: {
            totalSales: { increment: item.quantity },
            totalRevenue: { increment: saleAmount }
          }
        })
      }

      // Create seller earning record
      await prisma.sellerEarning.create({
        data: {
          sellerId: sellerId,
          orderId: order.id,
          designId: item.designId,
          saleAmount: saleAmount,
          platformCommission: platformCommission,
          sellerAmount: sellerEarning,
          quantity: item.quantity
        }
      })

      // Send sale notification email to seller
      const sellerUser = await prisma.user.findUnique({
        where: { id: sellerId },
        select: { email: true, name: true, displayName: true }
      })
      
      if (sellerUser?.email) {
        sendSaleNotificationEmail(
          sellerUser.email,
          sellerUser.displayName || sellerUser.name || 'Designer',
          item.designTitle || 'Design',
          saleAmount,
          sellerEarning,
          item.purchaseType || 'REGULAR'
        ).catch(err => console.error('Failed to send sale notification:', err))
      }

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
      
      // Store previous earnings before updating (for tier change detection)
      const previousEarnings = totalEarnings
      
      // Update seller's total earnings
      await prisma.user.update({
        where: { id: sellerId },
        data: {
          totalEarnings: { increment: sellerEarning },
          totalSales: { increment: item.quantity }
        }
      })
      
      // Check if seller crossed a tier threshold (for future Paystack payments)
      const tierResult = await checkAndUpdateSellerTier(sellerId, previousEarnings)
      if (tierResult.tierChanged) {
        console.log(`[Stripe Tier Change] ${tierResult.message}`)
      }
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

    // Handle POD fulfillment if this order has POD items
    const podItems = orderItems.filter((item: StripeOrderItem) => item.purchaseType === 'POD')
    if (podItems.length > 0) {
      // Parse shipping address from metadata
      let rawShippingAddress: {
        fullName?: string
        name?: string
        address?: string
        address1?: string
        address2?: string
        city: string
        state?: string
        country: string
        postalCode?: string
        zip?: string
        phone?: string
      } | undefined
      
      try {
        if (s?.metadata?.shippingAddress) {
          rawShippingAddress = JSON.parse(s.metadata.shippingAddress)
        }
      } catch (e) {
        console.error('[POD] Failed to parse shipping address:', e)
      }

      if (rawShippingAddress) {
        // Normalize shipping address fields (checkout sends different field names)
        const shippingAddress = {
          name: rawShippingAddress.fullName || rawShippingAddress.name || '',
          address1: rawShippingAddress.address || rawShippingAddress.address1 || '',
          address2: rawShippingAddress.address2 || '',
          city: rawShippingAddress.city,
          state: rawShippingAddress.state,
          country: rawShippingAddress.country,
          zip: rawShippingAddress.postalCode || rawShippingAddress.zip || '',
          phone: rawShippingAddress.phone
        }
        
        console.log(`[POD] Fulfilling ${podItems.length} POD items for order ${order.id}`)
        
        // Get design image URLs for POD fulfillment
        const podFulfillmentItems = await Promise.all(
          podItems.map(async (item: StripeOrderItem) => {
            const design = await prisma.design.findUnique({
              where: { id: item.designId },
              select: { imageUrl: true }
            })
            return {
              productId: item.podProductId || '',
              variantId: item.podVariantId || '',
              quantity: item.quantity,
              designImageUrl: design?.imageUrl || ''
            }
          })
        )

        const fulfillResult = await fulfillPODOrder(order.id, podFulfillmentItems, shippingAddress)
        
        if (fulfillResult.success) {
          // Update order with POD provider info
          await prisma.order.update({
            where: { id: order.id },
            data: {
              orderType: 'POD',
              podProvider: fulfillResult.provider,
              podOrderId: fulfillResult.podOrderId,
              podStatus: 'pending',
              shippingName: shippingAddress.name,
              shippingAddress1: shippingAddress.address1,
              shippingAddress2: shippingAddress.address2,
              shippingCity: shippingAddress.city,
              shippingState: shippingAddress.state,
              shippingCountry: shippingAddress.country,
              shippingZip: shippingAddress.zip,
              shippingPhone: shippingAddress.phone
            }
          })
          console.log(`[POD] Order fulfilled via ${fulfillResult.provider}: ${fulfillResult.podOrderId}`)
        } else {
          console.error(`[POD] Fulfillment failed for order ${order.id}:`, fulfillResult.error)
          
          // Update order status to indicate POD failure
          await prisma.order.update({
            where: { id: order.id },
            data: {
              orderType: 'POD',
              podStatus: 'fulfillment_failed',
            }
          })
          
          // Alert admin about POD fulfillment failure
          const alertSent = await sendAdminPODAlert({
            orderNumber: orderNumber,
            orderId: order.id,
            status: 'fulfillment_failed',
            provider: 'Unknown',
            reason: fulfillResult.error || 'POD provider order creation failed',
            customerEmail: undefined,
            totalAmount: (s.amount_total ?? 0) / 100
          })
          
          // Queue for retry if alert failed
          if (!alertSent) {
            await queueFailedNotification('email', {
              emailType: 'admin_alert',
              orderId: orderNumber,
              reason: fulfillResult.error || 'POD fulfillment failed',
              to: process.env.ADMIN_EMAIL || '',
            }, 'Admin alert failed to send')
          }
        }
      } else {
        console.error(`[POD] Missing shipping address for POD order ${order.id}`)
      }
    }

    // Check if any designers should be auto-promoted to SELLER role
    const designerIds = orderItems
      .map((item: StripeOrderItem) => item.designerId)
      .filter((id): id is string => !!id)
    
    if (designerIds.length > 0) {
      await checkAndPromoteDesigners(designerIds)
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

/**
 * Handle commission payment completion via Stripe
 */
async function handleCommissionPaymentCompleted(session: StripeCheckoutSession) {
  try {
    const metadata = session.metadata
    if (!metadata) {
      console.error('Commission payment missing metadata')
      return
    }

    const { commissionRequestId, designerId: _designerId, requesterId: _requesterId, platformFee, designerEarnings } = metadata
    
    if (!commissionRequestId) {
      console.error('Commission payment missing commissionRequestId')
      return
    }

    // Determine payment intent ID for tracking
    let paymentIntentId: string | undefined = undefined
    if (session.payment_intent) {
      if (typeof session.payment_intent === 'string') {
        paymentIntentId = session.payment_intent
      } else if (typeof session.payment_intent === 'object' && 'id' in (session.payment_intent as { id?: string })) {
        paymentIntentId = (session.payment_intent as { id?: string }).id
      }
    }

    // Update commission request to PAID status
    const updatedRequest = await prisma.commissionRequest.update({
      where: { id: commissionRequestId },
      data: {
        status: 'PAID',
        isPaid: true,
        paidAt: new Date(),
        platformFee: parseFloat(platformFee || '0'),
        designerEarnings: parseFloat(designerEarnings || '0'),
        paymentMethod: 'STRIPE',
        paymentReference: paymentIntentId,
      },
      include: {
        requester: {
          select: { name: true, displayName: true },
        },
        designer: {
          select: { email: true, name: true, displayName: true },
        },
      },
    })

    console.log(`Commission ${commissionRequestId} marked as PAID via Stripe`)

    // Send email notification to designer
    if (updatedRequest.designer?.email) {
      const requesterName = updatedRequest.requester?.displayName || 
                           updatedRequest.requester?.name || 
                           'Client'
      
      try {
        await sendPaymentReceivedToDesigner({
          designerEmail: updatedRequest.designer.email,
          designerName: updatedRequest.designer.displayName || updatedRequest.designer.name || 'Designer',
          requesterName,
          title: updatedRequest.title,
          amount: updatedRequest.designerQuote || 0,
          designerEarnings: parseFloat(designerEarnings || '0'),
          commissionId: commissionRequestId,
        })
        console.log(`Payment notification email sent to designer ${updatedRequest.designer.email}`)
      } catch (emailError) {
        console.error('Failed to send payment notification email:', emailError)
      }
    }

  } catch (error) {
    console.error('Error handling commission payment completion:', error)
  }
}