import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { initiateCommissionTransfer, createTransferNotification } from '@/lib/transfer-service'
import { processStripeRefund, processPaystackRefund } from '@/lib/refund-service'
import { convertUSDToNGN } from '@/lib/paystack'
import {
  sendDeadlineWarningToDesigner,
  sendDeadlinePassedToClient,
  sendAutoReleaseWarningToClient,
  sendAutoCompletionNotice,
  sendAbandonmentWarningToDesigner,
  sendRefundNoticeToClient,
} from '@/lib/email'

// Configuration
const AUTO_RELEASE_DAYS = 14 // Auto-complete after 14 days of delivery
const AUTO_RELEASE_WARNING_DAYS = 7 // Warn after 7 days of no confirmation
const DEADLINE_WARNING_DAYS = 2 // Warn 2 days before deadline
const ABANDONMENT_DAYS = 14 // Consider abandoned if no progress for 14 days after payment
const ABANDONMENT_WARNING_DAYS = 7 // Warn after 7 days of no progress

interface ProcessingResult {
  autoReleased: number
  autoReleaseWarnings: number
  deadlineWarnings: number
  deadlinePassed: number
  abandonmentWarnings: number
  refundsInitiated: number
  errors: string[]
}

/**
 * Commission monitoring cron job
 * Run daily to handle:
 * 1. Auto-release: Complete commissions after 14 days of delivery if no client response
 * 2. Deadline warnings: Notify designers of approaching/passed deadlines
 * 3. Abandonment protection: Warn/refund if designer doesn't progress after payment
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (supports both x-cron-secret header and Bearer token)
    const cronSecretHeader = request.headers.get('x-cron-secret')
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    const isValidCronSecret = cronSecretHeader === expectedSecret
    const isValidBearerToken = authHeader === `Bearer ${expectedSecret}`

    if (!expectedSecret || (!isValidCronSecret && !isValidBearerToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Commission Monitor] Starting job')
    const startTime = Date.now()

    // RATE LIMITING: Prevent abuse by tracking last execution time
    // Use a simple in-memory check (for multi-instance, use Redis/DB)
    const _lastRunKey = 'commission_monitor_last_run';
    const _minIntervalMs = 60 * 1000; // Minimum 1 minute between runs
    
    // Check for existing running job via query param (set by caller)
    const { searchParams } = new URL(request.url);
    const forceRun = searchParams.get('force') === 'true';
    
    if (!forceRun) {
      // In production, you'd check a database or Redis for last run time
      // For now, we rely on the cron scheduler to not call more frequently
      console.log('[Commission Monitor] Normal cron execution');
    }

    const result: ProcessingResult = {
      autoReleased: 0,
      autoReleaseWarnings: 0,
      deadlineWarnings: 0,
      deadlinePassed: 0,
      abandonmentWarnings: 0,
      refundsInitiated: 0,
      errors: [],
    }

    // 1. Handle auto-release for delivered commissions
    await processAutoRelease(result)

    // 2. Handle deadline warnings
    await processDeadlineWarnings(result)

    // 3. Handle abandonment protection
    await processAbandonmentProtection(result)

    const duration = Date.now() - startTime
    console.log(`[Commission Monitor] Job completed in ${duration}ms`, result)

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      result,
    })
  } catch (error) {
    console.error('[Commission Monitor] Job error:', error)
    return NextResponse.json(
      {
        error: 'Job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Auto-release: Complete commissions that have been delivered but not confirmed
 */
