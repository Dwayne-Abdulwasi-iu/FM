/**
 * Tier Management Service
 * 
 * Handles automatic updates to seller tiers and Paystack subaccounts
 * when sellers cross tier thresholds.
 */

import prisma from '@/lib/prisma'
import { paystack } from '@/lib/paystack'
import { 
  COMMISSION_TIERS, 
  getCommissionTier, 
  getCommissionRate,
  CommissionTierKey 
} from '@/lib/commission-tiers'

/**
 * Convert commission rate to Paystack percentage_charge
 * percentage_charge is what the PLATFORM keeps
 */
function rateToPaystackPercentage(rate: number): number {
  // Rate is already in decimal (e.g., 0.10 for 10%)
  // Paystack percentage_charge is in whole numbers (e.g., 10 for 10%)
  return Math.round(rate * 100 * 10) / 10 // Round to 1 decimal place
}

/**
 * Check if seller has crossed a tier threshold and update accordingly
 * This should be called AFTER the sale amount has been added to totalEarnings
 * 
 * @param sellerId - The seller's user ID
 * @param previousTotalEarnings - The seller's total earnings BEFORE this sale
 */
export async function checkAndUpdateSellerTier(
  sellerId: string,
  previousTotalEarnings?: number
): Promise<{
  tierChanged: boolean
  previousTier: CommissionTierKey | null
  newTier: CommissionTierKey
  subaccountUpdated: boolean
  message: string
}> {
  // Get seller with their account info
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: {
      id: true,
      name: true,
      email: true,
      totalEarnings: true,
      designerTier: true,
      sellerAccount: {
        select: {
          subaccountCode: true,
          isVerified: true,
        }
      }
    }
  })

  if (!seller) {
    return {
      tierChanged: false,
      previousTier: null,
      newTier: 'STARTER',
      subaccountUpdated: false,
      message: 'Seller not found'
    }
  }

  const currentTier = getCommissionTier(seller.totalEarnings)
  const isProSubscriber = seller.designerTier === 'VIP_DESIGNER' || seller.designerTier === 'VVIP_DESIGNER'
  const currentRate = getCommissionRate(seller.totalEarnings, isProSubscriber)

  // Calculate previous tier if we have previous earnings
  const prevTier = previousTotalEarnings !== undefined 
    ? getCommissionTier(previousTotalEarnings)
    : currentTier // If no previous, assume same (first call)
  
  const tierChanged = prevTier !== currentTier

  let subaccountUpdated = false
  let message = `Seller is at ${COMMISSION_TIERS[currentTier].name} tier (${(currentRate * 100).toFixed(1)}% fee)`

  // If tier changed, update the Paystack subaccount
  if (tierChanged && seller.sellerAccount?.subaccountCode) {
    try {
      const paystackPercentage = rateToPaystackPercentage(currentRate)
      
      console.log(`[Tier Update] Updating Paystack subaccount ${seller.sellerAccount.subaccountCode}:`)
      console.log(`  - Previous tier: ${prevTier}`)
      console.log(`  - New tier: ${currentTier}`)
      console.log(`  - New rate: ${(currentRate * 100).toFixed(1)}%`)
      console.log(`  - Paystack percentage_charge: ${paystackPercentage}`)

      const result = await paystack.subaccount.update(seller.sellerAccount.subaccountCode, {
        percentage_charge: paystackPercentage
      })

      if (result.status) {
        subaccountUpdated = true
        message = `Tier upgraded: ${prevTier} → ${currentTier}. Subaccount updated to ${paystackPercentage}% platform fee.`
        console.log(`  ✅ Subaccount updated successfully`)
      } else {
        console.error(`  ❌ Failed to update subaccount:`, result.message)
        message = `Tier changed but failed to update Paystack: ${result.message}`
      }

    } catch (error) {
      console.error(`[Tier Update] Error updating subaccount for ${sellerId}:`, error)
      message = `Tier changed but error updating Paystack: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  return {
    tierChanged,
    previousTier: prevTier,
    newTier: currentTier,
    subaccountUpdated,
    message
  }
}

/**
 * Update subaccount when a seller subscribes to Pro (VIP/VVIP)
 * This applies the 1% discount
 */
export async function updateSubaccountForProSubscription(
  sellerId: string, 
  isSubscribing: boolean
): Promise<{ success: boolean; message: string }> {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: {
      id: true,
      name: true,
      totalEarnings: true,
      designerTier: true,
      sellerAccount: {
        select: { subaccountCode: true }
      }
    }
  })

  if (!seller?.sellerAccount?.subaccountCode) {
    return { success: false, message: 'No subaccount found' }
  }

  const newRate = getCommissionRate(seller.totalEarnings, isSubscribing)
  const paystackPercentage = rateToPaystackPercentage(newRate)

  try {
    const result = await paystack.subaccount.update(seller.sellerAccount.subaccountCode, {
      percentage_charge: paystackPercentage
    })

    if (result.status) {
      console.log(`[Pro Subscription] Updated ${seller.name}'s subaccount to ${paystackPercentage}%`)
      return { 
        success: true, 
        message: `Subaccount updated to ${paystackPercentage}% (${isSubscribing ? 'Pro discount applied' : 'Pro discount removed'})` 
      }
    } else {
      return { success: false, message: result.message || 'Failed to update subaccount' }
    }
  } catch (error) {
    console.error('[Pro Subscription] Error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get tier progress info for a seller (for dashboard display)
 */
export async function getSellerTierProgress(sellerId: string) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: {
      totalEarnings: true,
      designerTier: true,
    }
  })

  if (!seller) return null

  const currentTier = getCommissionTier(seller.totalEarnings)
  const tierInfo = COMMISSION_TIERS[currentTier]
  const isProSubscriber = seller.designerTier === 'VIP_DESIGNER' || seller.designerTier === 'VVIP_DESIGNER'
  const currentRate = getCommissionRate(seller.totalEarnings, isProSubscriber)

  return {
    currentTier,
    tierName: tierInfo.name,
    currentRate,
    currentRatePercent: (currentRate * 100).toFixed(1),
    totalEarnings: seller.totalEarnings,
    isProSubscriber,
    nextTier: tierInfo.nextTier,
    nextTierName: tierInfo.nextTier ? COMMISSION_TIERS[tierInfo.nextTier as CommissionTierKey].name : null,
    nextTierThreshold: tierInfo.nextThreshold,
    amountToNextTier: tierInfo.nextThreshold 
      ? Math.max(0, tierInfo.nextThreshold - seller.totalEarnings)
      : null,
    progressPercent: tierInfo.nextThreshold
      ? Math.min(100, ((seller.totalEarnings - tierInfo.threshold) / (tierInfo.nextThreshold - tierInfo.threshold)) * 100)
      : 100,
    nextTierRate: tierInfo.nextTier 
      ? getCommissionRate(COMMISSION_TIERS[tierInfo.nextTier as CommissionTierKey].threshold, isProSubscriber)
      : null,
  }
}

