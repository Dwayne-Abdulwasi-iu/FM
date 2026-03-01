import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'
import { checkAndPromoteDesigners } from '@/lib/seller-promotion'
import { sendPaymentReceivedToDesigner, sendAdminPODAlert, sendSaleNotificationEmail, sendEmail } from '@/lib/email'
import { getCommissionRate, getCommissionTier } from '@/lib/commission-tiers'
import { checkAndUpdateSellerTier, activateProSubscription } from '@/lib/tier-management'
import { fulfillPODOrder } from '@/lib/pod-service'
import { queueFailedNotification } from '@/lib/notification-queue'
import { createOwnershipContract } from '@/lib/ownership-documents'
import { validateDesignOwnershipState } from '@/lib/ownership-validation'
import { incrementPromotionUsage } from '@/lib/promotion-engine'

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
  // Promotion tracking
  promotionId?: string | null
  promotionType?: string | null
  discountAmount?: number
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
    quotedCommissionRate?: string
    quotedDesignerTier?: string
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
    const stripe = getStripe()

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
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object)
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, stripe)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error instanceof Error ? error.message : 'Unknown error')
    // SECURITY: Do NOT log full error or request body which may contain sensitive data
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: 'Invalid JSON in webhook body' },
        { status: 400 }
      )
    }

    // Handle database errors (transient) 
    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { message: 'Database temporarily unavailable' },
        { status: 503 }
      )
    }

    // Generic server error (still return 200-ish for webhook, but log for debugging)
    // Webhooks should generally return 200 to prevent retries, but we return 500 for internal errors
    return NextResponse.json(
      { message: 'Webhook processing error' },
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
              purchaseType: item.purchaseType || 'REGULAR',
              // Store promotion data for tracking
              promotionId: item.promotionId || null,
              promotionType: item.promotionType || null,
              discountAmount: item.discountAmount || 0,
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
      const purchase = await prisma.purchase.create({
        data: {
          userId: userId,
          designId: item.designId,
          orderId: order.id,
          purchaseType: item.purchaseType || 'REGULAR',
          purchasePrice: item.price,
          accessGranted: true
        }
      })

      // For OWNERSHIP purchases, create the ownership contract (with idempotency check)
      if (item.purchaseType === 'OWNERSHIP') {
        try {
          // Check if contract already exists (idempotency)
          const existingContract = await prisma.ownershipContract.findUnique({
            where: { purchaseId: purchase.id }
          })

          if (existingContract) {
            console.log(`[Ownership] Contract already exists for purchase ${purchase.id}, skipping creation`)
          } else {
            // Get the approved ownership document for this design
            const ownershipDoc = await prisma.ownershipDocument.findFirst({
              where: {
                designId: item.designId,
                status: 'APPROVED'
              },
              select: {
                id: true,
                sellerFullName: true,
                sellerSignature: true
              }
            })

            if (ownershipDoc) {
              // Get buyer info
              const buyer = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  name: true,
                  displayName: true
                }
              })

              // Create the ownership contract
              await createOwnershipContract(
                purchase.id,
                userId,
                sellerId,
                buyer?.name || 'Buyer',
                buyer?.displayName || undefined,
                buyer?.name || 'Buyer',
                item.designId,
                item.designTitle || 'Design',
                ownershipDoc.id,
                ownershipDoc.sellerFullName,
                ownershipDoc.sellerSignature
              )

              // FLAW FIX #14: Validate ownership state after contract creation
              try {
                const validation = await validateDesignOwnershipState(item.designId)
                if (!validation.isValid) {
                  console.error(
                    `[Ownership] CRITICAL: State validation failed for design ${item.designId}: ${validation.error}`,
                    { validation }
                  )
                  // Alert admin but don't block the transaction
                  try {
                    await sendEmail({
                      to: process.env.ADMIN_EMAIL || 'admin@example.com',
                      subject: 'CRITICAL: Design Ownership State Inconsistency',
                      html: `
                        <h2>Design Ownership State Validation Failed</h2>
                        <p>Design ID: ${item.designId}</p>
                        <p>Validation Error: ${validation.error}</p>
                        <p>Active Contracts: ${validation.activeContracts}</p>
                        <p>Design isOwned: ${validation.actualOwned}</p>
                        <p>Please investigate immediately and run repair script if needed.</p>
                      `
                    })
                  } catch (emailErr) {
                    console.error('Failed to send state validation alert email', emailErr)
                  }
                }
              } catch (validationErr) {
                console.error(
                  `[Ownership] Error validating design state after contract creation:`,
                  validationErr
                )
              }

              console.log(`[Ownership] Contract created for purchase ${purchase.id}`)
            } else {
              console.warn(`[Ownership] No approved document found for design ${item.designId}`)
            }
          }
        } catch (contractError) {
          console.error(`[Ownership] Failed to create ownership contract:`, contractError)
          // Don't fail the payment - ownership contract creation is async
        }
      }
      
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

    // Check if any designers should be auto-promoted to SELLER role    // Get array of promotion IDs that were used in this order
    const promotionIds = orderItems
      .filter(item => item.promotionId)
      .map(item => item.promotionId as string)
    
    // Increment promotion usage if any were applied
    if (promotionIds.length > 0) {
      const uniquePromotionIds = [...new Set(promotionIds)]
      for (const promotionId of uniquePromotionIds) {
        await prisma.promotion.update({
          where: { id: promotionId },
          data: { usageCount: { increment: 1 } }
        }).catch(err => console.error(`[Stripe] Failed to increment promotion ${promotionId}:`, err))
      }
      console.log(`[Stripe] Incremented usage for ${uniquePromotionIds.length} promotions`)
    }
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

    const { commissionRequestId, platformFee, designerEarnings, quotedCommissionRate, quotedDesignerTier } = metadata
    
    if (!commissionRequestId) {
      console.error('Commission payment missing commissionRequestId')
      return
    }

    // Determine payment intent ID - use as unique key for idempotency
    let paymentIntentId: string | undefined = undefined
    if (session.payment_intent) {
      if (typeof session.payment_intent === 'string') {
        paymentIntentId = session.payment_intent
      } else if (typeof session.payment_intent === 'object' && 'id' in (session.payment_intent as { id?: string })) {
        paymentIntentId = (session.payment_intent as { id?: string }).id
      }
    }

    if (!paymentIntentId) {
      console.error('Commission payment missing payment intent ID')
      return
    }

    // CRITICAL: Use payment intent ID as unique constraint to prevent duplicate payments
    // This ensures only ONE webhook can succeed for a given payment
    const updateResult = await prisma.commissionRequest.updateMany({
      where: {
        id: commissionRequestId,
        isPaid: false, // Only update if not already paid
        stripePaymentIntentId: null, // Only update if payment intent not yet recorded
      },
      data: {
        status: 'PAID',
        isPaid: true,
        paidAt: new Date(),
        platformFee: parseFloat(platformFee || '0'),
        designerEarnings: parseFloat(designerEarnings || '0'),
        paymentMethod: 'STRIPE',
        paymentReference: paymentIntentId,
        stripePaymentIntentId: paymentIntentId, // Lock this payment intent
      },
    })

    if (updateResult.count === 0) {
      // Payment was already processed or invalid state
      console.log(`Commission ${commissionRequestId} already processed or invalid state, skipping`)
      return
    }

    console.log(`Commission ${commissionRequestId} marked as PAID via Stripe (intent: ${paymentIntentId})`)

    // Fetch updated request for email notification
    const updatedRequest = await prisma.commissionRequest.findUnique({
      where: { id: commissionRequestId },
      include: {
        requester: {
          select: { name: true, displayName: true },
        },
        designer: {
          select: { email: true, name: true, displayName: true },
        },
      },
    })

    // Send email notification to designer
    if (updatedRequest?.designer?.email) {
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

/**
 * Handle Stripe refunds for commission payments
 * When a buyer requests a refund, we need to update the commission request status
 */
async function handleChargeRefunded(charge: unknown) {
  try {
    const c = charge as { id?: string; payment_intent?: string | { id?: string } }
    if (!c?.id) {
      console.error('Refund event missing charge ID')
      return
    }

    // Extract payment intent ID
    let paymentIntentId: string | undefined
    if (c.payment_intent) {
      if (typeof c.payment_intent === 'string') {
        paymentIntentId = c.payment_intent
      } else if (typeof c.payment_intent === 'object' && 'id' in (c.payment_intent as { id?: string })) {
        paymentIntentId = (c.payment_intent as { id?: string }).id
      }
    }

    if (!paymentIntentId) {
      console.error('Refund event missing payment intent ID')
      return
    }

    // Find the commission request by payment intent
    const commissionRequest = await prisma.commissionRequest.findFirst({
      where: {
        stripePaymentIntentId: paymentIntentId,
      },
      include: {
        requester: { select: { email: true, name: true, displayName: true } },
        designer: { select: { email: true, name: true, displayName: true } },
      },
    })

    if (!commissionRequest) {
      console.warn(`Refund for unknown payment intent: ${paymentIntentId}`)
      return
    }

    // Update commission request to REFUNDED status
    const _updatedRequest = await prisma.commissionRequest.update({
      where: { id: commissionRequest.id },
      data: {
        status: 'REFUNDED',
        isPaid: false, // Mark as no longer paid
        platformFee: 0,
        designerEarnings: 0,
      },
    })

    console.log(`Commission ${commissionRequest.id} marked as REFUNDED via Stripe (charge: ${c.id})`)

    // Notify designer about refund
    if (commissionRequest.designer?.email) {
      try {
        await sendPaymentReceivedToDesigner({
          designerEmail: commissionRequest.designer.email,
          designerName: commissionRequest.designer.displayName || commissionRequest.designer.name || 'Designer',
          requesterName: commissionRequest.requester?.displayName || commissionRequest.requester?.name || 'Client',
          title: commissionRequest.title,
          amount: 0,
          designerEarnings: 0,
          commissionId: commissionRequest.id,
        })
        console.log(`Refund notification sent to designer ${commissionRequest.designer.email}`)
      } catch (emailError) {
        console.error('Failed to send refund notification:', emailError)
      }
    }

    // Notify requester (buyer)
    if (commissionRequest.requester?.email) {
      console.log(`Refund processed for requester ${commissionRequest.requester.email}`)
    }
  } catch (error) {
    console.error('Error handling charge refunded:', error)
  }
}

/**
 * Handle Pro subscription creation
 */
async function handleSubscriptionCreated(subscription: unknown, stripe: ReturnType<typeof getStripe>) {
  try {
    const sub = subscription as {
      id?: string
      customer?: string
      metadata?: { userId?: string; billingPeriod?: string; tier?: string }
      current_period_end?: number
    }

    if (!sub.id || !sub.customer) {
      console.log('[Pro Subscription] Missing subscription or customer ID')
      return
    }

    const userId = sub.metadata?.userId
    if (!userId) {
      console.log('[Pro Subscription] Missing userId in metadata')
      return
    }

    const billingPeriod = sub.metadata?.billingPeriod === 'YEARLY' ? 'YEARLY' : 'MONTHLY'
    const tier = sub.metadata?.tier || 'PRO' // Default to PRO if not specified
    const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Check if already activated (idempotency)
    const existing = await prisma.proSubscription.findUnique({
      where: { userId }
    }).catch(() => null)
    
    if (existing?.status === 'ACTIVE') {
      console.log(`[Pro Subscription] Already activated for user ${userId}, skipping`)
      return
    }

    // Activate Pro subscription
    const result = await activateProSubscription(
      userId,
      billingPeriod,
      0, // Amount will be set by webhook
      sub.id
    )

    if (result.success) {
      console.log(`[Pro Subscription] Activated for user ${userId} via Stripe: ${sub.id} (tier: ${tier})`)
      
      // Update user's subscription tier
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: tier,
          subscriptionPrice: tier === 'STARTER' ? 4.99 : tier === 'VIP' ? 14.99 : 9.99,
          billingCycle: billingPeriod
        }
      }).catch(() => null)
      
      // Retrieve customer email for logging
      try {
        const customer = await stripe.customers.retrieve(sub.customer as string)
        if ('email' in customer && customer.email) {
          console.log(`[Pro Subscription] Customer email: ${customer.email}`)
          
          // Send confirmation email
          const seller = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, displayName: true, name: true }
          })
          
          if (seller?.email) {
            try {
              const sellerName = seller.displayName || seller.name || 'Seller'
              const expiresDate = new Date(expiresAt).toLocaleDateString()
              
              // Get tier benefits
              let tierBenefits = ''
              if (tier === 'STARTER') {
                tierBenefits = '<li>1% commission discount on all sales</li>'
              } else if (tier === 'PRO') {
                tierBenefits = '<li>+1 tier boost above your natural tier</li><li>6 featured listings</li><li>1% commission discount on all sales</li>'
              } else if (tier === 'VIP') {
                tierBenefits = '<li>+1 tier boost above your natural tier</li><li>10 featured listings</li><li>2% commission discount on all sales</li><li>Priority support</li>'
              }
              
              await sendEmail({
                to: seller.email,
                subject: `${tier} Subscription Activated`,
                html: `
                  <h2>Welcome to ${tier} Subscription!</h2>
                  <p>Hi ${sellerName},</p>
                  <p>Your ${tier} subscription has been successfully activated!</p>
                  <p><strong>Plan:</strong> ${billingPeriod === 'YEARLY' ? 'Yearly' : 'Monthly'}</p>
                  <p><strong>Expires:</strong> ${expiresDate}</p>
                  <p><strong>Benefits:</strong></p>
                  <ul>
                    ${tierBenefits}
                  </ul>
                  <p>Thank you for upgrading!</p>
                `
              })
              console.log(`${tier} subscription confirmation sent to ${seller.email}`)
            } catch (emailError) {
              console.error('Failed to send Stripe subscription confirmation email:', emailError)
            }
          }
        }
      } catch (customerError) {
        console.error('[Pro Subscription] Error retrieving customer:', customerError)
      }
    } else {
      console.error(`[Pro Subscription] Failed to activate: ${result.message}`)
    }
  } catch (error) {
    console.error('[Pro Subscription] Error handling subscription created:', error)
  }
}

