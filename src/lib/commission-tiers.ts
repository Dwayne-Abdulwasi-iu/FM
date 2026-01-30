/**
 * Tiered Commission System
 * 
 * Platform commission rates based on seller tier and sales volume:
 * - Starter (< $100 total): 0.1% - FIRST $100 NEARLY FREE!
 * - New Sellers (≥ $100): 10%
 * - Bronze (≥ $500): 9.5%
 * - Silver (≥ $2,500): 9%
 * - Gold (≥ $10,000): 8.5%
 * - Platinum (≥ $50,000): 8%
 * - Diamond (≥ $100,000): 7%
 * 
 * Pro Subscribers (VIP/VVIP) get additional 1% discount, minimum 6%
 * 
 * Note: Paystack minimum percentage_charge is 0.1%, so STARTER uses that
 */

import prisma from '@/lib/prisma'

// Free tier threshold - first $100 has minimal (0.1%) commission
export const FREE_TIER_THRESHOLD = 100

// Paystack minimum percentage_charge
export const PAYSTACK_MINIMUM_RATE = 0.001 // 0.1% - lowest Paystack supports

// Commission tiers with thresholds (in USD) - achievable milestones for sellers
export const COMMISSION_TIERS = {
  STARTER: { threshold: 0, rate: 0.001, name: 'Starter (0.1%)', nextTier: 'NEW', nextThreshold: 100 },
  NEW: { threshold: 100, rate: 0.10, name: 'New Seller', nextTier: 'BRONZE', nextThreshold: 500 },
  BRONZE: { threshold: 500, rate: 0.095, name: 'Bronze', nextTier: 'SILVER', nextThreshold: 2000 },
  SILVER: { threshold: 2000, rate: 0.09, name: 'Silver', nextTier: 'GOLD', nextThreshold: 5000 },
  GOLD: { threshold: 5000, rate: 0.085, name: 'Gold', nextTier: 'PLATINUM', nextThreshold: 10000 },
  PLATINUM: { threshold: 10000, rate: 0.08, name: 'Platinum', nextTier: 'DIAMOND', nextThreshold: 25000 },
  DIAMOND: { threshold: 25000, rate: 0.07, name: 'Diamond', nextTier: null, nextThreshold: null },
} as const

export type CommissionTierKey = keyof typeof COMMISSION_TIERS

// Pro subscriber discount
export const PRO_SUBSCRIBER_DISCOUNT = 0.01 // 1% additional discount
export const MINIMUM_COMMISSION_RATE = 0.06 // 6% minimum for Pro subscribers

/**
 * Get commission tier based on total earnings
 */
export function getCommissionTier(totalEarnings: number): CommissionTierKey {
  if (totalEarnings >= COMMISSION_TIERS.DIAMOND.threshold) return 'DIAMOND'
  if (totalEarnings >= COMMISSION_TIERS.PLATINUM.threshold) return 'PLATINUM'
  if (totalEarnings >= COMMISSION_TIERS.GOLD.threshold) return 'GOLD'
  if (totalEarnings >= COMMISSION_TIERS.SILVER.threshold) return 'SILVER'
  if (totalEarnings >= COMMISSION_TIERS.BRONZE.threshold) return 'BRONZE'
  if (totalEarnings >= COMMISSION_TIERS.NEW.threshold) return 'NEW'
  return 'STARTER'
}

/**
 * Get commission rate for a seller
 * @param totalEarnings - User's total earnings in USD
 * @param isProSubscriber - Has paid Pro subscription OR active trial
 */
export function getCommissionRate(totalEarnings: number, isProSubscriber: boolean = false): number {
  const tier = getCommissionTier(totalEarnings)
  const baseRate = COMMISSION_TIERS[tier].rate
  
  // Starter tier uses Paystack minimum (0.1%)
  if (tier === 'STARTER') {
    return PAYSTACK_MINIMUM_RATE
  }
  
  // Apply Pro subscriber discount (minimum 6%)
  // This applies to BOTH paid subscribers AND active trial users
  if (isProSubscriber) {
    return Math.max(baseRate - PRO_SUBSCRIBER_DISCOUNT, MINIMUM_COMMISSION_RATE)
  }
  
  return baseRate
}

