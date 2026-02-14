/**
 * Warehouse Storage Management
 * 
 * Rolling 180-day cycles for ADMIN_STOCK products
 * Days continue: 180/360/540/720 etc until stock = 0
 * At each 180-day mark: -1 unit per variant (keeps one to offset shipping)
 */

import prisma from '@/lib/prisma'
import { differenceInDays } from 'date-fns'
import {
  sendMonth5WarehouseNotification,
  sendWarehouseFinalWarning,
  sendWarehouseDeductionConfirmation,
  sendWarehouseProductDelistedNotification,
  sendRepostApprovedNotification,
  sendRepostRejectedNotification,
} from '@/lib/email'

// Constants
export const WAREHOUSE_CYCLE_DAYS = 180
export const MONTH_5_START_DAY = 120  // Day 120 onwards
export const MONTH_5_END_DAY = 180   // Day 180 is last day of Month 5
export const AUTO_RETURN_DAY = 180   // Day 180 triggers stock deduction

// Repost limits
export const MAX_REPOSTS_PER_DAY = 3
export const REPOST_REASONS = [
  'Price adjustment',
  'Seasonal promotion',
  'Inventory management',
  'Product improvement',
  'Market response',
  'Other'
] as const

export type RepostReason = typeof REPOST_REASONS[number]

/**
 * Calculate days in warehouse from received date
 */
export function getDaysInWarehouse(receivedAt: Date | null | undefined): number {
  if (!receivedAt) return 0
  return differenceInDays(new Date(), new Date(receivedAt))
}

/**
 * Calculate current warehouse cycle (0-180, 181-360, 361-540, etc)
 */
export function getCurrentCycleInfo(daysInWarehouse: number) {
  const cycleNumber = Math.floor(daysInWarehouse / WAREHOUSE_CYCLE_DAYS)
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS
  const cycleStart = cycleNumber * WAREHOUSE_CYCLE_DAYS
  const cycleEnd = (cycleNumber + 1) * WAREHOUSE_CYCLE_DAYS
  const daysRemaining = cycleEnd - daysInWarehouse
  
  return {
    cycleNumber,           // Which 180-day cycle (0, 1, 2, 3...)
    daysInCurrentCycle,    // Days into current cycle (0-180)
    cycleStart,            // Starting day of cycle
    cycleEnd,              // Ending day of cycle
    daysRemaining,         // Days until next deduction
    displayDays: `${daysInWarehouse}/${cycleEnd}`, // Show as "180/360", "181/360", etc
    nextDeductionDay: cycleEnd, // When next unit will be deducted
    unitsDeducted: cycleNumber, // Total units already deducted
  }
}

/**
 * Check if product is in Month 5 (Day 120-180)
 */
export function isInMonth5(daysInWarehouse: number): boolean {
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS
  return daysInCurrentCycle >= MONTH_5_START_DAY && daysInCurrentCycle < WAREHOUSE_CYCLE_DAYS
}

/**
 * Check if product needs attention (in Month 5 or last week before deduction)
 */
export function needsAttention(daysInWarehouse: number): boolean {
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS
  const daysSinceLastDeduction = Math.max(0, daysInCurrentCycle)
  
  // In Month 5 or within 7 days of next deduction
  return isInMonth5(daysInWarehouse) || daysSinceLastDeduction >= 173
}

/**
 * Check if can repost (Day 120-179 only)
 */
export function canRepost(daysInWarehouse: number): { can: boolean; reason?: string } {
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS
  const cycleNumber = Math.floor(daysInWarehouse / WAREHOUSE_CYCLE_DAYS)
  
  if (daysInCurrentCycle < MONTH_5_START_DAY) {
    const daysUntilMonth5 = MONTH_5_START_DAY - daysInCurrentCycle
    return {
      can: false,
      reason: `Product not eligible yet. Repost available starting Day ${MONTH_5_START_DAY} (${daysUntilMonth5} days remaining)`
    }
  }
  
  if (daysInCurrentCycle >= WAREHOUSE_CYCLE_DAYS) {
    return {
      can: false,
      reason: 'Repost window closed. Products are being deducted from stock.'
    }
  }
  
  return { can: true }
}

