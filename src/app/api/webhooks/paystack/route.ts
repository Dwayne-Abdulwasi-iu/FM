import { NextRequest, NextResponse } from 'next/server'
import { paystack, getUSDToNGNRate } from '@/lib/paystack'
import { initiateSellerTransfer, createTransferNotification } from '@/lib/transfer-service'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { checkAndPromoteDesigners } from '@/lib/seller-promotion'
import { sendPaymentReceivedToDesigner, sendAdminPODAlert } from '@/lib/email'
import { getCommissionRate, getCommissionTier } from '@/lib/commission-tiers'
import { checkAndUpdateSellerTier } from '@/lib/tier-management'
import { fulfillPODOrder } from '@/lib/pod-service'
import { queueFailedNotification } from '@/lib/notification-queue'

// Minimal local types for Paystack webhook payloads
type PaystackOrderItem = {
  designId: string
  quantity: number
  price: number
  purchaseType?: 'REGULAR' | 'OWNERSHIP' | 'POD'
  podProductId?: string
  podVariantId?: string
  podProductName?: string
  purchaseType?: 'REGULAR' | 'OWNERSHIP'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    if (!signature) {
      console.error('No Paystack signature found')
      return NextResponse.json({ message: 'No signature' }, { status: 400 })
    }

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('Invalid Paystack signature')
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 })
    }

    // Parse event defensively
    const rawEvent: unknown = JSON.parse(body)
    const event = rawEvent as { event?: string; data?: unknown }

    // IDEMPOTENCY: Use reference as unique event identifier for Paystack
    const data = event.data as { reference?: string; amount?: number; currency?: string; metadata?: unknown } | undefined
    const reference = data?.reference
    
    if (reference) {
      const existingEvent = await prisma.processedWebhookEvent.findUnique({
        where: { eventId: `paystack_${reference}` }
      })
      
      if (existingEvent) {
        console.log(`Duplicate Paystack event ${reference}, skipping`)
        return NextResponse.json({ received: true, duplicate: true })
      }

      // Record this event as being processed
      await prisma.processedWebhookEvent.create({
        data: {
          eventId: `paystack_${reference}`,
          provider: 'paystack',
          eventType: event.event || 'unknown'
        }
      })
    }

    if (event.event === 'charge.success' && event.data) {
      const { amount, currency } = data || {}

      console.log('Processing Paystack payment:', { reference, amount, currency })

      // Defensive metadata extraction
      const metadata = data?.metadata as Record<string, unknown> | undefined

      // Check if this is a commission payment
      if (metadata?.type === 'commission') {
        await handleCommissionPayment(reference || '', metadata)
        return NextResponse.json({ received: true })
      }

      const userId = typeof metadata?.userId === 'string' ? metadata.userId : undefined
      const platformFee = parseFloat(String(metadata?.platformFee ?? '0'))

      let orderItems: PaystackOrderItem[] = []
      try {
        if (typeof metadata?.orderItems === 'string') {
          orderItems = JSON.parse(metadata.orderItems as string)
        } else if (Array.isArray(metadata?.orderItems)) {
          orderItems = (metadata.orderItems as unknown[]) as PaystackOrderItem[]
        }
      } catch (err) {
        console.error('Failed to parse orderItems from metadata:', err)
        orderItems = []
      }

      const originalAmountUSD = parseFloat(String(metadata?.originalAmountUSD ?? '0'))

      if (!userId || !orderItems.length) {
        console.error('Missing required metadata:', { userId, orderItems })
        return NextResponse.json({ message: 'Invalid metadata' }, { status: 400 })
      }

      // Create order in database
      const order = await prisma.order.create({
        data: {
          orderNumber: reference ?? `PS-${Date.now()}`,
          customerId: userId,
          totalAmount: originalAmountUSD, // Store in USD
          platformFee: platformFee,
          status: 'COMPLETED',
          stripePaymentIntentId: reference ?? undefined, // Use reference for tracking
          items: {
            create: orderItems.map((item) => ({
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
              design: true
            }
          }
        }
      })

      // Create seller earnings, purchase records, and handle ownership for each item
      for (const item of order.items) {
        const saleAmount = item.price * item.quantity
        const sellerId = (item.design?.designerId ?? '') as string
        
        // Get seller's current tier and calculate dynamic commission
        const seller = await prisma.user.findUnique({
          where: { id: sellerId },
          select: { totalEarnings: true, designerTier: true }
        })
        
        const totalEarnings = seller?.totalEarnings ?? 0
        const isProSubscriber = seller?.designerTier === 'VIP_DESIGNER' || seller?.designerTier === 'VVIP_DESIGNER'
        const commissionRate = getCommissionRate(totalEarnings, isProSubscriber)
        const tier = getCommissionTier(totalEarnings)
        
        const commission = saleAmount * commissionRate
        const sellerAmount = saleAmount - commission
        
        console.log(`[Tiered Commission] Seller ${sellerId}: Tier=${tier}, Rate=${(commissionRate * 100).toFixed(1)}%, Commission=$${commission.toFixed(2)}`)

        await prisma.sellerEarning.create({
          data: {
            saleAmount,
            platformCommission: commission,
            sellerAmount,
            quantity: item.quantity,
            sellerId,
            orderId: order.id,
            designId: item.designId
          }
        })

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

        // Auto-transfer earnings to seller account using transfer service
        try {
          const sellerResult = await initiateSellerTransfer({
            orderId: order.id,
            designId: item.designId,
            sellerId: item.design?.designerId ?? '',
            sellerAmount,
            designTitle: item.design?.title ?? 'Design',
            orderNumber: order.orderNumber
          })

          if (!sellerResult.success) {
            console.warn(`Transfer initiation returned error for seller ${item.design?.designerId}:`, sellerResult.error)
          }
        } catch (transferError) {
          console.error('Transfer service error:', transferError)
          // Create failed notification
          try {
            await createTransferNotification({
              sellerId: item.design?.designerId ?? '',
              type: 'FAILED',
              message: `Payment processing encountered an error. We'll retry automatically.`
            })
          } catch (notificationError) {
            console.error('Failed to create failure notification:', notificationError)
          }
        }
        
        // Store previous earnings before updating (for tier change detection)
        const previousEarnings = totalEarnings
        
        // Update seller's total earnings and check for tier upgrade
        await prisma.user.update({
          where: { id: sellerId },
          data: {
            totalEarnings: { increment: sellerAmount },
            totalSales: { increment: item.quantity }
          }
        })
        
        // Check if seller crossed a tier threshold - update Paystack subaccount if so
        const tierResult = await checkAndUpdateSellerTier(sellerId, previousEarnings)
        if (tierResult.tierChanged) {
          console.log(`[Tier Change] ${tierResult.message}`)
        }
      }

      // Transfer platform commission to platform account (using already calculated tiered commissions)
      try {
        const platformRecipientCode = process.env.PAYSTACK_PLATFORM_RECIPIENT
        if (platformRecipientCode) {
          // Get total commission from seller earnings we just created (already calculated with tiered rates)
          const orderEarnings = await prisma.sellerEarning.findMany({
            where: { orderId: order.id },
            select: { platformCommission: true }
          })
          
          const totalCommission = orderEarnings.reduce((sum, e) => sum + e.platformCommission, 0)
          
          if (totalCommission > 0) {
            const exchangeRate = await getUSDToNGNRate()
            const commissionNGN = Math.round(totalCommission * exchangeRate)

            const platformTransfer = await paystack.transfer.initiate({
              source: 'balance',
              amount: commissionNGN * 100, // Convert to kobo
              recipient: platformRecipientCode,
              reason: `Platform commission (tiered) from order #${order.orderNumber}`
            })

            if (platformTransfer.status) {
              console.log(`Platform commission transferred: ₦${commissionNGN} ($${totalCommission.toFixed(2)} USD)`)
            }
          } else {
            console.log(`No platform commission for order #${order.orderNumber} (STARTER tier sellers)`)
          }
        }
      } catch (platformTransferError) {
        console.error('Platform commission transfer error:', platformTransferError)
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
      const podItems = orderItems.filter(item => item.purchaseType === 'POD')
      if (podItems.length > 0) {
        // Get shipping address from metadata (stored as JSON string)
        let shippingAddress: {
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
          if (typeof metadata?.shippingAddress === 'string') {
            shippingAddress = JSON.parse(metadata.shippingAddress)
          } else {
            shippingAddress = metadata?.shippingAddress as typeof shippingAddress
          }
        } catch (e) {
          console.error('[POD] Failed to parse shipping address:', e)
        }

        if (shippingAddress) {
          // Normalize shipping address fields (checkout sends different field names)
          const normalizedAddress = {
            name: shippingAddress.fullName || shippingAddress.name || '',
            address1: shippingAddress.address || shippingAddress.address1 || '',
            address2: shippingAddress.address2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state,
            country: shippingAddress.country,
            zip: shippingAddress.postalCode || shippingAddress.zip || '',
            phone: shippingAddress.phone
          }
          
          console.log(`[POD] Fulfilling ${podItems.length} POD items for order ${order.id}`)
          
          // Get design image URLs for POD fulfillment
          const podFulfillmentItems = await Promise.all(
            podItems.map(async (item) => {
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

          const fulfillResult = await fulfillPODOrder(order.id, podFulfillmentItems, normalizedAddress)
          
          if (fulfillResult.success) {
            // Update order with POD provider info
            await prisma.order.update({
              where: { id: order.id },
              data: {
                orderType: 'POD',
                podProvider: fulfillResult.provider,
                podOrderId: fulfillResult.podOrderId,
                podStatus: 'pending',
                shippingName: normalizedAddress.name,
                shippingAddress1: normalizedAddress.address1,
                shippingAddress2: normalizedAddress.address2,
                shippingCity: normalizedAddress.city,
                shippingState: normalizedAddress.state,
                shippingCountry: normalizedAddress.country,
                shippingZip: normalizedAddress.zip,
                shippingPhone: normalizedAddress.phone
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
              orderNumber: order.orderNumber,
              orderId: order.id,
              status: 'fulfillment_failed',
              provider: 'Unknown',
              reason: fulfillResult.error || 'POD provider order creation failed',
              customerEmail: order.customer?.email || undefined,
              totalAmount: order.totalAmount
            })
            
            // Queue for retry if alert failed
            if (!alertSent) {
              await queueFailedNotification('email', {
                emailType: 'admin_alert',
                orderId: order.orderNumber,
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
      const designerIds = order.items
        .map((item) => item.design?.designerId)
        .filter((id): id is string => !!id)
      
      if (designerIds.length > 0) {
        await checkAndPromoteDesigners(designerIds)
      }

      console.log('Paystack order processed successfully:', order.id)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    void error
    console.error('Paystack webhook error:', error)
    return NextResponse.json(
      { message: 'Webhook error' },
      { status: 500 }
    )
  }
}

/**
 * Handle commission payment completion via Paystack
 */
async function handleCommissionPayment(reference: string, metadata: Record<string, unknown>) {
  try {
    // Paystack uses snake_case in metadata
    const commissionRequestId = metadata.commission_request_id as string
    const _designerId = metadata.designer_id as string
    const platformFee = parseFloat(String(metadata.platform_fee ?? '0'))
    const designerEarnings = parseFloat(String(metadata.designer_earnings ?? '0'))

    if (!commissionRequestId) {
      console.error('Commission payment missing commission_request_id')
      return
    }

    // Update commission request to PAID status
    const updatedRequest = await prisma.commissionRequest.update({
      where: { id: commissionRequestId },
      data: {
        status: 'PAID',
        isPaid: true,
        paidAt: new Date(),
        platformFee,
        designerEarnings,
        paymentMethod: 'PAYSTACK',
        paymentReference: reference,
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

    console.log(`Commission ${commissionRequestId} marked as PAID via Paystack`)

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
          designerEarnings,
          commissionId: commissionRequestId,
        })
        console.log(`Payment notification email sent to designer ${updatedRequest.designer.email}`)
      } catch (emailError) {
        console.error('Failed to send payment notification email:', emailError)
      }
    }

  } catch (error) {
    console.error('Error handling Paystack commission payment:', error)
  }
}