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
import { sendTrialExpiredEmail, sendTrialExpiringWarningEmail } from '@/lib/emails/trial'

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
      proSubscriptionActive: true,
      proSubscriptionExpiresAt: true,
      proTrialActivated: true,
      proTrialExpiresAt: true,
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

  const now = new Date()
  
  // Check if seller has ACTIVE Pro subscription OR active trial
  const hasActivePro = ((seller.proSubscriptionActive ?? false) && seller.proSubscriptionExpiresAt && seller.proSubscriptionExpiresAt > now) ||
                       ((seller.proTrialActivated ?? false) && seller.proTrialExpiresAt && seller.proTrialExpiresAt > now)
  
  const currentTier = getCommissionTier(seller.totalEarnings)
  const isProSubscriber = !!(seller.designerTier === 'VIP_DESIGNER' || seller.designerTier === 'VVIP_DESIGNER')
  // When calculating commission rate, pass hasActivePro as the isProSubscriber flag
  // This way both paid subs AND trial users get the 1% discount
  const currentRate = getCommissionRate(seller.totalEarnings, !!(isProSubscriber || hasActivePro))

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

/**
 * Get active tier considering both natural tier and Pro subscription boost
 * 
 * Tier Stacking Logic:
 * - Tier 1 seller buys Pro → Gets Tier 2 benefits
 * - If Tier 1 → naturally upgrades to Tier 2 → subscription active → gets Tier 3 benefits
 * - When subscription expires → reverts to natural Tier 2
 * 
 * @param naturalTier - The tier earned from sales
 * @param hasActiveSubscription - Whether Pro subscription is currently active
 * @returns The effective tier the seller gets benefits from
 */
export function getEffectiveTier(
  naturalTier: CommissionTierKey,
  hasActiveSubscription: boolean
): CommissionTierKey {
  if (!hasActiveSubscription) return naturalTier

  // Tier stacking: subscription boosts to tier above
  const tierOrder: CommissionTierKey[] = ['STARTER', 'NEW', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']
  const currentIndex = tierOrder.indexOf(naturalTier)
  
  if (currentIndex < tierOrder.length - 1) {
    return tierOrder[currentIndex + 1] // Boost to next tier
  }
  
  return naturalTier // Already at max
}

/**
 * Get commission rate considering Pro subscription boost
 * Applies 1% additional discount when subscription is active
 */
export function getCommissionRateWithSubscription(
  totalEarnings: number,
  isProSubscriber: boolean,
  hasActiveProSubscription: boolean
): number {
  // First get the base rate without double-counting subscription (just natural tier + VIP status)
  const baseRate = getCommissionRate(totalEarnings, isProSubscriber)
  
  // If active subscription, apply additional 1% discount (stacked with natural tier)
  if (hasActiveProSubscription) {
    return Math.max(baseRate - 0.01, 0.06) // Min 6% even with subscription
  }
  
  return baseRate
}

/**
 * Activate Pro subscription for a seller
 * Handles tier stacking and Paystack subaccount update
 */
export async function activateProSubscription(
  sellerId: string,
  billingPeriod: 'MONTHLY' | 'YEARLY',
  amount: number,
  stripeSubscriptionId?: string,
  paystackAuthCode?: string
): Promise<{ success: boolean; message: string; subscription?: any }> {
  try {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        totalEarnings: true,
        proSubscriptionActive: true,
        sellerAccount: { select: { subaccountCode: true } }
      }
    })

    if (!seller) return { success: false, message: 'Seller not found' }

    // Calculate expiration date
    const now = new Date()
    const expiresAt = new Date(now)
    if (billingPeriod === 'YEARLY') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    // Create/update Pro subscription
    const subscription = await prisma.proSubscription.upsert({
      where: { userId: sellerId },
      update: {
        status: 'ACTIVE',
        billingPeriod,
        amount,
        startedAt: now,
        expiresAt,
        stripeSubscriptionId,
        paystackAuthCode,
        cancellationReason: null,
      },
      create: {
        userId: sellerId,
        status: 'ACTIVE',
        billingPeriod,
        amount,
        currency: 'USD', // Default, could be parameterized
        startedAt: now,
        expiresAt,
        stripeSubscriptionId,
        paystackAuthCode,
      }
    })

    // Update user Pro subscription fields
    await prisma.user.update({
      where: { id: sellerId },
      data: {
        proSubscriptionActive: true,
        proSubscriptionTier: billingPeriod,
        proSubscriptionStartedAt: now,
        proSubscriptionExpiresAt: expiresAt,
        proSubscriptionPrice: amount,
        proSubscriptionStripeId: stripeSubscriptionId,
        proSubscriptionPaystackId: paystackAuthCode ? `paystack_${Date.now()}` : null,
      }
    })

    // Update Paystack subaccount if exists
    if (seller.sellerAccount?.subaccountCode) {
      const naturalTier = getCommissionTier(seller.totalEarnings)
      const effectiveTier = getEffectiveTier(naturalTier, true)
      // Get the rate WITH Pro subscription discount already applied (-1%)
      const newRate = getCommissionRate(seller.totalEarnings, true)
      const paystackPercentage = rateToPaystackPercentage(Math.max(newRate, 0.06))

      try {
        const result = await paystack.subaccount.update(seller.sellerAccount.subaccountCode, {
          percentage_charge: paystackPercentage
        })
        console.log(`[Pro Subscription] Updated ${seller.name}'s subaccount to ${paystackPercentage}%`)
      } catch (error) {
        console.error(`[Pro Subscription] Failed to update subaccount:`, error)
        // Don't fail the subscription creation if subaccount update fails
      }
    }

    return {
      success: true,
      message: `Pro subscription activated for ${billingPeriod}. Tier boosted for ${billingPeriod === 'YEARLY' ? '1 year' : '1 month'}.`,
      subscription
    }
  } catch (error) {
    console.error('[activateProSubscription] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to activate subscription'
    }
  }
}

