/**
 * Status mapping for Boutique Orders
 * Maps between actual database statuses and display statuses for the admin UI
 */

// All possible database statuses
export const ALL_STATUSES = [
  // Checkout/Payment
  'PENDING_PAYMENT',
  'PAYMENT_FAILED',
  // Seller Direct
  'AWAITING_SELLER_CONFIRMATION',
  // Core fulfillment
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  // Returns
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_SHIPPED',
  'RETURN_RECEIVED',
  // Terminal
  'CANCELLED',
  'REFUNDED',
  'DISPUTED',
] as const

export type BoutiqueOrderStatus = typeof ALL_STATUSES[number]

// Display mapping for UI
export const STATUS_DISPLAY: Record<BoutiqueOrderStatus, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800' },
  PAYMENT_FAILED: { label: 'Payment Failed', color: 'bg-red-100 text-red-800' },
  AWAITING_SELLER_CONFIRMATION: { label: 'Awaiting Seller', color: 'bg-orange-100 text-orange-800' },
  PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  PROCESSING: { label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  SHIPPED: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Delivered', color: 'bg-teal-100 text-teal-800' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  RETURN_REQUESTED: { label: 'Return Requested', color: 'bg-pink-100 text-pink-800' },
  RETURN_APPROVED: { label: 'Return Approved', color: 'bg-pink-100 text-pink-800' },
  RETURN_SHIPPED: { label: 'Return Shipped', color: 'bg-pink-100 text-pink-800' },
  RETURN_RECEIVED: { label: 'Return Received', color: 'bg-pink-100 text-pink-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
  DISPUTED: { label: 'Disputed', color: 'bg-red-100 text-red-800' },
}

// Valid status transitions (what each status can transition to)
export const STATUS_TRANSITIONS: Record<BoutiqueOrderStatus, BoutiqueOrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'AWAITING_SELLER_CONFIRMATION', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  AWAITING_SELLER_CONFIRMATION: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'REFUNDED', 'DISPUTED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'RETURN_REQUESTED', 'DISPUTED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURN_REQUESTED', 'DISPUTED'],
  DELIVERED: ['COMPLETED', 'RETURN_REQUESTED'],
  COMPLETED: ['REFUNDED'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'COMPLETED'],
  RETURN_APPROVED: ['RETURN_SHIPPED'],
  RETURN_SHIPPED: ['RETURN_RECEIVED'],
  RETURN_RECEIVED: ['REFUNDED', 'COMPLETED'],
  CANCELLED: [],
  REFUNDED: [],
  DISPUTED: ['COMPLETED', 'REFUNDED'],
}

// Statuses that require override reason when downgrading
export const DOWNGRADE_STATUSES = new Set([
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'RETURN_APPROVED',
  'RETURN_SHIPPED',
])

/**
 * Check if a status transition requires an override reason
 * (going backwards in the fulfillment timeline)
 */
export function requiresOverrideReason(fromStatus: BoutiqueOrderStatus, toStatus: BoutiqueOrderStatus): boolean {
  // Downgrading from a later status requires reason
  if (DOWNGRADE_STATUSES.has(fromStatus) && !STATUS_TRANSITIONS[fromStatus]?.includes(toStatus)) {
    return true
  }

  // Unusual transitions also require reason
  const unusualTransitions: Array<[BoutiqueOrderStatus, BoutiqueOrderStatus]> = [
    ['DELIVERED', 'CANCELLED'],
    ['COMPLETED', 'CANCELLED'],
  ]

  return unusualTransitions.some(([from, to]) => from === fromStatus && to === toStatus)
}

/**
 * Get valid next statuses for a given status
 */
export function getValidTransitions(currentStatus: BoutiqueOrderStatus): BoutiqueOrderStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || []
}
