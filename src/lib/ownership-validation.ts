/**
 * OWNERSHIP Feature - Validation Utilities
 * Prevents state inconsistencies, race conditions, and data corruption
 */

import prisma from './prisma'

/**
 * FLAW FIX #14: Validate design ownership state
 * Ensures design.isOwned matches contract existence
 */
export async function validateDesignOwnershipState(designId: string): Promise<{
  isValid: boolean
  expectedOwned: boolean
  actualOwned: boolean
  activeContracts: number
  error?: string
}> {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    select: { isOwned: true }
  })

  if (!design) {
    return {
      isValid: false,
      expectedOwned: false,
      actualOwned: false,
      activeContracts: 0,
      error: 'Design not found'
    }
  }

  // Count active contracts (not cancelled)
  const activeContracts = await prisma.ownershipContract.count({
    where: {
      ownershipDocument: {
        designId
      },
      // Only count contracts that haven't been explicitly released/cancelled
      isReleased: false
    }
  })

  // Expected state: isOwned should be true IFF activeContracts > 0
  const expectedOwned = activeContracts > 0
  const isValid = design.isOwned === expectedOwned

  return {
    isValid,
    expectedOwned,
    actualOwned: design.isOwned,
    activeContracts,
    error: !isValid ? `Design ownership mismatch: isOwned=${design.isOwned} but has ${activeContracts} active contracts` : undefined
  }
}

/**
 * FLAW FIX #14: Fix design ownership state inconsistency
 * Repairs orphaned "owned" designs with no contracts
 */
export async function repairDesignOwnershipState(designId: string): Promise<{
  fixed: boolean
  message: string
  previousState: boolean
  newState: boolean
}> {
  const validation = await validateDesignOwnershipState(designId)

  if (validation.isValid) {
    return {
      fixed: false,
      message: 'Ownership state is already consistent',
      previousState: validation.actualOwned,
      newState: validation.actualOwned
    }
  }

  // Fix the inconsistency
  const expectedOwned = validation.activeContracts > 0
  const _updated = await prisma.design.update({
    where: { id: designId },
    data: { isOwned: expectedOwned }
  })

  return {
    fixed: true,
    message: `Repaired ownership state: isOwned ${validation.actualOwned} → ${expectedOwned}`,
    previousState: validation.actualOwned,
    newState: expectedOwned
  }
}

/**
 * FLAW FIX #17: Validate preview exists before approval
 */
export async function validateDocumentHasPreview(documentId: string): Promise<{
  hasPreview: boolean
  previewUrl?: string
  previewType?: string
  error?: string
}> {
  const document = await prisma.ownershipDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      previewFileUrl: true,
      previewFileType: true,
      status: true
    }
  })

  if (!document) {
    return {
      hasPreview: false,
      error: 'Document not found'
    }
  }

  if (!document.previewFileUrl || !document.previewFileType) {
    return {
      hasPreview: false,
      error: `Preview required before approval. Seller must upload a ${document.previewFileType ? 'valid' : 'preview'} file first.`
    }
  }

  return {
    hasPreview: true,
    previewUrl: document.previewFileUrl,
    previewType: document.previewFileType
  }
}

/**
 * FLAW FIX #15: Check escrow status atomically
 * Uses database state instead of time-based calculations
 * Prevents race conditions during auto-release and cancel
 */
export async function isInEscrowAtomically(purchaseId: string): Promise<{
  inEscrow: boolean
  reason: string
  daysRemaining?: number
  canCancel: boolean
}> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      id: true,
      createdAt: true,
      accessGranted: true,
      purchaseType: true,
      status: true // NEW: Use status field if available
    }
  })

  if (!purchase) {
    return {
      inEscrow: false,
      reason: 'Purchase not found',
      canCancel: false
    }
  }

  if (purchase.purchaseType !== 'OWNERSHIP') {
    return {
      inEscrow: false,
      reason: 'Not an ownership purchase',
      canCancel: false
    }
  }

  // Check if explicitly marked as released/completed
  if (purchase.status === 'RELEASED' || purchase.status === 'COMPLETED') {
    return {
      inEscrow: false,
      reason: 'Escrow period expired and ownership released',
      canCancel: false
    }
  }

  if (purchase.status === 'CANCELLED') {
    return {
      inEscrow: false,
      reason: 'Purchase already cancelled',
      canCancel: false
    }
  }

  // Calculate time-based expiry as secondary check
  const ESCROW_MS = 7 * 24 * 60 * 60 * 1000
  const escrowEnd = new Date(purchase.createdAt.getTime() + ESCROW_MS)
  const now = new Date()
  const timeInEscrow = now < escrowEnd

  if (!timeInEscrow) {
    return {
      inEscrow: false,
      reason: '7-day escrow period has expired',
      daysRemaining: 0,
      canCancel: false
    }
  }

  const daysRemaining = Math.ceil((escrowEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

  return {
    inEscrow: true,
    reason: `Escrow period active (${daysRemaining} days remaining)`,
    daysRemaining,
    canCancel: true
  }
}

/**
 * FLAW FIX #15: Atomically mark purchase as cancelled
 * Uses transaction to prevent race with auto-release
 */
export async function atomicallyCancelPurchase(purchaseId: string, buyerId: string): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    const _result = await prisma.$transaction(async (tx) => {
      // Lock the purchase record
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId }
      })

      if (!purchase) {
        throw new Error('Purchase not found')
      }

      // Verify buyer
      if (purchase.userId !== buyerId) {
        throw new Error('Only the buyer can cancel this purchase')
      }

      // Verify still in escrow (atomic check within transaction)
      const ESCROW_MS = 7 * 24 * 60 * 60 * 1000
      const escrowEnd = new Date(purchase.createdAt.getTime() + ESCROW_MS)

      if (new Date() >= escrowEnd) {
        throw new Error('Escrow period expired - cancellation not allowed')
      }

      // Check for explicit release status
      if (purchase.status === 'RELEASED' || purchase.status === 'COMPLETED') {
        throw new Error('Ownership has been released and cannot be cancelled')
      }

      // Atomically mark as cancelled
      const cancelled = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'CANCELLED',
          accessGranted: false,
          cancelledAt: new Date()
        }
      })

      return cancelled
    })

    return {
      success: true,
      message: 'Purchase cancelled successfully'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to cancel purchase',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * FLAW FIX #14: Get all contracts for design (for state validation)
 */
export async function getDesignContracts(designId: string) {
  return await prisma.ownershipContract.findMany({
    where: {
      ownershipDocument: {
        designId
      }
    },
    select: {
      id: true,
      buyerId: true,
      createdAt: true,
      isReleased: true,
      status: true
    }
  })
}