/**
 * Check if can reduce price (Month 5 only)
 */
export function canReducePrice(daysInWarehouse: number): { can: boolean; reason?: string } {
  return canRepost(daysInWarehouse) // Same as repost window
}

/**
 * Get stock deduction info for product with variants
 */
export function getStockDeductionInfo(currentStock: number, variantCount: number, daysInWarehouse: number) {
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS
  const isDeductionDay = daysInCurrentCycle === 0 && daysInWarehouse > 0
  const daysUntilDeduction = WAREHOUSE_CYCLE_DAYS - daysInCurrentCycle
  
  // Total units that would be deducted (1 per variant per 180-day cycle)
  const totalDeductionPerCycle = variantCount
  
  return {
    isDeductionDay,
    daysUntilDeduction,
    totalCurrentStock: currentStock,
    totalDeductionPerCycle,
    stockAfterDeduction: Math.max(0, currentStock - totalDeductionPerCycle),
    willStockBecomeZero: currentStock <= totalDeductionPerCycle,
  }
}

/**
 * Get repost request history for a product
 */
export async function getRepostHistory(productId: string) {
  return await prisma.boutiqueRepostRequest.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      reason: true,
      status: true,
      originalStock: true,
      requestedStock: true,
      approvedStock: true,
      daysInWarehouse: true,
      createdAt: true,
      reviewedAt: true,
      reviewedBy: true,
      adminNotes: true,
    }
  })
}

/**
 * Check if seller has hit daily repost limit (PENDING + APPROVED)
 */
export async function hasHitDailyRepostLimit(sellerId: string): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const count = await prisma.boutiqueRepostRequest.count({
    where: {
      sellerId,
      status: { in: ['PENDING', 'APPROVED'] },
      createdAt: {
        gte: today,
      }
    }
  })
  
  return count >= MAX_REPOSTS_PER_DAY
}

/**
 * Get reposts remaining today
 */
export async function getRepostsRemainingToday(sellerId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const count = await prisma.boutiqueRepostRequest.count({
    where: {
      sellerId,
      status: { in: ['PENDING', 'APPROVED'] },
      createdAt: {
        gte: today,
      }
    }
  })
  
  return Math.max(0, MAX_REPOSTS_PER_DAY - count)
}

/**
 * Submit repost request
 */
export async function submitRepostRequest(
  productId: string,
  sellerId: string,
  reason: string,
  notes: string | undefined,
  product: any // BoutiqueProduct
) {
  const daysInWarehouse = getDaysInWarehouse(product.receivedByAdminAt)
  const canRepostCheck = canRepost(daysInWarehouse)
  
  if (!canRepostCheck.can) {
    throw new Error(canRepostCheck.reason || 'Cannot repost at this time')
  }
  
  // Check daily limit (count PENDING + APPROVED requests)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const repostCountToday = await prisma.boutiqueRepostRequest.count({
    where: {
      sellerId,
      status: { in: ['PENDING', 'APPROVED'] },
      createdAt: { gte: today },
    }
  })
  
  if (repostCountToday >= MAX_REPOSTS_PER_DAY) {
    throw new Error(`Maximum ${MAX_REPOSTS_PER_DAY} reposts per day. Try again tomorrow.`)
  }
  
  // Calculate stock after deduction
  const variants = await prisma.boutiqueProductVariant.findMany({
    where: { productId }
  })
  
  let totalStock = 0
  for (const variant of variants) {
    totalStock += variant.quantity
  }
  
  // Validate minimum stock for repost
  if (totalStock < 2) {
    throw new Error('Cannot repost: need at least 2 units. After 180 days, remaining items are deducted.')
  }
  
  // Deduct 1 unit from total
  const newStock = totalStock - 1
  
  // Create request
  const request = await prisma.boutiqueRepostRequest.create({
    data: {
      productId,
      sellerId,
      reason,
      notes,
      originalStock: totalStock,
      requestedStock: newStock,
      daysInWarehouse,
      expiryCountdown: WAREHOUSE_CYCLE_DAYS - (daysInWarehouse % WAREHOUSE_CYCLE_DAYS),
    }
  })
  
  // Lock stock on product to prevent double-repost
  await prisma.boutiqueProduct.update({
    where: { id: productId },
    data: {
      isStockLocked: true,
      lockedStockValue: newStock,
      stockLockedAt: new Date(),
    }
  })
  
  return request
}

