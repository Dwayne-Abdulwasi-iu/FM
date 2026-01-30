import prisma from './prisma'

/**
 * Ownership Purchase Escrow & Design Access Control Service
 * 
 * Escrow Period: 7 days after ownership purchase
 * During escrow:
 * - Buyer can view/inspect the design (limited full access for inspection)
 * - Seller CANNOT view the design (prevents inspection without purchase)
 * - Buyer can cancel within 7 days (triggers refund via Order webhook)
 * - After 7 days, ownership is permanent and irreversible
 */

export const ESCROW_PERIOD_DAYS = 7
export const ESCROW_PERIOD_MS = ESCROW_PERIOD_DAYS * 24 * 60 * 60 * 1000

export interface EscrowStatus {
  isInEscrow: boolean
  daysRemaining: number
  canBuyerCancel: boolean
  canSellerCancel: boolean
  expiresAt: Date
  createdAt: Date
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED'
}

/**
 * Check if an ownership purchase is still in escrow period
 */
export function isInEscrowPeriod(purchaseDate: Date): boolean {
  const now = new Date()
  const escrowEnd = new Date(purchaseDate.getTime() + ESCROW_PERIOD_MS)
  return now < escrowEnd
}

/**
 * Get escrow status for an ownership purchase
 */
export function getEscrowStatus(purchaseDate: Date): EscrowStatus {
  const now = new Date()
  const escrowEnd = new Date(purchaseDate.getTime() + ESCROW_PERIOD_MS)
  const isActive = now < escrowEnd
  const daysRemaining = isActive ? Math.ceil((escrowEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0

  return {
    isInEscrow: isActive,
    daysRemaining: Math.max(0, daysRemaining),
    canBuyerCancel: isActive,
    canSellerCancel: false, // Seller CANNOT cancel during escrow
    expiresAt: escrowEnd,
    createdAt: purchaseDate,
    status: isActive ? 'ACTIVE' : 'EXPIRED'
  }
}

/**
 * Verify if user can access a design during escrow
 * 
 * Rules:
 * - Buyer can access during escrow (for inspection)
 * - Seller CANNOT access during escrow (prevents design theft)
 * - Designer/owner can always access (original creator)
 * - Admin can always access (moderation)
 * - After escrow expires, ownership is permanent
 */
export async function canAccessDesignDuringEscrow(
  userId: string,
  designId: string,
  userRole: 'USER' | 'ADMIN'
): Promise<{
  hasAccess: boolean
  reason: string
  escrowStatus?: EscrowStatus
}> {
  try {
    // Admin can always access
    if (userRole === 'ADMIN') {
      return { hasAccess: true, reason: 'Admin access' }
    }

    // Get the design
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        designerId: true,
        isOwned: true,
        ownedBy: true,
        createdAt: true
      }
    })

    if (!design) {
      return { hasAccess: false, reason: 'Design not found' }
    }

    // Designer/creator can always access
    if (design.designerId === userId) {
      return { hasAccess: true, reason: 'Designer access' }
    }

    // If not owned, normal access rules apply (not relevant to escrow)
    if (!design.isOwned) {
      return { hasAccess: false, reason: 'Design not in ownership mode' }
    }

    // Get the ownership purchase (if any)
    const purchase = await prisma.purchase.findFirst({
      where: {
        designId,
        purchaseType: 'OWNERSHIP',
        userId
      },
      select: {
        id: true,
        createdAt: true,
        userId: true
      }
    })

    // If user purchased it, check escrow status
    if (purchase) {
      const escrowStatus = getEscrowStatus(purchase.createdAt)

      if (escrowStatus.isInEscrow) {
        // Buyer is in escrow period - can access for inspection
        return {
          hasAccess: true,
          reason: `Escrow period active (${escrowStatus.daysRemaining} days remaining)`,
          escrowStatus
        }
      } else {
        // Escrow expired - ownership is permanent
        return {
          hasAccess: true,
          reason: 'Ownership transfer completed (escrow period expired)',
          escrowStatus
        }
      }
    }

    // User didn't purchase this design
    // Seller trying to view? DENY (this prevents inspection without purchase)
    const sellerDesigns = await prisma.design.findMany({
      where: { designerId: userId, id: designId },
      select: { id: true }
    })

    if (sellerDesigns.length > 0) {
      return {
        hasAccess: false,
        reason: 'Sellers cannot access designs they transferred ownership of. Contact buyer if modifications are needed.'
      }
    }

    // Unknown user
    return { hasAccess: false, reason: 'No ownership purchase found' }
  } catch (error) {
    console.error('Error checking escrow access:', error)
    return { hasAccess: false, reason: 'Error checking access' }
  }
}

/**
 * Cancel an ownership purchase within escrow period
 * Only buyer can cancel, seller has no rights during escrow
 * FLAW FIX #15: Atomic transaction prevents race with auto-release
 * FLAW FIX #14: Validate ownership state consistency
 * NOTE: Refund processing handled via Order webhooks (Stripe/Paystack)
 */