/**
 * Calculate platform fee in cents
 */
export function calculateTieredPlatformFee(
  amount: number, 
  totalEarnings: number, 
  isProSubscriber: boolean = false
): number {
  const rate = getCommissionRate(totalEarnings, isProSubscriber)
  return Math.round(amount * rate * 100) // Convert to cents
}

/**
 * Calculate seller amount after platform fee in cents
 */
export function calculateSellerAmount(
  amount: number, 
  totalEarnings: number, 
  isProSubscriber: boolean = false
): number {
  const platformFee = calculateTieredPlatformFee(amount, totalEarnings, isProSubscriber)
  return Math.round(amount * 100) - platformFee // Convert to cents minus platform fee
}

/**
 * Get tier info for a seller
 */
export async function getSellerTierInfo(sellerId: string) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: {
      totalEarnings: true,
      designerTier: true,
    }
  })

  if (!seller) {
    return null
  }

  const tier = getCommissionTier(seller.totalEarnings)
  const tierInfo = COMMISSION_TIERS[tier]
  const isProSubscriber = seller.designerTier === 'VIP_DESIGNER' || seller.designerTier === 'VVIP_DESIGNER'
  
  return {
    currentTier: tier,
    tierName: tierInfo.name,
    commissionRate: getCommissionRate(seller.totalEarnings, isProSubscriber),
    totalEarnings: seller.totalEarnings,
    isProSubscriber,
    nextTier: tierInfo.nextTier,
    nextTierThreshold: tierInfo.nextThreshold,
    amountToNextTier: tierInfo.nextThreshold 
      ? Math.max(0, tierInfo.nextThreshold - seller.totalEarnings)
      : null,
    progressToNextTier: tierInfo.nextThreshold
      ? Math.min(100, ((seller.totalEarnings - tierInfo.threshold) / (tierInfo.nextThreshold - tierInfo.threshold)) * 100)
      : 100,
  }
}

/**
 * Get commission breakdown for display
 */
export function getCommissionBreakdown(
  saleAmount: number,
  totalEarnings: number,
  isProSubscriber: boolean = false
) {
  const rate = getCommissionRate(totalEarnings, isProSubscriber)
  const tier = getCommissionTier(totalEarnings)
  const platformFee = saleAmount * rate
  const sellerReceives = saleAmount - platformFee
  
  return {
    saleAmount,
    tier: COMMISSION_TIERS[tier].name,
    commissionRate: rate,
    commissionPercentage: (rate * 100).toFixed(1),
    platformFee: Math.round(platformFee * 100) / 100,
    sellerReceives: Math.round(sellerReceives * 100) / 100,
    isProSubscriber,
    savings: isProSubscriber ? saleAmount * PRO_SUBSCRIBER_DISCOUNT : 0,
  }
}

/**
 * Get all tiers for display
 */
export function getAllTiersInfo(currentEarnings: number = 0, isProSubscriber: boolean = false) {
  return Object.entries(COMMISSION_TIERS).map(([key, tier]) => {
    const isCurrent = getCommissionTier(currentEarnings) === key
    const effectiveRate = isProSubscriber 
      ? Math.max(tier.rate - PRO_SUBSCRIBER_DISCOUNT, 0.04)
      : tier.rate
    
    return {
      key,
      name: tier.name,
      threshold: tier.threshold,
      baseRate: tier.rate,
      effectiveRate,
      percentageDisplay: `${(effectiveRate * 100).toFixed(0)}%`,
      isCurrent,
      isUnlocked: currentEarnings >= tier.threshold,
    }
  })
}