/**
 * Approve repost request
 */
export async function approveRepostRequest(
  requestId: string,
  adminId: string,
  adminNotes: string | undefined
) {
  const request = await prisma.boutiqueRepostRequest.findUnique({
    where: { id: requestId },
    include: { 
      product: { 
        include: { 
          variants: true,
          seller: { select: { id: true, email: true, name: true } }
        } 
      },
      seller: { select: { id: true, email: true, name: true } }
    }
  })
  
  if (!request) throw new Error('Request not found')
  if (request.status !== 'PENDING') throw new Error('Request already processed')
  
  // CRITICAL: Validate stock hasn't changed since request
  const totalVariantStock = request.product.variants.reduce((sum, v) => sum + v.quantity, 0)
  if (totalVariantStock <= 0) {
    throw new Error('Product has no stock - repost cannot be approved')
  }
  
  // CRITICAL: Verify original stock matches what was locked
  if (request.originalStock !== request.product.currentStock) {
    throw new Error(
      `Stock mismatch detected: Original ${request.originalStock} but current is ${request.product.currentStock}. ` +
      `Possible sale or concurrent modification. Rejecting repost.`
    )
  }
  
  // Deduct 1 unit from variant with most stock (distributed stock management)
  const sortedVariants = [...request.product.variants]
    .sort((a, b) => b.quantity - a.quantity)
  
  let totalDeducted = 0
  for (const variant of sortedVariants) {
    if (variant.quantity > 0) {
      await prisma.boutiqueProductVariant.update({
        where: { id: variant.id },
        data: { quantity: Math.max(0, variant.quantity - 1) }
      })
      totalDeducted += 1
      break // Only deduct 1 per repost approval
    }
  }
  
  if (totalDeducted === 0) {
    throw new Error('Unable to deduct stock - all variants empty')
  }
  
  // Update product with approval details
  const newStock = request.requestedStock
  const daysInWarehouse = getDaysInWarehouse(request.product.receivedByAdminAt)
  
  await prisma.boutiqueProduct.update({
    where: { id: request.productId },
    data: {
      status: 'LIVE',
      isStockLocked: false,
      lockedStockValue: null,
      stockLockedAt: null,
      currentStock: newStock,
      lastRepostDate: new Date(),
      repostCount: { increment: 1 },
      month5NotificationSent: false, // Reset notification for new cycle
    }
  })
  
  // Update request with approval details
  await prisma.boutiqueRepostRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      approvedStock: newStock,
      reviewedAt: new Date(),
      reviewedBy: adminId,
      adminNotes,
    }
  })
  
  // Send approval email to seller
  try {
    await sendRepostApprovedNotification({
      sellerName: request.seller.name || 'Seller',
      sellerEmail: request.seller.email,
      productTitle: request.product.title,
      productId: request.productId,
      originalStock: request.originalStock,
      newStock: request.requestedStock,
      stockDeducted: request.originalStock - request.requestedStock,
      daysReset: true
    })
  } catch (error) {
    console.error(`Failed to send repost approval email for request ${requestId}:`, error)
  }
}

/**
 * Reject repost request
 */
