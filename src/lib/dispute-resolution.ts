/**
 * Automated Dispute Resolution Service
 * 
 * Automatically resolves certain dispute types based on rules:
 * 
 * 1. AUTO_REFUND (no seller response within 48h):
 *    - If seller doesn't respond to refund request within 48h → auto-refund
 *    
 * 2. DELIVERY_TIMEOUT (7 days):
 *    - If digital delivery not confirmed within 7 days → auto-refund
 *    
 * 3. LOW_VALUE_REFUND ($10 or less):
 *    - Instant refund for orders under $10 to maintain good customer experience
 *    
 * 4. FIRST_DISPUTE_GOODWILL:
 *    - First-time buyers get automatic refund for first dispute
 *    
 * 5. REPEAT_OFFENDER:
 *    - Multiple disputes against same seller → escalate to admin
 */

import prisma from '@/lib/prisma'

// Configuration
const SELLER_RESPONSE_TIMEOUT_HOURS = 48
const DELIVERY_TIMEOUT_DAYS = 7
const LOW_VALUE_THRESHOLD = 10 // USD
const REPEAT_OFFENDER_THRESHOLD = 3 // disputes in 30 days

export type AutoResolutionResult = {
  resolved: boolean
  resolution: string | null
  action: 'REFUND' | 'ESCALATE' | 'CLOSE' | 'PENDING' | null
  reason: string
}

/**
 * Check if a dispute can be auto-resolved
 */
export async function checkAutoResolution(disputeId: string): Promise<AutoResolutionResult> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!dispute) {
    return {
      resolved: false,
      resolution: null,
      action: null,
      reason: 'Dispute not found'
    }
  }

  // Already resolved
  if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
    return {
      resolved: true,
      resolution: dispute.resolution,
      action: null,
      reason: 'Already resolved'
    }
  }

  // Check each auto-resolution rule in order

  // Rule 1: Low-value instant refund
  if (dispute.refundRequested && dispute.refundRequested <= LOW_VALUE_THRESHOLD) {
    return {
      resolved: true,
      resolution: `Auto-refund approved for low-value order ($${dispute.refundRequested})`,
      action: 'REFUND',
      reason: 'LOW_VALUE_REFUND'
    }
  }

  // Rule 2: No seller response within 48 hours
  const hoursSinceCreated = (Date.now() - dispute.createdAt.getTime()) / (1000 * 60 * 60)
  const sellerResponded = dispute.messages.some(m => m.senderRole === 'RESPONDENT')
  
  if (!sellerResponded && hoursSinceCreated > SELLER_RESPONSE_TIMEOUT_HOURS) {
    return {
      resolved: true,
      resolution: 'Auto-refund: Seller did not respond within 48 hours',
      action: 'REFUND',
      reason: 'NO_SELLER_RESPONSE'
    }
  }

  // Rule 3: First-time buyer goodwill
  const buyerDisputeCount = await prisma.dispute.count({
    where: {
      complainantId: dispute.complainantId,
      status: { in: ['RESOLVED', 'CLOSED'] }
    }
  })

  if (buyerDisputeCount === 0 && dispute.type === 'REFUND_REQUEST') {
    // Check if this is a first-time dispute for low-risk amount
    if (dispute.refundRequested && dispute.refundRequested <= 50) {
      return {
        resolved: true,
        resolution: 'Goodwill refund for first-time buyer',
        action: 'REFUND',
        reason: 'FIRST_DISPUTE_GOODWILL'
      }
    }
  }

  // Rule 4: Check for repeat offender seller
  const sellerDisputesInPast30Days = await prisma.dispute.count({
    where: {
      respondentId: dispute.respondentId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  })

  if (sellerDisputesInPast30Days >= REPEAT_OFFENDER_THRESHOLD) {
    return {
      resolved: false,
      resolution: null,
      action: 'ESCALATE',
      reason: `Seller has ${sellerDisputesInPast30Days} disputes in past 30 days - escalating to admin`
    }
  }

  // Rule 5: Non-delivery after 7 days (for digital products)
  if (dispute.type === 'NON_DELIVERY' && dispute.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: dispute.orderId }
    })

    if (order) {
      const daysSinceOrder = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceOrder >= DELIVERY_TIMEOUT_DAYS && order.status !== 'COMPLETED') {
        return {
          resolved: true,
          resolution: 'Auto-refund: Digital delivery not confirmed within 7 days',
          action: 'REFUND',
          reason: 'DELIVERY_TIMEOUT'
        }
      }
    }
  }

  // No auto-resolution applicable
  return {
    resolved: false,
    resolution: null,
    action: 'PENDING',
    reason: 'Awaiting manual review or seller response'
  }
}