/**
 * Cancel/Deactivate Pro subscription
 * Seller returns to their natural tier
 */
export async function cancelProSubscription(
  sellerId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        totalEarnings: true,
        sellerAccount: { select: { subaccountCode: true } }
      }
    })

    if (!seller) return { success: false, message: 'Seller not found' }

    // Update subscription status
    await prisma.proSubscription.update({
      where: { userId: sellerId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      }
    })

    // Deactivate Pro subscription in user record
    await prisma.user.update({
      where: { id: sellerId },
      data: {
        proSubscriptionActive: false,
      }
    })

    // Restore natural tier commission rate in Paystack
    if (seller.sellerAccount?.subaccountCode) {
      const naturalTier = getCommissionTier(seller.totalEarnings)
      const naturalRate = getCommissionRate(seller.totalEarnings, false)
      const paystackPercentage = rateToPaystackPercentage(naturalRate)

      try {
        const result = await paystack.subaccount.update(seller.sellerAccount.subaccountCode, {
          percentage_charge: paystackPercentage
        })
        console.log(`[Cancel Subscription] Restored ${seller.name}'s rate to ${paystackPercentage}% (${naturalTier})`)
      } catch (error) {
        console.error(`[Cancel Subscription] Failed to update subaccount:`, error)
      }
    }

    return {
      success: true,
      message: `Pro subscription cancelled. Seller returned to natural tier.`
    }
  } catch (error) {
    console.error('[cancelProSubscription] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel subscription'
    }
  }
}

/**
 * Check and expire Pro subscriptions that have passed their expiration date
 * Called by cron job or on-demand
 */
