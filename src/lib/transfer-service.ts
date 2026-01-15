import { paystack, getUSDToNGNRate } from './paystack'
import prisma from './prisma'

export interface TransferData {
  orderId: string
  designId: string
  sellerId: string
  sellerAmount: number // In USD (90% of sale)
  designTitle: string
  orderNumber: string
}

export async function initiateSellerTransfer(data: TransferData) {
  try {
    const { orderId, designId, sellerId, sellerAmount, designTitle, orderNumber } = data

    // Get seller's Paystack account details
    const sellerAccount = await prisma.sellerAccount.findUnique({
      where: { userId: sellerId }
    })

    if (!sellerAccount || !sellerAccount.isVerified) {
      console.warn(`Seller ${sellerId} account not verified for transfer`)
      
      // Create notification about unverified account
      await createTransferNotification({
        sellerId,
        type: 'FAILED',
        message: `Payment could not be processed. Your Paystack account is not verified.`
      })
      
      return {
        success: false,
        error: 'Seller account not verified',
        shouldRetry: false
      }
    }

    // Get live exchange rate
    const exchangeRate = await getUSDToNGNRate()
    const amountNGN = Math.round(sellerAmount * exchangeRate)

    // Create transfer record
    const transfer = await (prisma as any).paystackTransfer.create({
      data: {
        orderId,
        designId,
        sellerId,
        amountUSD: sellerAmount,
        amountNGN,
        exchangeRate,
        paystackStatus: 'PENDING'
      }
    })

    // Try to create recipient code if needed
    let recipientCode = sellerAccount.recipientCode
    if (!recipientCode) {
      try {
        console.log(`Creating recipient code for seller ${sellerId}`)
        const recipient = await paystack.transfer_recipient.create({
          type: 'nuban',
          name: sellerAccount.accountName,
          account_number: sellerAccount.accountNumber,
          bank_code: sellerAccount.bankCode,
          currency: 'NGN'
        })

        if (recipient.status && recipient.data?.recipient_code) {
          recipientCode = recipient.data.recipient_code
          
          // Save recipient code
await (prisma as any).sellerAccount.update({
            where: { userId: sellerId },
            data: { recipientCode }
          })
          
          console.log(`Recipient code created: ${recipientCode}`)
        } else {
          throw new Error(`Failed to create recipient code: ${recipient.message}`)
        }
      } catch (recipientError) {
        console.error(`Failed to create recipient for seller ${sellerId}:`, recipientError)
        
        await (prisma as any).paystackTransfer.update({
          where: { id: transfer.id },
          data: {
            paystackStatus: 'FAILED',
            errorMessage: 'Failed to create recipient code',
            failureReason: recipientError instanceof Error ? recipientError.message : 'Unknown error'
          }
        })
        
        await createTransferNotification({
          sellerId,
          type: 'FAILED',
          message: `Failed to process payment: Could not create recipient code for transfer.`
        })
        
        return {
          success: false,
          error: 'Failed to create recipient code',
          shouldRetry: true,
          transferId: transfer.id
        }
      }
    }

    // Ensure we have a recipient code before initiating transfer
    if (!recipientCode) {
      console.error(`No recipient code available for seller ${sellerId} after attempted creation`)
      await (prisma as any).paystackTransfer.update({
        where: { id: transfer.id },
        data: {
          paystackStatus: 'FAILED',
          errorMessage: 'Unable to create recipient for transfer',
          failureReason: 'Recipient code creation failed'
        }
      })
      return {
        success: false,
        error: 'No recipient code available',
        shouldRetry: true,
        transferId: transfer.id
      }
    }

    // Initiate the transfer
    try {
      const paystackTransfer = await paystack.transfer.initiate({
        source: 'balance',
        amount: amountNGN * 100, // Convert to kobo
        recipient: recipientCode,
        reason: `Earnings from sale of "${designTitle}" - Order #${orderNumber}`
      })

      if (paystackTransfer.status && paystackTransfer.data?.reference) {
        await (prisma as any).paystackTransfer.update({
          where: { id: transfer.id },
          data: {
            paystackStatus: 'SUCCESS',
            paystackReference: paystackTransfer.data.reference
          }
        })

        await (prisma as any).transferNotification.create({
          data: {
            sellerId,
            type: 'SUCCESS',
            message: `Payment of ₦${amountNGN.toLocaleString()} received for "${designTitle}"`
          }
        })

        console.log(`Transfer successful for seller ${sellerId}: ₦${amountNGN}`)
        return {
          success: true,
          transferId: transfer.id,
          reference: paystackTransfer.data.reference
        }
      } else {
        throw new Error(`Transfer failed: ${paystackTransfer.message}`)
      }
    } catch (transferError) {
      const errorMsg = transferError instanceof Error ? transferError.message : 'Unknown error'
      console.error(`Transfer error for seller ${sellerId}:`, errorMsg)

      await (prisma as any).paystackTransfer.update({
        where: { id: transfer.id },
        data: {
          paystackStatus: 'FAILED',
          errorMessage: 'Transfer API call failed',
          failureReason: errorMsg
        }
      })

      await (prisma as any).transferNotification.create({
        data: {
          sellerId,
          type: 'FAILED',
          message: `Payment processing failed. We will retry automatically.`
        }
      })

      return {
        success: false,
        error: errorMsg,
        shouldRetry: true,
        transferId: transfer.id
      }
    }
  } catch (error) {
    console.error('Transfer initiation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: true
    }
  }
}