/**
 * Handle Pro subscription updates (e.g., billing period changed)
 */
async function handleSubscriptionUpdated(subscription: unknown) {
  try {
    const sub = subscription as {
      id?: string
      customer?: string
      metadata?: { userId?: string }
      current_period_end?: number
      status?: string
    }

    if (!sub.id) return

    const userId = sub.metadata?.userId
    if (!userId) return

    // Update expiration if period end changed
    if (sub.current_period_end) {
      await prisma.proSubscription.update({
        where: { userId },
        data: {
          expiresAt: new Date(sub.current_period_end * 1000),
          status: sub.status === 'active' ? 'ACTIVE' : sub.status === 'canceled' ? 'CANCELLED' : 'EXPIRED'
        }
      })
      console.log(`[Pro Subscription] Updated for user ${userId}`)
    }
  } catch (error) {
    console.error('[Pro Subscription] Error handling subscription updated:', error)
  }
}

/**
 * Handle Pro subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: unknown) {
  try {
    const sub = subscription as {
      metadata?: { userId?: string }
    }

    const userId = sub.metadata?.userId
    if (!userId) return

    // Mark subscription as cancelled
    await prisma.proSubscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    })

    // Deactivate Pro subscription in user
    await prisma.user.update({
      where: { id: userId },
      data: { proSubscriptionActive: false }
    })

    console.log(`[Pro Subscription] Cancelled for user ${userId}`)
  } catch (error) {
    console.error('[Pro Subscription] Error handling subscription deleted:', error)
  }
}

/**
 * Handle recurring invoice payment success (monthly/yearly renewals)
 */
async function handleInvoicePaymentSucceeded(invoice: unknown) {
  try {
    const inv = invoice as {
      subscription?: string
      metadata?: { userId?: string; type?: string }
    }

    if (inv.metadata?.type !== 'pro_subscription') return

    const userId = inv.metadata?.userId
    if (!userId) return

    // Mark renewal in subscription record
    const sub = await prisma.proSubscription.findUnique({
      where: { userId }
    })

    if (sub) {
      console.log(`[Pro Subscription] Renewal payment received for user ${userId}`)
      // Subscription is already active, just log the renewal
    }
  } catch (error) {
    console.error('[Pro Subscription] Error handling invoice payment:', error)
  }
}