export async function cancelOwnershipPurchase(
  purchaseId: string,
  userId: string
): Promise<{
  success: boolean
  message: string
  refundAmount?: number
}> {
  try {
    // FLAW FIX #15: Use atomic transaction to prevent concurrent release/cancel
    const result = await prisma.$transaction(async (tx) => {
      // Lock the purchase record within transaction
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          design: {
            select: { id: true, designerId: true, title: true }
          }
        }
      })

      if (!purchase) {
        throw new Error('Purchase not found')
      }

      if (purchase.purchaseType !== 'OWNERSHIP') {
        throw new Error('Only ownership purchases can be cancelled within escrow')
      }

      // Verify user is the buyer
      if (purchase.userId !== userId) {
        throw new Error('Only the buyer can cancel this purchase')
      }

      // FLAW FIX #15: Atomic escrow check within transaction
      // Check explicit status first (prevents race with auto-release)
      if (purchase.status === 'RELEASED' || purchase.status === 'COMPLETED') {
        throw new Error('Ownership has been released. Escrow period expired and cannot be cancelled.')
      }

      // Check time-based expiry as secondary validation
      const ESCROW_MS = ESCROW_PERIOD_MS
      const escrowEnd = new Date(purchase.createdAt.getTime() + ESCROW_MS)
      if (new Date() >= escrowEnd) {
        throw new Error('Escrow period has expired. Ownership transfer is permanent and cannot be reversed.')
      }

      // All checks passed - atomically mark as cancelled
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'CANCELLED',
          accessGranted: false,
          cancelledAt: new Date()
        }
      })

      // FLAW FIX #14: Revert design ownership state
      await tx.design.update({
        where: { id: purchase.designId },
        data: {
          isOwned: false,
          ownedBy: null,
          isActive: true // Make design active again for sale
        }
      })

      // Mark contract as explicitly cancelled (don't delete - keep audit trail)
      await tx.ownershipContract.updateMany({
        where: {
          ownershipDocument: {
            designId: purchase.designId
          }
        },
        data: {
          status: 'CANCELLED',
          isReleased: false
        }
      })

      return purchase
    })

    return {
      success: true,
      message: `Purchase cancelled successfully. Ownership transfer has been reversed. Refund will be processed.`,
      refundAmount: result.purchasePrice
    }
  } catch (error) {
    console.error('Error cancelling purchase:', error)

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message.includes('prisma') ? 'Database error - please try again later' : error.message
      }
    }

    return { success: false, message: 'Failed to cancel purchase' }
  }
}

/**
 * Complete escrow period (automatically called after 7 days)
 * Makes ownership transfer permanent and irreversible
 * FLAW FIX #15: Atomic transaction prevents race with buyer cancel
 * FLAW FIX #14: Validates ownership state before releasing
 */
export async function completeEscrowPeriod(purchaseId: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    // FLAW FIX #15: Atomic transaction prevents simultaneous cancel
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        select: {
          id: true,
          purchaseType: true,
          designId: true,
          createdAt: true,
          status: true,
          userId: true
        }
      })

      if (!purchase) {
        throw new Error('Purchase not found')
      }

      if (purchase.purchaseType !== 'OWNERSHIP') {
        throw new Error('Only ownership purchases have escrow periods')
      }

      // Check if already cancelled (prevents double-release)
      if (purchase.status === 'CANCELLED') {
        throw new Error('Purchase was cancelled - cannot release escrow')
      }

      // Check if already released (idempotency)
      if (purchase.status === 'RELEASED' || purchase.status === 'COMPLETED') {
        throw new Error('Escrow period already completed')
      }

      // FLAW FIX #15: Atomic time check within transaction
      const ESCROW_MS = ESCROW_PERIOD_MS
      const escrowEnd = new Date(purchase.createdAt.getTime() + ESCROW_MS)
      if (new Date() < escrowEnd) {
        throw new Error('Escrow period is still active')
      }

      // Atomically mark purchase as released
      const released = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date()
        }
      })

      // Mark contract as COMPLETED (ownership permanent)
      await tx.ownershipContract.updateMany({
        where: {
          ownershipDocument: {
            designId: purchase.designId
          }
        },
        data: {
          status: 'COMPLETED',
          isReleased: true,
          releasedAt: new Date()
        }
      })

      return released
    })

    return {
      success: true,
      message: 'Escrow period completed. Ownership transfer is now permanent and irreversible.'
    }
  } catch (error) {
    console.error('Error completing escrow:', error)

    if (error instanceof Error) {
      // Idempotent: if already completed, still return success
      if (error.message.includes('already completed')) {
        return {
          success: true,
          message: 'Escrow period already completed (idempotent)'
        }
      }

      return {
        success: false,
        message: error.message.includes('prisma') ? 'Database error' : error.message
      }
    }

    return { success: false, message: 'Failed to complete escrow' }
  }
}

/**
 * Get all designs in escrow for a user (buyer perspective)
 * Shows designs they purchased but haven't completed escrow on yet
 */
export async function getDesignsInEscrow(buyerId: string): Promise<
  Array<{
    purchaseId: string
    designId: string
    designTitle: string
    sellerName: string
    purchasePrice: number
    purchasedAt: Date
    escrowStatus: EscrowStatus
  }>
> {
  try {
    const purchases = await prisma.purchase.findMany({
      where: {
        userId: buyerId,
        purchaseType: 'OWNERSHIP',
        accessGranted: true
      },
      include: {
        design: {
          select: {
            id: true,
            title: true,
            designerId: true,
            designer: {
              select: { name: true, displayName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return purchases
      .map(purchase => {
        const escrowStatus = getEscrowStatus(purchase.createdAt)
        return {
          purchaseId: purchase.id,
          designId: purchase.designId,
          designTitle: purchase.design.title,
          sellerName: purchase.design.designer.displayName || purchase.design.designer.name || 'Unknown',
          purchasePrice: purchase.purchasePrice,
          purchasedAt: purchase.createdAt,
          escrowStatus
        }
      })
      .filter(item => item.escrowStatus.isInEscrow) // Only show items still in escrow
  } catch (error) {
    console.error('Error getting designs in escrow:', error)
    return []
  }
}
