import { NextRequest, NextResponse } from 'next/server'
import { paystack } from '@/lib/paystack'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

type OrderItem = {
  designId: string
  quantity: number
  price: number
  purchaseType?: 'REGULAR' | 'OWNERSHIP'
}

const ps = paystack as {
  transfer_recipient: {
    create: (args: { type: 'nuban'; name: string; account_number: string; bank_code: string; currency: 'NGN' }) => Promise<{
      status: boolean
      data: { recipient_code?: string }
      message?: string
    }>
  }
  transfer: {
    initiate: (args: { source: 'balance'; amount: number; recipient: string; reason: string }) => Promise<{
      status: boolean
      message?: string
    }>
  }
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

    const event = JSON.parse(body)

    if (event.event === 'charge.success') {
  const { data } = event
  const { reference, amount, currency, metadata } = data

      console.log('Processing Paystack payment:', { reference, amount, currency })

      // Get metadata
      const userId = metadata?.userId
  // platformFee may be included in NGN via metadata, but we will compute USD equivalent from originalAmountUSD
  const orderItems: OrderItem[] = (JSON.parse(metadata?.orderItems || '[]') as OrderItem[])
      const originalAmountUSD = parseFloat(metadata?.originalAmountUSD || '0')

      if (!userId || !orderItems.length) {
        console.error('Missing required metadata:', { userId, orderItems })
        return NextResponse.json({ message: 'Invalid metadata' }, { status: 400 })
      }

  // Create order in database
      const order = await prisma.order.create({
        data: {
          orderNumber: reference,
          customerId: userId,
          totalAmount: originalAmountUSD, // Store in USD
          // Always store platform fee in USD to keep stats consistent across gateways
          platformFee: Number((originalAmountUSD * 0.05).toFixed(2)),
          status: 'COMPLETED',
          stripePaymentIntentId: reference, // Use reference for tracking
          items: {
            create: orderItems.map((item: OrderItem) => ({
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

  const splitPaymentEnabled = Boolean(metadata?.splitPaymentEnabled)

  // Create seller earnings, purchase records, and handle ownership for each item  
  for (const item of order.items) {
        const saleAmount = item.price * item.quantity
        const commission = saleAmount * 0.05 // 5% commission
        const sellerAmount = saleAmount - commission

        const earning = await prisma.sellerEarning.create({
          data: {
            saleAmount,
            platformCommission: commission,
            sellerAmount,
            quantity: item.quantity,
            sellerId: item.design.designerId,
            orderId: order.id,
            designId: item.designId,
            // If split was enabled, mark payout as skipped (handled by Paystack split)
            payoutStatus: splitPaymentEnabled ? 'SKIPPED_SPLIT' : undefined,
            payoutProvider: splitPaymentEnabled ? 'PAYSTACK_SPLIT' : undefined
          }
        })

        // Update design statistics and handle ownership
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

        // Auto-transfer earnings to seller account (only when split was NOT used)
        try {
          if (splitPaymentEnabled) {
            // When Paystack split is configured at checkout, payouts are handled by Paystack automatically.
            // Skip manual transfers to prevent double payment.
            continue
          }
          const sellerAccount = await prisma.sellerAccount.findUnique({
            where: { userId: item.design.designerId }
          })

          if (sellerAccount && sellerAccount.isVerified) {
            let recipientCode = sellerAccount.recipientCode

            // If no recipient code exists (manual verification), create one now
            if (!recipientCode) {
              try {
                console.log('Creating recipient code for seller:', item.design.designerId)
                const recipient = await ps.transfer_recipient.create({
                  type: 'nuban',
                  name: sellerAccount.accountName,
                  account_number: sellerAccount.accountNumber,
                  bank_code: sellerAccount.bankCode,
                  currency: 'NGN'
                })

                if (recipient.status) {
                  recipientCode = recipient.data.recipient_code ?? recipientCode ?? null
                  
                  // Update the seller account with the recipient code
                  await prisma.sellerAccount.update({
                    where: { userId: item.design.designerId },
                    data: { recipientCode }
                  })
                  
                  console.log('Recipient code created and saved:', recipientCode)
                }
              } catch (recipientError) {
                console.error('Error creating recipient during transfer:', recipientError)
              }
            }

            // Proceed with transfer if we have a recipient code
            if (recipientCode) {
              // Convert USD to NGN for transfer
              const transferAmountNGN = Math.round(sellerAmount * 800) // Using 800 exchange rate

              const transfer = await ps.transfer.initiate({
                source: 'balance',
                amount: transferAmountNGN * 100, // Convert to kobo
                recipient: recipientCode,
                reason: `Earnings from sale of "${item.design.title}" - Order #${order.orderNumber}`
              })

              if (transfer.status) {
                console.log(`Transfer initiated for seller ${item.design.designerId}: ₦${transferAmountNGN}`)
                // Mark earning as paid
                await prisma.sellerEarning.update({
                  where: { id: earning.id },
                  data: {
                    payoutStatus: 'PAID',
                    payoutProvider: 'PAYSTACK',
                    payoutAttemptedAt: new Date(),
                    payoutCompletedAt: new Date(),
                    payoutCurrency: 'NGN',
                    payoutAmountMinor: transferAmountNGN * 100
                  }
                })
              } else {
                console.error('Transfer failed:', transfer.message)
                await prisma.sellerEarning.update({
                  where: { id: earning.id },
                  data: {
                    payoutStatus: 'FAILED',
                    payoutProvider: 'PAYSTACK',
                    payoutAttemptedAt: new Date(),
                    payoutError: transfer.message || 'Transfer failed'
                  }
                })
              }
            } else {
              console.error('Unable to create recipient code for seller:', item.design.designerId)
              await prisma.sellerEarning.update({
                where: { id: earning.id },
                data: {
                  payoutStatus: 'FAILED',
                  payoutProvider: 'PAYSTACK',
                  payoutAttemptedAt: new Date(),
                  payoutError: 'Recipient code not available for seller'
                }
              })
            }
          } else {
            console.log('Seller account not verified or not found for user:', item.design.designerId)
            await prisma.sellerEarning.update({
              where: { id: earning.id },
              data: {
                payoutStatus: 'FAILED',
                payoutProvider: 'PAYSTACK',
                payoutAttemptedAt: new Date(),
                payoutError: 'Seller account not verified or not found'
              }
            })
          }
        } catch (transferError) {
          console.error('Auto-transfer error:', transferError)
          // Continue processing even if transfer fails
          await prisma.sellerEarning.update({
            where: { id: earning.id },
            data: {
              payoutStatus: 'FAILED',
              payoutProvider: 'PAYSTACK',
              payoutAttemptedAt: new Date(),
              payoutError: transferError instanceof Error ? transferError.message : String(transferError)
            }
          })
        }
      }

      // Transfer platform commission (5%) to platform account (only when split was NOT used)
      try {
        if (splitPaymentEnabled) {
          // With split, platform share is already routed; skip manual transfer.
          // Proceed to respond 200.
        } else {
        const platformRecipientCode = process.env.PAYSTACK_PLATFORM_RECIPIENT
        if (platformRecipientCode) {
          const totalCommission = orderItems.reduce((sum: number, item: OrderItem) => {
            return sum + (item.price * item.quantity * 0.05)
          }, 0)
          
          const commissionNGN = Math.round(totalCommission * 800) // Convert to NGN

          const platformTransfer = await ps.transfer.initiate({
            source: 'balance',
            amount: commissionNGN * 100, // Convert to kobo
            recipient: platformRecipientCode,
            reason: `Platform commission (5%) from order #${order.orderNumber}`
          })

          if (platformTransfer.status) {
            console.log(`Platform commission transferred: ₦${commissionNGN}`)
          }
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

      console.log('Paystack order processed successfully:', order.id)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json(
      { message: 'Webhook error' },
      { status: 500 }
    )
  }
}