async function processAutoRelease(result: ProcessingResult) {
  const now = new Date()

  // Find commissions that were delivered but not confirmed
  const deliveredCommissions = await prisma.commissionRequest.findMany({
    where: {
      status: 'DELIVERED',
      deliveredAt: { not: null },
      isDisputed: false,
      payoutInitiatedAt: null, // Only process if payout not already initiated
    },
    include: {
      requester: { select: { email: true, name: true, displayName: true } },
      designer: { select: { email: true, name: true, displayName: true } },
    },
  })

  for (const commission of deliveredCommissions) {
    try {
      if (!commission.deliveredAt) continue

      const daysSinceDelivery = Math.floor(
        (now.getTime() - commission.deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Auto-complete after 14 days
      if (daysSinceDelivery >= AUTO_RELEASE_DAYS) {
        console.log(`[Auto-Release] Attempting to complete commission ${commission.id} after ${daysSinceDelivery} days`)

        // Use atomic updateMany with conditions to prevent race conditions
        // This ensures we only update if the commission is still in the expected state
        const updateResult = await prisma.commissionRequest.updateMany({
          where: { 
            id: commission.id,
            status: 'DELIVERED',
            isDisputed: false,
            payoutInitiatedAt: null, // Only if payout not already initiated
          },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            payoutInitiatedAt: now,
            payoutStatus: 'PENDING',
          },
        })

        // If no rows updated, someone else already processed it
        if (updateResult.count === 0) {
          console.log(`[Auto-Release] Skipping ${commission.id} - state changed during processing (atomic check)`)
          continue
        }

        console.log(`[Auto-Release] Successfully marked ${commission.id} as COMPLETED`)

        // Initiate payout
        if (commission.designerEarnings && commission.designerEarnings > 0) {
          const transferResult = await initiateCommissionTransfer({
            commissionRequestId: commission.id,
            designerId: commission.designerId,
            designerEarnings: commission.designerEarnings,
            commissionTitle: commission.title,
          })

          // Update payout status
          await prisma.commissionRequest.update({
            where: { id: commission.id },
            data: {
              payoutStatus: transferResult.success ? 'PROCESSING' : 'FAILED',
              payoutReference: transferResult.reference || null,
              payoutAmount: commission.designerEarnings,
              payoutFailedReason: transferResult.success ? null : transferResult.error,
            },
          })

          if (!transferResult.success) {
            result.errors.push(`Payout failed for ${commission.id}: ${transferResult.error}`)
          }
        }

        // Notify both parties
        await sendAutoCompletionNotice({
          requesterEmail: commission.requesterEmail,
          requesterName: commission.requesterName,
          designerEmail: commission.designer.email,
          designerName: commission.designerName,
          title: commission.title,
          requestId: commission.id,
        })

        result.autoReleased++
      }
      // Send warning after 7 days (only if not already warned)
      else if (daysSinceDelivery >= AUTO_RELEASE_WARNING_DAYS && !commission.lastAutoReleaseWarningAt) {
        const daysRemaining = AUTO_RELEASE_DAYS - daysSinceDelivery

        await sendAutoReleaseWarningToClient({
          requesterEmail: commission.requesterEmail,
          requesterName: commission.requesterName,
          title: commission.title,
          requestId: commission.id,
          daysRemaining,
        })

        // Mark warning as sent
        await prisma.commissionRequest.update({
          where: { id: commission.id },
          data: { lastAutoReleaseWarningAt: now },
        })

        result.autoReleaseWarnings++
      }
    } catch (error) {
      const msg = `Auto-release error for ${commission.id}: ${error instanceof Error ? error.message : 'Unknown'}`
      console.error(msg)
      result.errors.push(msg)
    }
  }
}

/**
 * Process deadline warnings for in-progress commissions
 */
async function processDeadlineWarnings(result: ProcessingResult) {
  const now = new Date()

  // Find in-progress commissions with deadlines that haven't been warned yet
  const inProgressCommissions = await prisma.commissionRequest.findMany({
    where: {
      status: { in: ['PAID', 'IN_PROGRESS'] },
      designerDeadline: { not: null },
      lastDeadlineWarningAt: null, // Only those not warned yet
    },
    include: {
      requester: { select: { email: true, name: true, displayName: true } },
      designer: { select: { email: true, name: true, displayName: true } },
    },
  })

  for (const commission of inProgressCommissions) {
    try {
      if (!commission.designerDeadline) continue

      // Parse the deadline (stored as string like "7 days" or a date)
      const deadlineDate = parseDeadline(commission.designerDeadline, commission.paidAt || commission.createdAt)
      if (!deadlineDate) continue

      const daysUntilDeadline = Math.floor(
        (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Deadline is approaching (2 days warning) - only send once
      if (daysUntilDeadline > 0 && daysUntilDeadline <= DEADLINE_WARNING_DAYS) {
        await sendDeadlineWarningToDesigner({
          designerEmail: commission.designer.email,
          designerName: commission.designerName,
          title: commission.title,
          requestId: commission.id,
          daysRemaining: daysUntilDeadline,
        })

        // Mark as warned
        await prisma.commissionRequest.update({
          where: { id: commission.id },
          data: { lastDeadlineWarningAt: now },
        })

        result.deadlineWarnings++
      }
      // Deadline has passed - also mark as warned to prevent repeated emails
      else if (daysUntilDeadline < 0) {
        const daysOverdue = Math.abs(daysUntilDeadline)

        // Notify client that deadline passed
        await sendDeadlinePassedToClient({
          requesterEmail: commission.requesterEmail,
          requesterName: commission.requesterName,
          designerName: commission.designerName,
          title: commission.title,
          requestId: commission.id,
          daysOverdue,
        })

        // Mark as warned
        await prisma.commissionRequest.update({
          where: { id: commission.id },
          data: { lastDeadlineWarningAt: now },
        })

        result.deadlinePassed++
      }
    } catch (error) {
      const msg = `Deadline check error for ${commission.id}: ${error instanceof Error ? error.message : 'Unknown'}`
      console.error(msg)
      result.errors.push(msg)
    }
  }
}

/**
 * Process abandonment protection - detect and handle stalled commissions
 */
async function processAbandonmentProtection(result: ProcessingResult) {
  const now = new Date()

  // Find paid commissions that haven't progressed and haven't been warned
  const paidCommissions = await prisma.commissionRequest.findMany({
    where: {
      status: 'PAID',
      paidAt: { not: null },
      workStartedAt: null, // Designer hasn't started work
      isDisputed: false,
    },
    include: {
      requester: { select: { email: true, name: true, displayName: true } },
      designer: { select: { email: true, name: true, displayName: true } },
    },
  })

  for (const commission of paidCommissions) {
    try {
      if (!commission.paidAt) continue

      const daysSincePayment = Math.floor(
        (now.getTime() - commission.paidAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Initiate refund after 14 days of no progress
      if (daysSincePayment >= ABANDONMENT_DAYS) {
        console.log(`[Abandonment] Commission ${commission.id} abandoned after ${daysSincePayment} days`)

        const refundAmount = commission.designerQuote || 0
        let refundSuccess = false
        let refundReference = ''
        let refundError = ''

        // Actually process the refund based on payment method
        const paymentMethod = commission.paymentMethod

        if (paymentMethod === 'stripe' && commission.paymentReference) {
          // processStripeRefund takes (paymentIntentId, amountInCents)
          const refundResult = await processStripeRefund(
            commission.paymentReference,
            Math.round(refundAmount * 100) // Convert to cents
          )
          refundSuccess = refundResult.success
          refundReference = refundResult.refundId || ''
          refundError = refundResult.error || ''
        } else if (paymentMethod === 'paystack' && commission.paymentReference) {
          // processPaystackRefund takes (reference, amountInNGN)
          // Convert USD to NGN since Paystack expects the original payment currency
          const refundAmountNGN = await convertUSDToNGN(refundAmount)
          const refundResult = await processPaystackRefund(
            commission.paymentReference,
            refundAmountNGN
          )
          refundSuccess = refundResult.success
          refundReference = refundResult.refundId || ''
          refundError = refundResult.error || ''
        } else if (!paymentMethod || !commission.paymentReference) {
          // No payment info - mark for admin review
          refundError = 'Missing payment information for refund'
        }

        // Mark as cancelled with refund status
        await prisma.commissionRequest.update({
          where: { id: commission.id },
          data: {
            status: 'CANCELLED',
            isDisputed: !refundSuccess, // Only dispute if refund failed for admin review
            disputeReason: refundSuccess 
              ? undefined 
              : `Auto-cancelled: Refund failed - ${refundError}`,
            disputedAt: refundSuccess ? undefined : now,
            cancelledAt: now,
            cancellationReason: 'Abandoned by designer - auto-refund initiated',
            refundStatus: refundSuccess ? 'COMPLETED' : 'FAILED',
            refundAmount: refundAmount,
            refundReference: refundReference || undefined,
            refundedAt: refundSuccess ? now : undefined,
          },
        })

        // Notify client about refund
        await sendRefundNoticeToClient({
          requesterEmail: commission.requesterEmail,
          requesterName: commission.requesterName,
          title: commission.title,
          requestId: commission.id,
          amount: refundAmount,
          reason: refundSuccess 
            ? 'Designer did not start work within the expected timeframe. Your refund has been processed.'
            : 'Designer did not start work within the expected timeframe. Your refund is being processed by our team.',
        })

        // Notify designer
        await createTransferNotification({
          sellerId: commission.designerId,
          type: 'FAILED',
          message: `Commission "${commission.title}" was cancelled and refunded due to no progress within 14 days.`,
        })

        if (!refundSuccess) {
          console.error(`[Abandonment] Refund failed for ${commission.id}: ${refundError}`)
          result.errors.push(`Refund failed for ${commission.id}: ${refundError}`)
        }

        result.refundsInitiated++
      }
      // Send warning after 7 days - only if not already warned
      else if (daysSincePayment >= ABANDONMENT_WARNING_DAYS && !commission.lastAbandonmentWarningAt) {
        const daysRemaining = ABANDONMENT_DAYS - daysSincePayment

        await sendAbandonmentWarningToDesigner({
          designerEmail: commission.designer.email,
          designerName: commission.designerName,
          title: commission.title,
          requestId: commission.id,
          daysRemaining,
        })

        // Track that warning was sent
        await prisma.commissionRequest.update({
          where: { id: commission.id },
          data: { lastAbandonmentWarningAt: now },
        })

        result.abandonmentWarnings++
      }
    } catch (error) {
      const msg = `Abandonment check error for ${commission.id}: ${error instanceof Error ? error.message : 'Unknown'}`
      console.error(msg)
      result.errors.push(msg)
    }
  }
}

/**
 * Parse deadline string to Date
 * Handles formats like "7 days", "2 weeks", "14 days", or ISO date strings
 */
function parseDeadline(deadlineStr: string, baseDate: Date): Date | null {
  // Try parsing as ISO date first
  const isoDate = new Date(deadlineStr)
  if (!isNaN(isoDate.getTime())) {
    return isoDate
  }

  // Parse relative formats like "7 days", "2 weeks"
  const match = deadlineStr.match(/^(\d+)\s*(day|days|week|weeks)$/i)
  if (match) {
    const value = parseInt(match[1])
    const unit = match[2].toLowerCase()
    const days = unit.startsWith('week') ? value * 7 : value

    const deadline = new Date(baseDate)
    deadline.setDate(deadline.getDate() + days)
    return deadline
  }

  return null
}