export async function updateTransferStatus(
  transferId: string,
  updates: {
    status?: string
    paystackReference?: string
    errorMessage?: string
    failureReason?: string
  }
) {
  return (prisma as any).paystackTransfer.update({
    where: { id: transferId },
    data: {
      paystackStatus: updates.status,
      paystackReference: updates.paystackReference,
      errorMessage: updates.errorMessage,
      failureReason: updates.failureReason,
      succeededAt: updates.status === 'SUCCESS' ? new Date() : undefined,
      updatedAt: new Date()
    }
  })
}

/**
 * Transfer commission earnings to designer after client confirms completion
 */
export interface CommissionTransferData {
  commissionRequestId: string
  designerId: string
  designerEarnings: number // In USD (90% of quote)
  commissionTitle: string
}

export async function initiateCommissionTransfer(data: CommissionTransferData) {
  try {
    const { commissionRequestId, designerId, designerEarnings, commissionTitle } = data

    // Get designer's Paystack account details
    const sellerAccount = await prisma.sellerAccount.findUnique({
      where: { userId: designerId }
    })

    if (!sellerAccount || !sellerAccount.isVerified) {
      console.warn(`Designer ${designerId} account not verified for commission transfer`)
      
      await createTransferNotification({
        sellerId: designerId,
        type: 'FAILED',
        message: `Commission payment could not be processed. Your bank account is not verified. Please verify your account in Settings.`
      })
      
      return {
        success: false,
        error: 'Designer account not verified',
        shouldRetry: false
      }
    }

    // Get live exchange rate
    const exchangeRate = await getUSDToNGNRate()
    const amountNGN = Math.round(designerEarnings * exchangeRate)

    // Create transfer record (reusing PaystackTransfer model)
    const transfer = await (prisma as any).paystackTransfer.create({
      data: {
        orderId: commissionRequestId, // Use commission ID as reference
        designId: commissionRequestId, // Use commission ID
        sellerId: designerId,
        amountUSD: designerEarnings,
        amountNGN,
        exchangeRate,
        paystackStatus: 'PENDING'
      }
    })

    // Get or create recipient code
    let recipientCode = sellerAccount.recipientCode
    if (!recipientCode) {
      try {
        console.log(`Creating recipient code for designer ${designerId}`)
        const recipient = await paystack.transfer_recipient.create({
          type: 'nuban',
          name: sellerAccount.accountName,
          account_number: sellerAccount.accountNumber,
          bank_code: sellerAccount.bankCode,
          currency: 'NGN'
        })

        if (recipient.status && recipient.data?.recipient_code) {
          recipientCode = recipient.data.recipient_code
          
          await (prisma as any).sellerAccount.update({
            where: { userId: designerId },
            data: { recipientCode }
          })
          
          console.log(`Recipient code created: ${recipientCode}`)
        } else {
          throw new Error(`Failed to create recipient code: ${recipient.message}`)
        }
      } catch (recipientError) {
        console.error(`Failed to create recipient for designer ${designerId}:`, recipientError)
        
        await (prisma as any).paystackTransfer.update({
          where: { id: transfer.id },
          data: {
            paystackStatus: 'FAILED',
            errorMessage: 'Failed to create recipient code',
            failureReason: recipientError instanceof Error ? recipientError.message : 'Unknown error'
          }
        })
        
        await createTransferNotification({
          sellerId: designerId,
          type: 'FAILED',
          message: `Commission payment failed: Could not create recipient code. Please verify your bank details.`
        })
        
        return {
          success: false,
          error: 'Failed to create recipient code',
          shouldRetry: true,
          transferId: transfer.id
        }
      }
    }

    if (!recipientCode) {
      console.error(`No recipient code available for designer ${designerId}`)
      await (prisma as any).paystackTransfer.update({
        where: { id: transfer.id },
        data: {
          paystackStatus: 'FAILED',
          errorMessage: 'Unable to create recipient for transfer',
          failureReason: 'Recipient code creation failed'
        }
      })
      return {
        success: false,
        error: 'No recipient code available',
        shouldRetry: true,
        transferId: transfer.id
      }
    }

    // Initiate the transfer
    try {
      const paystackTransfer = await paystack.transfer.initiate({
        source: 'balance',
        amount: amountNGN * 100, // Convert to kobo
        recipient: recipientCode,
        reason: `Commission earnings for "${commissionTitle}"`
      })

      if (paystackTransfer.status && paystackTransfer.data?.reference) {
        await (prisma as any).paystackTransfer.update({
          where: { id: transfer.id },
          data: {
            paystackStatus: 'SUCCESS',
            paystackReference: paystackTransfer.data.reference
          }
        })

        await (prisma as any).transferNotification.create({
          data: {
            sellerId: designerId,
            type: 'SUCCESS',
            message: `Commission payment of ₦${amountNGN.toLocaleString()} received for "${commissionTitle}"`
          }
        })

        // Update commission request with payout info
        await prisma.commissionRequest.update({
          where: { id: commissionRequestId },
          data: {
            // Store payout reference (using existing field or we can add later)
          }
        })

        console.log(`Commission transfer successful for designer ${designerId}: ₦${amountNGN}`)
        return {
          success: true,
          transferId: transfer.id,
          reference: paystackTransfer.data.reference,
          amountNGN
        }
      } else {
        throw new Error(`Transfer failed: ${paystackTransfer.message}`)
      }
    } catch (transferError) {
      const errorMsg = transferError instanceof Error ? transferError.message : 'Unknown error'
      console.error(`Commission transfer error for designer ${designerId}:`, errorMsg)

      await (prisma as any).paystackTransfer.update({
        where: { id: transfer.id },
        data: {
          paystackStatus: 'FAILED',
          errorMessage: 'Transfer API call failed',
          failureReason: errorMsg
        }
      })

      await (prisma as any).transferNotification.create({
        data: {
          sellerId: designerId,
          type: 'FAILED',
          message: `Commission payment processing failed. We will retry automatically.`
        }
      })

      return {
        success: false,
        error: errorMsg,
        shouldRetry: true,
        transferId: transfer.id
      }
    }
  } catch (error) {
    console.error('Commission transfer initiation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: true
    }
  }
}

