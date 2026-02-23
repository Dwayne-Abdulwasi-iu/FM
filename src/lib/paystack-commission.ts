/**
 * Helper function to calculate Paystack subaccount commission rate
 * Based on seller's current earnings and subscription tier
 */

import { getCommissionRate } from '@/lib/commission-tiers'
import prisma from '@/lib/prisma'

export async function getPaystackCommissionForSeller(userId: string): Promise<{
  commissionRate: number;
  paystackPercentage: number;
  totalEarnings: number;
  tier: string;
}> {
  try {
    // Get seller's current earnings to determine commission tier
    const seller = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalEarnings: true, designerTier: true }
    })

    if (!seller) {
      throw new Error('Seller not found')
    }

    const totalEarnings = seller.totalEarnings ?? 0
    const isProSubscriber = seller.designerTier === 'VIP_DESIGNER' || seller.designerTier === 'VVIP_DESIGNER'
    
    // Get the commission rate (handles tiered system and discounts)
    const commissionRate = getCommissionRate(totalEarnings, isProSubscriber)
    
    // Convert rate to Paystack percentage (e.g., 0.10 -> 10, 0.001 -> 0.1)
    const paystackPercentage = Math.round(commissionRate * 100 * 10) / 10

    // Determine tier for logging
    const getTier = (earnings: number): string => {
      if (earnings >= 25000) return 'DIAMOND'
      if (earnings >= 10000) return 'PLATINUM'
      if (earnings >= 5000) return 'GOLD'
      if (earnings >= 2000) return 'SILVER'
      if (earnings >= 500) return 'BRONZE'
      if (earnings >= 100) return 'NEW'
      return 'STARTER'
    }

    return {
      commissionRate,
      paystackPercentage,
      totalEarnings,
      tier: getTier(totalEarnings)
    }
  } catch (error) {
    console.error('Error calculating Paystack commission:', error)
    throw error
  }
}