/**
 * Apply auto-resolution to a dispute
 */
export async function applyAutoResolution(disputeId: string): Promise<{
  success: boolean
  dispute: typeof result | null
  message: string
}> {
  const resolution = await checkAutoResolution(disputeId)

  if (!resolution.resolved && resolution.action !== 'ESCALATE') {
    return {
      success: false,
      dispute: null,
      message: resolution.reason
    }
  }

  const result = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: resolution.action === 'ESCALATE' ? 'ESCALATED' : 'RESOLVED',
      resolution: resolution.resolution,
      resolvedBy: 'SYSTEM_AUTO',
      resolvedAt: new Date(),
      refundApproved: resolution.action === 'REFUND' 
        ? (await prisma.dispute.findUnique({ where: { id: disputeId } }))?.refundRequested 
        : undefined,
    }
  })

  // Add system message
  await prisma.disputeMessage.create({
    data: {
      disputeId,
      senderId: 'SYSTEM',
      senderRole: 'ADMIN',
      message: `[Automated Resolution]\n\nReason: ${resolution.reason}\n\nResolution: ${resolution.resolution}`,
      attachments: []
    }
  })

  // If refund was approved, process it
  if (resolution.action === 'REFUND' && result.orderId) {
    await processAutoRefund(result.orderId, result.refundApproved || 0)
  }

  return {
    success: true,
    dispute: result,
    message: `Dispute auto-resolved: ${resolution.reason}`
  }
}

/**
 * Process automatic refund for an order
 */
async function processAutoRefund(orderId: string, amount: number): Promise<void> {
  // Get order details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true
    }
  })

  if (!order) return

  // Update order status
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'REFUNDED',
      // Note: refund details stored in dispute record
    }
  })

  // Note: Actual payment refund would need to be processed via Stripe/Paystack
  // This would typically trigger a webhook or direct API call
  console.log(`[AUTO_REFUND] Order ${orderId} refunded for $${amount}`)
}

/**
 * Run auto-resolution check on all pending disputes
 * (Called by cron job)
 */
export async function runAutoResolutionBatch(): Promise<{
  processed: number
  resolved: number
  escalated: number
}> {
  const pendingDisputes = await prisma.dispute.findMany({
    where: {
      status: { in: ['OPEN', 'UNDER_REVIEW'] }
    },
    select: { id: true }
  })

  let resolved = 0
  let escalated = 0

  for (const dispute of pendingDisputes) {
    try {
      const result = await applyAutoResolution(dispute.id)
      if (result.success) {
        if (result.dispute?.status === 'ESCALATED') {
          escalated++
        } else {
          resolved++
        }
      }
    } catch (error) {
      console.error(`Failed to auto-resolve dispute ${dispute.id}:`, error)
    }
  }

  return {
    processed: pendingDisputes.length,
    resolved,
    escalated
  }
}

/**
 * Get dispute statistics for admin dashboard
 */
export async function getDisputeStats() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalOpen,
    totalResolved,
    totalEscalated,
    autoResolvedCount,
    _avgResolutionTime
  ] = await Promise.all([
    prisma.dispute.count({ where: { status: 'OPEN' } }),
    prisma.dispute.count({ where: { status: 'RESOLVED', createdAt: { gte: thirtyDaysAgo } } }),
    prisma.dispute.count({ where: { status: 'ESCALATED' } }),
    prisma.dispute.count({ 
      where: { 
        resolvedBy: 'SYSTEM_AUTO',
        createdAt: { gte: thirtyDaysAgo }
      } 
    }),
    prisma.dispute.aggregate({
      where: {
        status: 'RESOLVED',
        resolvedAt: { not: null },
        createdAt: { gte: thirtyDaysAgo }
      },
      _avg: {
        // We'd need a computed field for this, using a workaround
      }
    })
  ])

  // Calculate resolution rate
  const autoResolutionRate = totalResolved > 0 
    ? ((autoResolvedCount / totalResolved) * 100).toFixed(1)
    : '0'

  return {
    openDisputes: totalOpen,
    resolvedLast30Days: totalResolved,
    escalatedDisputes: totalEscalated,
    autoResolvedLast30Days: autoResolvedCount,
    autoResolutionRate: `${autoResolutionRate}%`,
  }
}