export async function createTransferNotification(data: {
  sellerId: string
  type: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RETRY'
  message: string
}) {
  return (prisma as any).transferNotification.create({
    data: {
      sellerId: data.sellerId,
      type: data.type,
      message: data.message
    }
  })
}

export async function retryFailedTransfers() {
  try {
    // Get transfers that failed and haven't exceeded max retries
    const failedTransfers = await (prisma as any).paystackTransfer.findMany({
      where: {
        paystackStatus: 'FAILED',
        retryCount: {
          lt: 3 // Less than 3 retries
        }
      },
      include: {
        seller: {
          include: {
            sellerAccount: true
          }
        }
      }
    })

    console.log(`Found ${failedTransfers.length} failed transfers to retry`)

    for (const transfer of failedTransfers) {
      // Only retry if enough time has passed (exponential backoff)
      const minutesSinceLastRetry = transfer.lastRetryAt
        ? (Date.now() - transfer.lastRetryAt.getTime()) / 60000
        : Infinity

      const backoffMinutes = Math.pow(2, transfer.retryCount) * 5 // 5, 10, 20 minutes
      
      if (minutesSinceLastRetry < backoffMinutes) {
        console.log(
          `Skipping retry for transfer ${transfer.id} - waiting ${backoffMinutes - minutesSinceLastRetry} more minutes`
        )
        continue
      }

      console.log(`Retrying transfer ${transfer.id} (attempt ${transfer.retryCount + 1})`)

      // Get the order to get design info
      const order = await (prisma as any).order.findUnique({
        where: { id: transfer.orderId },
        include: {
          items: {
            include: {
              design: true
            }
          }
        }
      })

      if (!order) {
        console.error(`Order ${transfer.orderId} not found for retry`)
        continue
      }

      const design = order.items.find((item: any) => item.designId === transfer.designId)?.design
      if (!design) {
        console.error(`Design ${transfer.designId} not found for retry`)
        continue
      }

      // Update retry count and timestamp
      await (prisma as any).paystackTransfer.update({
        where: { id: transfer.id },
        data: {
          retryCount: transfer.retryCount + 1,
          lastRetryAt: new Date()
        }
      })

      // Retry the transfer
      const result = await initiateSellerTransfer({
        orderId: transfer.orderId,
        designId: transfer.designId,
        sellerId: transfer.sellerId,
        sellerAmount: transfer.amountUSD,
        designTitle: design.title,
        orderNumber: order.orderNumber
      })

      if (result.success) {
        console.log(`Retry successful for transfer ${transfer.id}`)
        
        await (prisma as any).transferNotification.create({
          data: {
            sellerId: transfer.sellerId,
            type: 'SUCCESS',
            message: `Payment retry successful. ₦${transfer.amountNGN.toLocaleString()} transferred.`
          }
        })
      } else if (!result.shouldRetry) {
        console.log(`Transfer ${transfer.id} cannot be retried - permanent failure`)
        
        await (prisma as any).paystackTransfer.update({
          where: { id: transfer.id },
          data: {
            paystackStatus: 'FAILED',
            errorMessage: 'Payment failed - manual intervention required'
          }
        })
      }
    }
  } catch (error) {
    console.error('Retry transfers error:', error)
  }
}