export async function expireAndRestoreSubscriptions(): Promise<{
  expired: number
  restored: number
  errors: number
}> {
  const now = new Date()
  
  // Find expired subscriptions
  const expiredSubs = await prisma.proSubscription.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: now }
    },
    include: { 
      user: { 
        select: { 
          id: true, 
          name: true, 
          totalEarnings: true,
          proTrialActivated: true,
          proTrialExpiresAt: true,
          sellerAccount: { 
            select: { subaccountCode: true }
          } 
        } 
      } 
    }
  })

  let expired = 0
  let restored = 0
  let errors = 0

  for (const sub of expiredSubs) {
    try {
      // Mark subscription as expired
      await prisma.proSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' }
      })

      // Deactivate in user
      await prisma.user.update({
        where: { id: sub.userId },
        data: { proSubscriptionActive: false }
      })

      expired++

      // Check if user has an active trial - if so, maintain pro benefits
      const now = new Date()
      const hasActiveTrial = Boolean(
        (sub.user.proTrialActivated ?? false) && 
        sub.user.proTrialExpiresAt && 
        sub.user.proTrialExpiresAt > now
      )

      // Restore natural tier rate (unless trial is active)
      if (sub.user.sellerAccount?.subaccountCode) {
        const naturalTier = getCommissionTier(sub.user.totalEarnings || 0)
        // If trial is active, maintain pro rate; otherwise use natural rate
        const naturalRate = getCommissionRate(sub.user.totalEarnings || 0, hasActiveTrial)
        const paystackPercentage = rateToPaystackPercentage(naturalRate)

        try {
          await paystack.subaccount.update(sub.user.sellerAccount.subaccountCode, {
            percentage_charge: paystackPercentage
          })
          restored++
          const tierName = hasActiveTrial ? `${naturalTier} (with trial benefits)` : naturalTier
          console.log(`[Expire Subscription] Restored ${sub.user.name} to ${tierName}`)
        } catch (error) {
          console.error(`[Expire Subscription] Failed to restore rate:`, error)
          errors++
        }
      } else {
        restored++
      }
    } catch (error) {
      console.error(`[Expire Subscription] Error processing subscription ${sub.id}:`, error)
      errors++
    }
  }

  // Also handle expired trials
  try {
    const expiredTrials = await prisma.user.findMany({
      where: {
        proTrialActivated: true,
        proTrialExpiresAt: { lte: now }
      },
      select: {
        id: true,
        name: true,
        email: true,
        totalEarnings: true,
        sellerAccount: {
          select: { subaccountCode: true }
        }
      }
    })

    for (const seller of expiredTrials) {
      try {
        // Deactivate the trial
        await prisma.user.update({
          where: { id: seller.id },
          data: { 
            proTrialActivated: false,
            proTrialExpiresAt: null,
            proTrialActivatedAt: null
          }
        })

        expired++

        // Restore natural tier rate if they have a subaccount
        if (seller.sellerAccount?.subaccountCode) {
          const naturalTier = getCommissionTier(seller.totalEarnings)
          const naturalRate = getCommissionRate(seller.totalEarnings, false)
          const paystackPercentage = rateToPaystackPercentage(naturalRate)

          try {
            await paystack.subaccount.update(seller.sellerAccount.subaccountCode, {
              percentage_charge: paystackPercentage
            })
            restored++
            console.log(`[Expire Trial] Restored ${seller.name} to ${naturalTier} tier`)
          } catch (error) {
            console.error(`[Expire Trial] Failed to restore rate for ${seller.id}:`, error)
            errors++
          }
        } else {
          restored++
        }

        // Send trial expiration email
        try {
          await sendTrialExpiredEmail({
            email: seller.email,
            userName: seller.name || 'Designer',
          })
          console.log(`[Expire Trial] Sent expiration email to ${seller.email}`)
        } catch (error) {
          console.error(`[Expire Trial] Failed to send email to ${seller.email}:`, error)
        }
      } catch (error) {
        console.error(`[Expire Trial] Error processing trial for seller ${seller.id}:`, error)
        errors++
      }
    }
  } catch (error) {
    console.error(`[Expire Trial] Error fetching expired trials:`, error)
    errors++
  }

  // Send 1-day warning emails for trials expiring soon
  try {
    const now = new Date()
    const tomorrowAtMidnight = new Date()
    tomorrowAtMidnight.setDate(tomorrowAtMidnight.getDate() + 1)
    tomorrowAtMidnight.setHours(0, 0, 0, 0)

    const todayAtMidnight = new Date()
    todayAtMidnight.setHours(0, 0, 0, 0)

    const trialsExpiringTomorrow = await prisma.user.findMany({
      where: {
        proTrialActivated: true,
        proTrialExpiresAt: {
          gt: todayAtMidnight,
          lt: tomorrowAtMidnight
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        proTrialExpiresAt: true,
      }
    })

    for (const user of trialsExpiringTomorrow) {
      try {
        const daysRemaining = Math.ceil((new Date(user.proTrialExpiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        await sendTrialExpiringWarningEmail({
          email: user.email,
          userName: user.name || 'Designer',
          expiresAt: user.proTrialExpiresAt || new Date(),
          daysRemaining,
        })
        console.log(`[Trial Warning] Sent expiration warning to ${user.email}`)
      } catch (error) {
        console.error(`[Trial Warning] Failed to send email to ${user.email}:`, error)
      }
    }
  } catch (error) {
    console.error(`[Trial Warning] Error fetching trials expiring soon:`, error)
  }

  return { expired, restored, errors }
}

/**
 * Get seller's effective tier info including subscription boost
 */
export async function getSellerEffectiveTierInfo(sellerId: string) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: {
      totalEarnings: true,
      proSubscriptionActive: true,
      proSubscriptionExpiresAt: true,
      proSubscriptionTier: true,
      proTrialActivated: true,
      proTrialExpiresAt: true
    }
  })

  if (!seller) return null

  const now = new Date()
  const naturalTier = getCommissionTier(seller.totalEarnings)
  const hasActiveSubscription = !!(
    (seller.proSubscriptionActive ?? false) && 
    seller.proSubscriptionExpiresAt && 
    seller.proSubscriptionExpiresAt > now
  )
  const hasActiveTrial = !!(
    (seller.proTrialActivated ?? false) && 
    seller.proTrialExpiresAt && 
    seller.proTrialExpiresAt > now
  )
  const hasActivePro = hasActiveSubscription || hasActiveTrial
  
  const effectiveTier = getEffectiveTier(naturalTier, hasActivePro)
  const effectiveRate = getCommissionRateWithSubscription(
    seller.totalEarnings,
    false,
    hasActivePro
  )

  return {
    naturalTier,
    naturalTierName: COMMISSION_TIERS[naturalTier].name,
    hasActiveSubscription,
    hasActiveTrial,
    hasActivePro,
    subscriptionExpiresAt: seller.proSubscriptionExpiresAt,
    trialExpiresAt: seller.proTrialExpiresAt,
    billingPeriod: seller.proSubscriptionTier,
    effectiveTier,
    effectiveTierName: COMMISSION_TIERS[effectiveTier].name,
    effectiveRate: (effectiveRate * 100).toFixed(1) + '%',
    tierBoost: hasActivePro ? 1 : 0,
    featuredListings: hasActivePro ? 6 : 5,
    nextFeatureAfterNaturalTier: hasActivePro ? COMMISSION_TIERS[effectiveTier].nextTier : COMMISSION_TIERS[naturalTier].nextTier,
  }
}
