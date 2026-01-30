/**
 * Pro Trial System - 30-day free trial for Pro subscription
 * Each seller gets ONE free 30-day trial to activate
 * After trial expires, they must pay to continue Pro benefits
 */

import prisma from './prisma'

/**
 * Check if user is eligible for pro trial activation
 * Only eligible if they haven't already activated the trial
 */
export async function isEligibleForProTrial(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { proTrialActivated: true }
    })
    return !user?.proTrialActivated
  } catch (error) {
    console.error('[Pro Trial] Eligibility check failed:', error)
    return false
  }
}

/**
 * Get pro trial status for user
 */
export async function getProTrialStatus(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        proTrialActivated: true,
        proTrialActivatedAt: true,
        proTrialExpiresAt: true,
        proSubscriptionActive: true,
        proSubscriptionExpiresAt: true,
      }
    })

    if (!user) return null

    const now = new Date()
    const isTrialActive = user.proTrialActivated && 
                         user.proTrialExpiresAt && 
                         user.proTrialExpiresAt > now

    const isPaidSubscriptionActive = user.proSubscriptionActive && 
                                     user.proSubscriptionExpiresAt && 
                                     user.proSubscriptionExpiresAt > now

    return {
      hasTrialEligibility: !user.proTrialActivated,
      isTrialActive,
      isTrialExpired: user.proTrialActivated && !isTrialActive,
      trialActivatedAt: user.proTrialActivatedAt,
      trialExpiresAt: user.proTrialExpiresAt,
      isPaidSubscriptionActive,
      subscriptionExpiresAt: user.proSubscriptionExpiresAt,
    }
  } catch (error) {
    console.error('[Pro Trial] Status check failed:', error)
    return null
  }
}

/**
 * Activate pro trial for user
 * This grants 30 days of free Pro access
 */
export async function activateProTrial(userId: string): Promise<{ success: boolean; error?: string; expiresAt?: Date }> {
  try {
    // Check eligibility
    const eligible = await isEligibleForProTrial(userId)
    if (!eligible) {
      return { success: false, error: 'You have already activated the free pro trial' }
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    await prisma.user.update({
      where: { id: userId },
      data: {
        proTrialActivated: true,
        proTrialActivatedAt: now,
        proTrialExpiresAt: expiresAt,
      }
    })

    return { success: true, expiresAt }
  } catch (error) {
    console.error('[Pro Trial] Activation failed:', error)
    return { success: false, error: 'Failed to activate trial' }
  }
}

/**
 * Check if trial has expired for user
 * Used to determine if Subscribe button should be shown
 */
export async function hasTrialExpired(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        proTrialActivated: true,
        proTrialExpiresAt: true,
      }
    })

    if (!user?.proTrialActivated || !user.proTrialExpiresAt) {
      return false
    }

    return new Date() > user.proTrialExpiresAt
  } catch (error) {
    console.error('[Pro Trial] Expiration check failed:', error)
    return false
  }
}

/**
 * Get remaining trial days for user
 */
export async function getRemainingTrialDays(userId: string): Promise<number | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        proTrialActivated: true,
        proTrialExpiresAt: true,
      }
    })

    if (!user?.proTrialActivated || !user.proTrialExpiresAt) {
      return null
    }

    const now = new Date()
    if (user.proTrialExpiresAt < now) {
      return 0 // Trial expired
    }

    const diffMs = user.proTrialExpiresAt.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays
  } catch (error) {
    console.error('[Pro Trial] Days calculation failed:', error)
    return null
  }
}