export async function rejectRepostRequest(
  requestId: string,
  adminId: string,
  adminNotes: string | undefined
) {
  const request = await prisma.boutiqueRepostRequest.findUnique({
    where: { id: requestId },
    include: {
      product: { select: { id: true, title: true } },
      seller: { select: { id: true, email: true, name: true } }
    }
  })
  
  if (!request) throw new Error('Request not found')
  if (request.status !== 'PENDING') throw new Error('Request already processed')
  
  // Unlock stock on product (return to original)
  await prisma.boutiqueProduct.update({
    where: { id: request.productId },
    data: {
      isStockLocked: false,
      lockedStockValue: null,
      stockLockedAt: null,
    }
  })
  
  // Update request
  await prisma.boutiqueRepostRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewedAt: new Date(),
      reviewedBy: adminId,
      adminNotes,
    }
  })
  
  // Send rejection email to seller
  try {
    await sendRepostRejectedNotification({
      sellerName: request.seller.name || 'Seller',
      sellerEmail: request.seller.email,
      productTitle: request.product.title,
      productId: request.productId,
      adminNotes
    })
  } catch (error) {
    console.error(`Failed to send repost rejection email for request ${requestId}:`, error)
  }
}

/**
 * Request return from warehouse at any time with tiered admin fee
 * Fee structure:
 * - Days 0-119: Admin keeps 2 units/variant
 * - Days 120-180: Admin keeps 1 unit/variant
 * - Day 181+: Auto-return already triggered
 */
/**
 * STEP 1: Seller requests return (no deduction yet)
 * Creates PENDING_ADMIN_REVIEW shipment
 * Returns fee info for seller verification modal
 */
export async function requestWarehouseReturn(
  productId: string,
  sellerId: string,
  product: any // BoutiqueProduct with variants
) {
  // Check if product is in return already
  if (product.fullReturnEnabled) {
    throw new Error('Return already initiated for this product')
  }

  const daysInWarehouse = getDaysInWarehouse(product.warehouseReceivedAt)
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS

  // Calculate admin fee based on days in cycle
  let adminFeePerVariant = 1 // Default: Days 120-180
  if (daysInCurrentCycle < MONTH_5_START_DAY) {
    adminFeePerVariant = 2 // Days 0-119
  }

  // Get current stock
  const variants = await prisma.boutiqueProductVariant.findMany({
    where: { productId }
  })

  let totalReturning = 0
  const feeDetails: { variantId: string; quantity: number; fee: number; returning: number }[] = []

  // Calculate what will be returned
  for (const variant of variants) {
    const fee = Math.min(adminFeePerVariant, variant.quantity) // Fee capped at actual stock
    const returning = Math.max(0, variant.quantity - fee)

    if (returning > 0 || fee > 0) {
      totalReturning += returning
      feeDetails.push({
        variantId: variant.id,
        quantity: variant.quantity,
        fee,
        returning
      })
    }
  }

  // Check if return shipment already exists
  const existingReturn = await prisma.sellerToAdminShipment.findFirst({
    where: {
      sellerId,
      productIds: { has: productId },
      status: { in: ['PENDING_ADMIN_REVIEW', 'APPROVED_BY_ADMIN', 'SHIPPED_BY_ADMIN', 'RECEIVED_BY_SELLER'] }
    }
  })

  if (existingReturn) {
    throw new Error('Return shipment already exists for this product')
  }

  // Create return shipment in PENDING_ADMIN_REVIEW status (no -2 variant yet)
  await prisma.sellerToAdminShipment.create({
    data: {
      sellerId,
      productIds: [productId],
      status: 'PENDING_ADMIN_REVIEW', // Awaiting admin approval
      itemsExpected: totalReturning,
      sellerNotes: `Seller requested return after ${daysInWarehouse} days in warehouse.`,
      adminNotes: `Seller requested return at day ${daysInWarehouse} of cycle. Proposed fee: ${adminFeePerVariant} unit(s) per variant.`,
      disputeNotes: ''
    }
  })

  // Mark product as return-in-progress (not locked yet)
  await prisma.boutiqueProduct.update({
    where: { id: productId },
    data: {
      fullReturnEnabled: true,
      returnRequestedAt: new Date(),
      status: 'RETURN_IN_PROGRESS'
    }
  })

  return {
    daysInWarehouse,
    daysInCurrentCycle,
    adminFeePerVariant,
    totalReturning,
    feeDetails
  }
}