/**
 * Bulk update all sellers' subaccounts to match their current tier
 * Useful for migrating existing sellers to the new tier system
 */
export async function migrateAllSellersToTieredSystem(): Promise<{
  total: number
  updated: number
  skipped: number
  errors: number
  details: Array<{ sellerId: string; name: string; result: string }>
}> {
  const sellers = await prisma.user.findMany({
    where: {
      sellerAccount: {
        subaccountCode: { not: null }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      totalEarnings: true,
      designerTier: true,
      sellerAccount: {
        select: { subaccountCode: true }
      }
    }
  })

  const results = {
    total: sellers.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{ sellerId: string; name: string; result: string }>
  }

  for (const seller of sellers) {
    const tier = getCommissionTier(seller.totalEarnings)
    const isProSubscriber = seller.designerTier === 'VIP_DESIGNER' || seller.designerTier === 'VVIP_DESIGNER'
    const rate = getCommissionRate(seller.totalEarnings, isProSubscriber)
    const name = seller.name || seller.email || seller.id

    // STARTER tier - skip, uses manual transfers
    if (tier === 'STARTER') {
      results.skipped++
      results.details.push({ sellerId: seller.id, name, result: 'Skipped (STARTER tier uses manual transfers)' })
      continue
    }

    try {
      const paystackPercentage = rateToPaystackPercentage(rate)
      const result = await paystack.subaccount.update(seller.sellerAccount!.subaccountCode!, {
        percentage_charge: paystackPercentage
      })

      if (result.status) {
        results.updated++
        results.details.push({ sellerId: seller.id, name, result: `Updated to ${paystackPercentage}% (${tier})` })
      } else {
        results.errors++
        results.details.push({ sellerId: seller.id, name, result: `Failed: ${result.message}` })
      }
    } catch (error) {
      results.errors++
      results.details.push({ sellerId: seller.id, name, result: `Error: ${error instanceof Error ? error.message : 'Unknown'}` })
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return results
}
