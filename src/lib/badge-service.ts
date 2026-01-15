import prisma from '@/lib/prisma'

/**
 * Badge calculation thresholds
 */
const BADGE_THRESHOLDS = {
  RISING_STAR: {
    minSales: 5,
    minRating: 4.0,
    minDesigns: 3
  },
  TOP_SELLER: {
    minSales: 50,
    minRating: 4.3,
    minDesigns: 10
  },
  VERIFIED_PRO: {
    minSales: 100,
    minRating: 4.5,
    minDesigns: 20,
    requiresManualVerification: true
  },
  ELITE: {
    minSales: 500,
    minRating: 4.7,
    minDesigns: 50,
    requiresManualVerification: true
  }
}

const TIER_THRESHOLDS = {
  BRONZE: { minSales: 10, minRevenue: 100 },
  SILVER: { minSales: 50, minRevenue: 500 },
  GOLD: { minSales: 100, minRevenue: 2000 },
  PLATINUM: { minSales: 250, minRevenue: 10000 },
  DIAMOND: { minSales: 500, minRevenue: 50000 }
}

/**
 * Calculate the appropriate badge for a seller based on performance
 */
export function calculateBadge(stats: {
  totalSales: number
  avgRating: number
  designCount: number
  isManuallyVerified?: boolean
}): string | null {
  const { totalSales, avgRating, designCount, isManuallyVerified } = stats

  // Check from highest to lowest
  if (
    totalSales >= BADGE_THRESHOLDS.ELITE.minSales &&
    avgRating >= BADGE_THRESHOLDS.ELITE.minRating &&
    designCount >= BADGE_THRESHOLDS.ELITE.minDesigns &&
    isManuallyVerified
  ) {
    return 'ELITE'
  }

  if (
    totalSales >= BADGE_THRESHOLDS.VERIFIED_PRO.minSales &&
    avgRating >= BADGE_THRESHOLDS.VERIFIED_PRO.minRating &&
    designCount >= BADGE_THRESHOLDS.VERIFIED_PRO.minDesigns &&
    isManuallyVerified
  ) {
    return 'VERIFIED_PRO'
  }

  if (
    totalSales >= BADGE_THRESHOLDS.TOP_SELLER.minSales &&
    avgRating >= BADGE_THRESHOLDS.TOP_SELLER.minRating &&
    designCount >= BADGE_THRESHOLDS.TOP_SELLER.minDesigns
  ) {
    return 'TOP_SELLER'
  }

  if (
    totalSales >= BADGE_THRESHOLDS.RISING_STAR.minSales &&
    avgRating >= BADGE_THRESHOLDS.RISING_STAR.minRating &&
    designCount >= BADGE_THRESHOLDS.RISING_STAR.minDesigns
  ) {
    return 'RISING_STAR'
  }

  return null
}

/**
 * Calculate the appropriate tier for a seller based on sales and revenue
 */
export function calculateTier(stats: {
  totalSales: number
  totalRevenue: number
}): string {
  const { totalSales, totalRevenue } = stats

  // Check from highest to lowest
  if (
    totalSales >= TIER_THRESHOLDS.DIAMOND.minSales &&
    totalRevenue >= TIER_THRESHOLDS.DIAMOND.minRevenue
  ) {
    return 'DIAMOND'
  }

  if (
    totalSales >= TIER_THRESHOLDS.PLATINUM.minSales &&
    totalRevenue >= TIER_THRESHOLDS.PLATINUM.minRevenue
  ) {
    return 'PLATINUM'
  }

  if (
    totalSales >= TIER_THRESHOLDS.GOLD.minSales &&
    totalRevenue >= TIER_THRESHOLDS.GOLD.minRevenue
  ) {
    return 'GOLD'
  }

  if (
    totalSales >= TIER_THRESHOLDS.SILVER.minSales &&
    totalRevenue >= TIER_THRESHOLDS.SILVER.minRevenue
  ) {
    return 'SILVER'
  }

  if (
    totalSales >= TIER_THRESHOLDS.BRONZE.minSales &&
    totalRevenue >= TIER_THRESHOLDS.BRONZE.minRevenue
  ) {
    return 'BRONZE'
  }

  return 'STARTER'
}

/**
 * Update badges and tiers for all sellers (can be run as cron job)
 */
export async function updateAllSellerBadges(): Promise<{
  updated: number
  errors: number
}> {
  let updated = 0
  let errors = 0

  try {
    // Get all sellers with their stats
    const sellers = await prisma.user.findMany({
      where: {
        role: { in: ['SELLER', 'ADMIN'] }
      },
      select: {
        id: true,
        totalSales: true,
        avgRating: true,
        totalEarnings: true,
        isVerified: true,
        verificationBadge: true,
        designerTier: true,
        _count: {
          select: {
            designs: {
              where: {
                isActive: true,
                approvalStatus: 'APPROVED'
              }
            }
          }
        }
      }
    })

    for (const seller of sellers) {
      try {
        // Calculate new badge (preserve manual verification for higher badges)
        const currentBadge = seller.verificationBadge
        const isManuallyVerified = seller.isVerified && 
          ['VERIFIED_PRO', 'ELITE'].includes(currentBadge || '')

        const newBadge = calculateBadge({
          totalSales: seller.totalSales,
          avgRating: seller.avgRating,
          designCount: seller._count.designs,
          isManuallyVerified
        })

        // Calculate new tier
        const newTier = calculateTier({
          totalSales: seller.totalSales,
          totalRevenue: seller.totalEarnings
        })

        // Check if update needed
        const badgeChanged = newBadge !== currentBadge && 
          !(isManuallyVerified && !newBadge)  // Don't downgrade manually verified
        const tierChanged = newTier !== seller.designerTier

        if (badgeChanged || tierChanged) {
          await prisma.user.update({
            where: { id: seller.id },
            data: {
              ...(badgeChanged && newBadge && { verificationBadge: newBadge }),
              ...(tierChanged && { designerTier: newTier })
            }
          })
          updated++
        }
      } catch (err) {
        console.error(`Failed to update seller ${seller.id}:`, err)
        errors++
      }
    }

    return { updated, errors }
  } catch (error) {
    console.error('Update all seller badges error:', error)
    throw error
  }
}

/**
 * Update badge and tier for a single seller
 */
export async function updateSellerBadge(sellerId: string): Promise<void> {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: {
      id: true,
      totalSales: true,
      avgRating: true,
      totalEarnings: true,
      isVerified: true,
      verificationBadge: true,
      designerTier: true,
      _count: {
        select: {
          designs: {
            where: {
              isActive: true,
              approvalStatus: 'APPROVED'
            }
          }
        }
      }
    }
  })

  if (!seller) return

  const isManuallyVerified = seller.isVerified && 
    ['VERIFIED_PRO', 'ELITE'].includes(seller.verificationBadge || '')

  const newBadge = calculateBadge({
    totalSales: seller.totalSales,
    avgRating: seller.avgRating,
    designCount: seller._count.designs,
    isManuallyVerified
  })

  const newTier = calculateTier({
    totalSales: seller.totalSales,
    totalRevenue: seller.totalEarnings
  })

  const updates: Record<string, unknown> = {}

  // Update badge if changed (but don't downgrade manually verified)
  if (newBadge !== seller.verificationBadge) {
    if (!(isManuallyVerified && !newBadge)) {
      if (newBadge) updates.verificationBadge = newBadge
    }
  }

  // Update tier if changed
  if (newTier !== seller.designerTier) {
    updates.designerTier = newTier
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({
      where: { id: sellerId },
      data: updates
    })
  }
}