/**
 * STEP 2: Admin approves return (creates -2 variant - irreversible)
 * Creates -2 variant representing locked units for admin fee
 * Sends approval email to seller
 */
export async function approveWarehouseReturn(
  productId: string,
  sellerId: string,
  product: any,
  adminNotes?: string
) {
  // Verify shipment exists and is still pending or being approved
  const shipment = await prisma.sellerToAdminShipment.findFirst({
    where: {
      sellerId,
      productIds: { has: productId },
      status: { in: ['PENDING_ADMIN_REVIEW', 'APPROVED_BY_ADMIN'] }
    }
  })

  if (!shipment) {
    throw new Error('No pending return request found for this product')
  }

  // Fetch fresh product data to ensure we have warehouseReceivedAt
  const freshProduct = await prisma.boutiqueProduct.findUnique({
    where: { id: productId }
  })

  if (!freshProduct) {
    throw new Error('Product not found')
  }

  const daysInWarehouse = getDaysInWarehouse(freshProduct.warehouseReceivedAt)
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS

  // Calculate fee
  let adminFeePerVariant = 1
  if (daysInCurrentCycle < MONTH_5_START_DAY) {
    adminFeePerVariant = 2
  }

  // Create -2 variant for each existing variant (irreversible fee lock)
  const variants = await prisma.boutiqueProductVariant.findMany({
    where: { productId },
    select: { id: true, quantity: true }
  })

  for (const variant of variants) {
    // Create -2 variant (admin fee lock)
    await prisma.boutiqueProductVariant.create({
      data: {
        productId,
        quantity: -adminFeePerVariant,
        sku: `ADMIN-FEE-${productId}-${Date.now()}`,
        color: `Admin Fee Lock (${adminFeePerVariant} units)`,
        priceAdjustment: 0
      }
    })
  }

  // Update shipment to APPROVED_BY_ADMIN (idempotent - safe to call multiple times)
  await prisma.sellerToAdminShipment.update({
    where: { id: shipment.id },
    data: {
      status: 'APPROVED_BY_ADMIN',
      adminNotes: adminNotes ? `${shipment.adminNotes || ''}\n\n[APPROVED]: ${adminNotes}` : shipment.adminNotes
    }
  })

  // Update product status to reflect return approval
  const updateResult = await prisma.boutiqueProduct.update({
    where: { id: productId },
    data: {
      status: 'IN_RETURN'
    }
  })
  console.log('Product status updated to IN_RETURN:', {
    productId,
    oldStatus: product.status,
    newStatus: updateResult.status,
    timestamp: new Date().toISOString()
  })

  return {
    daysInWarehouse,
    daysInCurrentCycle,
    adminFeePerVariant,
    shipmentId: shipment.id
  }
}

/**
 * Process warehouse deductions and returns (cron job)
 * Runs daily to:
 * 1. Send Month 5 notifications (Day 120)
 * 2. Send final warnings (Day 173)
 * 3. Process automatic stock deductions (Day 180, 360, 540, etc.)
 */
export function canBeLiquidated(daysInWarehouse: number, status: string): boolean {
  if (status !== 'LIVE') return false
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS
  return daysInCurrentCycle === 0 && daysInWarehouse >= WAREHOUSE_CYCLE_DAYS
}

