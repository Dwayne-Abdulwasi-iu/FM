import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { paystack } from '@/lib/paystack'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { sessionId } = await context.params
    if (!sessionId) {
      return NextResponse.json({ message: 'Missing sessionId' }, { status: 400 })
    }

    // Strategy:
    // - Stripe checkout session IDs start with "cs_". For those, fetch the Checkout Session
    //   to get the PaymentIntent ID and find the order by stripePaymentIntentId.
    // - For Paystack, we use the reference directly and store it in stripePaymentIntentId (for tracking).
    //   In that case, skip Stripe entirely and query by the reference.

    let lookupPaymentKey: string | null = null

    if (/^cs_/.test(sessionId)) {
      // Stripe path
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
      if (!checkoutSession?.payment_intent) {
        return NextResponse.json(
          { message: 'Payment intent not found' },
          { status: 404 }
        )
      }
      lookupPaymentKey = checkoutSession.payment_intent as string
    } else {
      // Assume Paystack reference
      lookupPaymentKey = sessionId
    }

    // Find the order in our database
    let order = await prisma.order.findFirst({
      where: {
        stripePaymentIntentId: lookupPaymentKey,
        customerId: session.user.id
      },
      include: {
        items: {
          include: {
            design: {
              include: {
                designer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Fallback: some flows store the provider reference in orderNumber instead
    if (!order) {
      order = await prisma.order.findFirst({
        where: {
          orderNumber: lookupPaymentKey,
          customerId: session.user.id,
        },
        include: {
          items: {
            include: {
              design: {
                include: {
                  designer: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          }
        }
      })
    }

  // Stripe fallback: if order still not found and this looks like a Stripe session id,
    // try to construct the order on-demand from the Checkout Session metadata.
  if (!order && /^cs_/.test(sessionId) && process.env.STRIPE_SECRET_KEY) {
      try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
        const paymentIntentId = typeof checkoutSession.payment_intent === 'string'
          ? checkoutSession.payment_intent
          : (checkoutSession.payment_intent && typeof checkoutSession.payment_intent === 'object' && 'id' in checkoutSession.payment_intent
            ? (checkoutSession.payment_intent as { id: string }).id
            : '')

        const metadata = checkoutSession.metadata || undefined
        const userIdMeta = metadata?.userId
        const platformFeeCents = parseFloat(metadata?.platformFee || '0') || 0
        const orderItemsMeta = metadata?.orderItems ? JSON.parse(metadata.orderItems) as Array<{
          designId: string; quantity: number; price: number; purchaseType?: 'REGULAR' | 'OWNERSHIP'
        }> : []

        // Validate this session belongs to the current user
        if (userIdMeta && userIdMeta === session.user.id && checkoutSession.payment_status === 'paid' && orderItemsMeta.length > 0) {
          const orderNumber = `FM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const amountTotalCents = checkoutSession.amount_total ?? 0;
          const currency = (checkoutSession.currency as string | undefined)?.toUpperCase() || 'USD';
          const orderCreated = await prisma.order.create({
            data: {
              orderNumber: orderNumber,
              status: 'COMPLETED',
              totalAmount: amountTotalCents / 100,
              platformFee: platformFeeCents / 100,
              customerId: session.user.id,
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
          });

          // Ensure the order has the currency set (use update with a narrow any cast to avoid
          // temporary type mismatches until the Prisma client/types are fully in sync).
          await prisma.order.update({ where: { id: orderCreated.id }, data: { currency } })

          // Post-create effects to mirror webhook behavior
          for (const item of orderCreated.items) {
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
              updateData.ownedBy = session.user.id
              updateData.isActive = false
            }

            await prisma.design.update({ where: { id: item.designId }, data: updateData })

            await prisma.sellerEarning.create({
              data: {
                sellerId: item.design.designerId,
                orderId: orderCreated.id,
                designId: item.designId,
                saleAmount,
                platformCommission,
                sellerAmount: sellerEarning,
                quantity: item.quantity
              }
            })
            await prisma.sellerEarning.updateMany({
              where: { orderId: orderCreated.id, designId: item.designId },
              data: { saleCurrency: currency }
            })

            await prisma.purchase.create({
              data: {
                userId: session.user.id,
                designId: item.designId,
                orderId: orderCreated.id,
                purchaseType: item.purchaseType || 'REGULAR',
                purchasePrice: item.price,
                accessGranted: true
              }
            })
          }

          // Clear user cart entries for items in this order
          for (const item of orderItemsMeta) {
            await prisma.cartItem.deleteMany({
              where: {
                userId: session.user.id,
                designId: item.designId,
                purchaseType: item.purchaseType || 'REGULAR'
              }
            })
          }

          order = orderCreated

          // Send email notifications to buyer and seller after order creation and post-processing
          try {
            const { sendEmail } = await import('@/lib/sendPurchaseEmail');
            const { renderBuyerEmail, renderSellerEmail } = await import('@/lib/purchaseEmailTemplates');

            // Buyer email
            const buyerEmail = session.user.email;
            if (buyerEmail) {
              const buyerEmailContent = renderBuyerEmail(orderCreated);
              await sendEmail({
                to: buyerEmail,
                subject: buyerEmailContent.subject,
                text: buyerEmailContent.text,
                html: buyerEmailContent.html
              });
            }

            // Seller emails (one per design)
            for (const item of orderCreated.items) {
              const sellerEmail = item.design?.designer?.email;
              if (sellerEmail) {
                const sellerEmailContent = renderSellerEmail(
                  item.design,
                  item.price,
                  item.purchaseType === 'OWNERSHIP' ? 'Exclusive' : 'Regular'
                );
                await sendEmail({
                  to: sellerEmail,
                  subject: sellerEmailContent.subject,
                  text: sellerEmailContent.text,
                  html: sellerEmailContent.html
                });
              }
            }
          } catch (emailErr) {
            console.warn('Failed to send purchase emails', emailErr);
          }

        }
      } catch (rebuildErr) {
        console.error('Order rebuild from Stripe session failed:', rebuildErr)
      }
    }

    // Paystack fallback: if still not found and this looks like a Paystack reference,
    // try verifying the transaction and rebuild the order from returned metadata.
    if (!order && !/^cs_/.test(sessionId)) {
      try {
        const ps = paystack as unknown as {
          transaction: {
            verify: (reference: string) => Promise<{
              status: boolean
              data?: {
                status?: string
                reference?: string
                metadata?: {
                  userId?: string
                  platformFee?: string
                  orderItems?: string
                  originalAmountUSD?: string
                }
              }
            }>
          }
        }

        // Some SDKs expect an object, some accept the reference directly; handle both
        const verifyFn = ps.transaction.verify as unknown as (reference: string) => Promise<{
          status: boolean
          data?: { status?: string; reference?: string; metadata?: Record<string, string> }
        }>
        const verification = await verifyFn(sessionId)
        const data = verification?.data
        if (verification?.status && data?.status === 'success') {
          const md = data.metadata || {}
          const userIdMeta = md.userId
          const platformFeeStr = md.platformFee || '0'
          const orderItemsStr = md.orderItems || '[]'
          const originalAmountUSDStr = md.originalAmountUSD || '0'

          // Ensure this payment belongs to the current user and we have items
          const orderItemsMeta = JSON.parse(orderItemsStr) as Array<{
            designId: string; quantity: number; price: number; purchaseType?: 'REGULAR' | 'OWNERSHIP'
          }>

          if (userIdMeta === session.user.id && orderItemsMeta.length > 0) {
            const orderNumber = data.reference || `FM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            const totalAmountUSD = parseFloat(originalAmountUSDStr) || 0
            const platformFee = parseFloat(platformFeeStr) || 0

            const orderCreated = await prisma.order.create({
              data: {
                orderNumber,
                customerId: session.user.id,
                totalAmount: totalAmountUSD,
                platformFee,
                status: 'COMPLETED',
                stripePaymentIntentId: data.reference || sessionId, // store reference for lookup
                items: {
                  create: orderItemsMeta.map((item) => ({
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
                    design: { include: { designer: true } }
                  }
                }
              }
            })

            // Determine currency from Paystack response if available, else default to USD
            // Prefer currency provided in metadata; fallback to top-level data.currency if present
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const saleCurrency = (md?.currency as string | undefined)?.toUpperCase() || ((data as any)?.currency as string | undefined)?.toUpperCase() || 'USD'
            await prisma.order.update({ where: { id: orderCreated.id }, data: { currency: saleCurrency } })

            // Mirror webhook side-effects
            for (const item of orderCreated.items) {
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
                updateData.ownedBy = session.user.id
                updateData.isActive = false
              }

              await prisma.design.update({ where: { id: item.designId }, data: updateData })

              await prisma.sellerEarning.create({
                data: {
                  sellerId: item.design.designerId,
                  orderId: orderCreated.id,
                  designId: item.designId,
                  saleAmount,
                  platformCommission,
                  sellerAmount: sellerEarning,
                  quantity: item.quantity
                }
              })
              await prisma.sellerEarning.updateMany({ where: { orderId: orderCreated.id, designId: item.designId }, data: { saleCurrency } })
              await prisma.purchase.create({
                data: {
                  userId: session.user.id,
                  designId: item.designId,
                  orderId: orderCreated.id,
                  purchaseType: item.purchaseType || 'REGULAR',
                  purchasePrice: item.price,
                  accessGranted: true
                }
              })
            }

            // Clear cart items
            for (const item of orderItemsMeta) {
              await prisma.cartItem.deleteMany({
                where: {
                  userId: session.user.id,
                  designId: item.designId,
                  purchaseType: item.purchaseType || 'REGULAR'
                }
              })
            }

            order = orderCreated

            // Send email notifications to buyer and seller after order creation and post-processing (Paystack)
            try {
              const { sendEmail } = await import('@/lib/sendPurchaseEmail');
              const { renderBuyerEmail, renderSellerEmail } = await import('@/lib/purchaseEmailTemplates');

              // Buyer email
              const buyerEmail = session.user.email;
              if (buyerEmail) {
                const buyerEmailContent = renderBuyerEmail(orderCreated as any);
                await sendEmail({
                  to: buyerEmail,
                  subject: buyerEmailContent.subject,
                  text: buyerEmailContent.text,
                  html: buyerEmailContent.html
                });
              }

              // Seller emails (one per design)
              for (const item of orderCreated.items) {
                const sellerEmail = item.design?.designer?.email;
                if (sellerEmail) {
                  const sellerEmailContent = renderSellerEmail(
                    item.design,
                    item.price,
                    item.purchaseType === 'OWNERSHIP' ? 'Exclusive' : 'Regular'
                  );
                  await sendEmail({
                    to: sellerEmail,
                    subject: sellerEmailContent.subject,
                    text: sellerEmailContent.text,
                    html: sellerEmailContent.html
                  });
                }
              }
            } catch (emailErr) {
              console.warn('Failed to send purchase emails (Paystack)', emailErr);
            }
          }
        }
      } catch (paystackErr) {
        console.error('Paystack verification/order rebuild failed:', paystackErr)
      }
    }

    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })

  } catch (error: unknown) {
    console.error('Get order by session error:', error)
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}