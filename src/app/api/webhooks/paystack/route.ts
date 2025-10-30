import { NextRequest, NextResponse } from 'next/server'
import { paystack } from '@/lib/paystack'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

// Minimal local types for Paystack webhook payloads
type PaystackOrderItem = {
  designId: string
  quantity: number
  price: number
  purchaseType?: 'REGULAR' | 'OWNERSHIP'
}

type PaystackMetadata = {
  userId?: string
  platformFee?: string
  orderItems?: string
  originalAmountUSD?: string
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
      const { reference, amount, currency, customer, metadata } = data

      console.log('Processing Paystack payment:', { reference, amount, currency })

      // Get metadata
  const userId = metadata?.userId
  const platformFee = parseFloat(metadata?.platformFee || '0')
  const orderItems: PaystackOrderItem[] = JSON.parse(metadata?.orderItems || '[]')
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
          platformFee: platformFee,
          status: 'COMPLETED',
          stripePaymentIntentId: reference, // Use reference for tracking
          items: {
            create: orderItems.map((item: PaystackOrderItem) => ({
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
        const commission = saleAmount * 0.05 // 5% commission
        const sellerAmount = saleAmount - commission

        await prisma.sellerEarning.create({
          data: {
            saleAmount,
            platformCommission: commission,
            sellerAmount,
            quantity: item.quantity,
            sellerId: item.design.designerId,
            orderId: order.id,
            designId: item.designId
          }
        })

        // Update design statistics and handle ownership
        const updateData = {
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

        // Auto-transfer earnings to seller account
        try {
          const sellerAccount = await prisma.sellerAccount.findUnique({
            where: { userId: item.design.designerId }
          })

          if (sellerAccount && sellerAccount.isVerified) {
            let recipientCode = sellerAccount.recipientCode

            // If no recipient code exists (manual verification), create one now
            if (!recipientCode) {
              try {
                console.log('Creating recipient code for seller:', item.design.designerId)
                const recipient = await paystack.transfer_recipient.create({
                  type: 'nuban',
                  name: sellerAccount.accountName,
                  account_number: sellerAccount.accountNumber,
                  bank_code: sellerAccount.bankCode,
                  currency: 'NGN'
                })

                if (recipient.status) {
                  recipientCode = recipient.data.recipient_code
                  
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

              const transfer = await paystack.transfer.initiate({
                source: 'balance',
                amount: transferAmountNGN * 100, // Convert to kobo
                recipient: recipientCode,
                reason: `Earnings from sale of "${item.design.title}" - Order #${order.orderNumber}`
              })

              if (transfer.status) {
                console.log(`Transfer initiated for seller ${item.design.designerId}: ₦${transferAmountNGN}`)
              } else {
                console.error('Transfer failed:', transfer.message)
              }
            } else {
              console.error('Unable to create recipient code for seller:', item.design.designerId)
            }
          } else {
            console.log('Seller account not verified or not found for user:', item.design.designerId)
          }
        } catch (transferError) {
          console.error('Auto-transfer error:', transferError)
          // Continue processing even if transfer fails
        }
      }

      // Transfer platform commission (5%) to platform account
      try {
        const platformRecipientCode = process.env.PAYSTACK_PLATFORM_RECIPIENT
        if (platformRecipientCode) {
          const totalCommission = order.items.reduce((sum: number, item: { price: number; quantity: number }) => {
            return sum + (item.price * item.quantity * 0.05)
          }, 0)
          
          const commissionNGN = Math.round(totalCommission * 800) // Convert to NGN

          const platformTransfer = await paystack.transfer.initiate({
            source: 'balance',
            amount: commissionNGN * 100, // Convert to kobo
            recipient: platformRecipientCode,
            reason: `Platform commission (5%) from order #${order.orderNumber}`
          })

          if (platformTransfer.status) {
            console.log(`Platform commission transferred: ₦${commissionNGN}`)
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
    void error
    console.error('Paystack webhook error:', error)
    return NextResponse.json(
      { message: 'Webhook error' },
      { status: 500 }
    )
  }
}