export async function processWarehouseDeductions() {
  const results = {
    month5Sent: 0,
    month5Failed: 0,
    finalWarningsSent: 0,
    finalWarningsFailed: 0,
    processed: 0,
    failed: 0,
    errors: [] as string[]
  }
  
  // Find all LIVE products in ADMIN_STOCK
  const products = await prisma.boutiqueProduct.findMany({
    where: {
      status: 'LIVE',
      fulfillmentMethod: 'ADMIN_STOCK',
      receivedByAdminAt: { not: null },
    },
    include: {
      variants: true,
      seller: { select: { id: true, email: true, name: true } },
      repostRequests: { where: { status: 'APPROVED' } }
    }
  })
  
  for (const product of products) {
    try {
      const daysInWarehouse = getDaysInWarehouse(product.receivedByAdminAt)
      const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS
      const totalStock = product.variants.reduce((sum, v) => sum + v.quantity, 0)
      const repostsToday = await getRepostsRemainingToday(product.sellerId)
      
      // Step 1: Send Month 5 notification on Day 120
      if (daysInCurrentCycle === MONTH_5_START_DAY && !product.month5NotificationSent) {
        try {
          const sent = await sendMonth5WarehouseNotification({
            sellerName: product.seller.name || 'Seller',
            sellerEmail: product.seller.email,
            productTitle: product.title,
            productId: product.id,
            daysInWarehouse,
            currentStock: totalStock,
            cycleEndDay: WAREHOUSE_CYCLE_DAYS,
            repostsRemaining: repostsToday
          })
          
          if (sent) {
            await prisma.boutiqueProduct.update({
              where: { id: product.id },
              data: { month5NotificationSent: true }
            })
            results.month5Sent++
          } else {
            results.month5Failed++
          }
        } catch (error) {
          results.month5Failed++
          results.errors.push(`Month 5 notification for ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      // Step 2: Send final warning on Day 173 (7 days before deduction)
      if (daysInCurrentCycle === 173) {
        try {
          const sent = await sendWarehouseFinalWarning({
            sellerName: product.seller.name || 'Seller',
            sellerEmail: product.seller.email,
            productTitle: product.title,
            productId: product.id,
            daysInWarehouse,
            daysUntilDeduction: WAREHOUSE_CYCLE_DAYS - daysInCurrentCycle,
            currentStock: totalStock
          })
          
          if (sent) {
            results.finalWarningsSent++
          } else {
            results.finalWarningsFailed++
          }
        } catch (error) {
          results.finalWarningsFailed++
          results.errors.push(`Final warning for ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      // Step 3a: Auto-return to seller after Day 181 (if not reposted)
      // Keep 1 unit per variant as admin liquidation fee, return rest
      if (daysInCurrentCycle === 1 && daysInWarehouse > WAREHOUSE_CYCLE_DAYS) {
        // Check if product is being reposted in this cycle
        const latestRepost = product.repostRequests.length > 0 
          ? product.repostRequests.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0]
          : null
        
        const isReposted = latestRepost && 
          differenceInDays(new Date(), new Date(latestRepost.createdAt)) < WAREHOUSE_CYCLE_DAYS
        
        if (!isReposted && !product.fullReturnEnabled) {
          // NOT reposted & NO return initiated yet - trigger auto-return
          let totalReturning = 0
          const keepingPerVariant: Record<string, number> = {}
          
          for (const variant of product.variants) {
            // Keep 1 unit as liquidation fee, return the rest
            const keeping = Math.min(1, variant.quantity) // Keep 1 if available
            const returning = Math.max(0, variant.quantity - keeping)
            
            if (returning > 0) {
              totalReturning += returning
              keepingPerVariant[variant.id] = keeping
            }
          }
          
          if (totalReturning > 0) {
            // Check if return shipment already exists
            const existingReturn = await prisma.sellerToAdminShipment.findFirst({
              where: {
                sellerId: product.sellerId,
                productIds: { has: product.id },
                status: { in: ['RETURN_SCHEDULED', 'PENDING', 'SHIPPED', 'IN_TRANSIT'] }
              }
            })
            
            if (!existingReturn) {
              // Initiate auto-return process using SellerToAdminShipment with RETURN_SCHEDULED status
              try {
                await prisma.sellerToAdminShipment.create({
                  data: {
                    sellerId: product.sellerId,
                    productIds: [product.id],
                    status: 'RETURN_SCHEDULED', // Standard return status matching rejected product returns
                    itemsExpected: totalReturning,
                    sellerNotes: `Auto-return triggered after ${daysInWarehouse} days in warehouse without repost.`,
                    adminNotes: `Auto-return policy applied: Keeping ${product.variants.length} unit(s) as storage liquidation fee. Returning ${totalReturning} unit(s) to seller.`,
                    disputeNotes: `Auto-return initiated by system at day ${daysInWarehouse}. Product stayed unsold without repost requests.`
                  }
                })
                
                // Mark product as return-in-progress
                await prisma.boutiqueProduct.update({
                  where: { id: product.id },
                  data: {
                    fullReturnEnabled: true,
                    returnRequestedAt: new Date(),
                    status: 'RETURN_IN_PROGRESS' // Match rejected product status
                  }
                })
                
                // Send email to seller
                try {
                  await sendWarehouseProductDelistedNotification({
                    sellerName: product.seller.name || 'Seller',
                    sellerEmail: product.seller.email,
                    productTitle: product.title,
                    productId: product.id,
                    daysInWarehouse,
                    reason: 'seller_request' // System-initiated return
                  })
                } catch (emailError) {
                  console.error(`Failed to notify seller of auto-return for ${product.id}:`, emailError)
                }
                
                results.processed++
              } catch (shipmentError) {
                results.failed++
                results.errors.push(`Failed to create return shipment for ${product.id}: ${shipmentError instanceof Error ? shipmentError.message : 'Unknown error'}`)
              }
            }
          }
        }
      }
      
      // Step 3b: Process stock deduction at cycle boundaries (Day 180, 360, 540, etc.)
      // SKIP if product is already in return process (Step 3a handled it)
      if (daysInCurrentCycle === 0 && daysInWarehouse >= WAREHOUSE_CYCLE_DAYS && !product.fullReturnEnabled) {
        // Deduct 1 unit per variant
        let totalDeducted = 0
        for (const variant of product.variants) {
          const newQty = Math.max(0, variant.quantity - 1)
          await prisma.boutiqueProductVariant.update({
            where: { id: variant.id },
            data: { quantity: newQty }
          })
          totalDeducted += variant.quantity - newQty
        }
        
        // Calculate remaining stock (actual = old stock - deducted)
        const newTotalStock = totalStock - totalDeducted
        
        // Check if all variants are now 0
        if (newTotalStock <= 0) {
          // All stock depleted, delist product and release warehouse lock
          // Delete the -1 variant (warehouse lock)
          const minusOneVariant = product.variants.find((v) => v.quantity === -1)
          if (minusOneVariant) {
            await prisma.boutiqueProductVariant.delete({
              where: { id: minusOneVariant.id }
            })
          }

          await prisma.boutiqueProduct.update({
            where: { id: product.id },
            data: {
              status: 'DELISTED_BY_STORAGE',
              month5NotificationSent: false, // Reset for potential re-upload
              warehouseReceivedAt: null,
              warehouseExpiresAt: null,
              warehouseLocation: null,
              shipmentId: null,
            }
          })
          
          // Notify seller
          try {
            await sendWarehouseProductDelistedNotification({
              sellerName: product.seller.name || 'Seller',
              sellerEmail: product.seller.email,
              productTitle: product.title,
              productId: product.id,
              daysInWarehouse,
              reason: 'out_of_stock'
            })
          } catch (emailError) {
            console.error(`Failed to send delisted notification for ${product.id}:`, emailError)
          }
        } else {
          // Send deduction confirmation
          try {
            await sendWarehouseDeductionConfirmation({
              sellerName: product.seller.name || 'Seller',
              sellerEmail: product.seller.email,
              productTitle: product.title,
              productId: product.id,
              daysInWarehouse,
              stockDeducted: totalDeducted,
              remainingStock: newTotalStock
            })
          } catch (emailError) {
            console.error(`Failed to send deduction confirmation for ${product.id}:`, emailError)
          }
        }
        
        results.processed++
      }
    } catch (error) {
      results.failed++
      results.errors.push(`Product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  return results
}
/**
 * Lock stock during repost admin review to prevent overselling
 * CRITICAL: Called when repost request is submitted for admin review
 */
export async function lockStockForReview(productId: string, requestedStock: number) {
  const product = await prisma.boutiqueProduct.findUnique({
    where: { id: productId },
    include: { variants: true }
  })
  
  if (!product) throw new Error('Product not found')
  
  const totalCurrentStock = product.variants.reduce((sum, v) => sum + v.quantity, 0)
  
  if (totalCurrentStock <= 0) {
    throw new Error('Cannot repost: No stock available')
  }
  
  if (requestedStock > totalCurrentStock) {
    throw new Error(`Cannot repost: Requested ${requestedStock} but only ${totalCurrentStock} available`)
  }
  
  // Lock stock
  await prisma.boutiqueProduct.update({
    where: { id: productId },
    data: {
      isStockLocked: true,
      lockedStockValue: requestedStock,
      stockLockedAt: new Date(),
    }
  })
  
  return { locked: true, totalStock: totalCurrentStock, requestedStock }
}

/**
 * Unlock stock if repost request is rejected or expires
 */
export async function unlockStockForReview(productId: string) {
  await prisma.boutiqueProduct.update({
    where: { id: productId },
    data: {
      isStockLocked: false,
      lockedStockValue: null,
      stockLockedAt: null,
    }
  })
}

/**
 * Validate stock hasn't been sold or modified since lock
 * Returns true if stock is still valid for repost approval
 */
export function validateLockedStock(
  currentStock: number,
  lockedStock: number,
  stockLockedAt: Date | null
): { valid: boolean; reason?: string } {
  if (!stockLockedAt) {
    return { valid: false, reason: 'Stock not locked' }
  }
  
  const minutesSinceLock = differenceInDays(new Date(), new Date(stockLockedAt)) * 24 * 60
  
  // Stock lock expires after 24 hours
  if (minutesSinceLock > 1440) {
    return { valid: false, reason: 'Stock lock expired - please submit repost again' }
  }
  
  if (currentStock !== lockedStock) {
    return { 
      valid: false, 
      reason: `Stock mismatch: Was ${lockedStock} when locked, now ${currentStock}. Product may have sold.` 
    }
  }
  
  return { valid: true }
}

/**
 * Calculate deduction schedule for seller visibility
 * Shows what happens if product stays LIVE without reposting
 */
export function getDeductionSchedule(
  daysInWarehouse: number,
  currentStock: number,
  variantCount: number
): Array<{ 
  cycle: number
  cycleDay: number
  deductionDay: number
  projectedStock: number
}> {
  const schedule = []
  const cycleNumber = Math.floor(daysInWarehouse / WAREHOUSE_CYCLE_DAYS)
  const daysInCurrentCycle = daysInWarehouse % WAREHOUSE_CYCLE_DAYS
  
  // Show next 3 cycles
  for (let i = 0; i < 3; i++) {
    const futureDay = daysInCurrentCycle + (i * WAREHOUSE_CYCLE_DAYS) + (i > 0 ? 1 : 0)
    const projectedStock = Math.max(0, currentStock - i)
    
    schedule.push({
      cycle: cycleNumber + i,
      cycleDay: (daysInCurrentCycle + (i * WAREHOUSE_CYCLE_DAYS)) % WAREHOUSE_CYCLE_DAYS,
      deductionDay: (cycleNumber + i + 1) * WAREHOUSE_CYCLE_DAYS,
      projectedStock
    })
  }
  
  return schedule
}

/**
 * Get -2 fee variant for a product (warehouse return fee representation)
 * Returns null if no -2 variant exists
 */
export async function getFeeVariant(productId: string) {
  const variant = await prisma.boutiqueProductVariant.findFirst({
    where: {
      productId,
      color: '-2' // -2 represents the warehouse return fee lock
    }
  })
  return variant || null
}

/**
 * Filter out -2 variants from a list (for displaying to seller/admin)
 * -2 variants are internal fee tracking only
 */
export function filterOutFeeVariants(variants: Array<{ color: string }>) {
  return variants.filter(v => v.color !== '-2')
}

/**
 * Check if -2 variant exists (indicates approved return pending shipment)
 */
export async function hasFeeVariant(productId: string): Promise<boolean> {
  const count = await prisma.boutiqueProductVariant.count({
    where: {
      productId,
      color: '-2'
    }
  })
  return count > 0
}