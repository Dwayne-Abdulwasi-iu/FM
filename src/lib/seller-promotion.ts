import prisma from '@/lib/prisma'

/**
 * Designer Tier Levels based on total sales:
 * - DESIGNER: 5+ sales (basic designer badge)
 * - GOLD_DESIGNER: 20+ sales (gold cup badge)
 * - VIP_DESIGNER: 50+ sales (VIP badge)
 * - VVIP_DESIGNER: 100+ sales (VVIP with jade cup badge)
 */
export type DesignerTier = 'DESIGNER' | 'GOLD_DESIGNER' | 'VIP_DESIGNER' | 'VVIP_DESIGNER' | null

export interface DesignerBadgeInfo {
  tier: DesignerTier
  label: string
  description: string
  icon: string
  color: string
  bgColor: string
  salesRequired: number
}

export const DESIGNER_TIERS: Record<string, DesignerBadgeInfo> = {
  DESIGNER: {
    tier: 'DESIGNER',
    label: 'Designer',
    description: 'Verified Fashion Designer',
    icon: '✨',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    salesRequired: 5
  },
  GOLD_DESIGNER: {
    tier: 'GOLD_DESIGNER',
    label: 'Gold Designer',
    description: 'Top performing designer with 20+ sales',
    icon: '🏆',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    salesRequired: 20
  },
  VIP_DESIGNER: {
    tier: 'VIP_DESIGNER',
    label: 'VIP Designer',
    description: 'Elite designer with 50+ sales',
    icon: '⭐',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    salesRequired: 50
  },
  VVIP_DESIGNER: {
    tier: 'VVIP_DESIGNER',
    label: 'VVIP Designer',
    description: 'Legendary designer with 100+ sales',
    icon: '💎',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    salesRequired: 100
  }
}

/**
 * Get designer badge info for a given tier
 */
export function getDesignerBadgeInfo(tier: string | null): DesignerBadgeInfo | null {
  if (!tier) return null
  return DESIGNER_TIERS[tier] || null
}

/**
 * Calculate the designer tier based on total sales count
 */
export function calculateDesignerTier(totalSales: number): DesignerTier {
  if (totalSales >= 100) return 'VVIP_DESIGNER'
  if (totalSales >= 50) return 'VIP_DESIGNER'
  if (totalSales >= 20) return 'GOLD_DESIGNER'
  if (totalSales >= 5) return 'DESIGNER'
  return null
}

/**
 * Send email notification when a user is promoted or their tier changes
 */
async function sendDesignerPromotionEmail(
  userId: string,
  email: string,
  name: string | null,
  tier: DesignerTier,
  isNewDesigner: boolean
): Promise<void> {
  const badgeInfo = tier ? DESIGNER_TIERS[tier] : null
  if (!badgeInfo) return

  const displayName = name || 'Designer'
  
  // In production, integrate with your email service (SendGrid, Resend, etc.)
  // For now, we'll log the email content
  const subject = isNewDesigner 
    ? `🎉 Congratulations! You're now a ${badgeInfo.label} on Fashion Marketplace!`
    : `🎉 Level Up! You've been promoted to ${badgeInfo.label}!`

  const emailContent = `
    Hi ${displayName},

    ${isNewDesigner 
      ? `Congratulations! You've successfully sold enough designs to become a verified ${badgeInfo.label} on Fashion Marketplace!`
      : `Amazing work! Your dedication has paid off - you've been promoted to ${badgeInfo.label}!`
    }

    ${badgeInfo.icon} ${badgeInfo.label} - ${badgeInfo.description}

    What this means for you:
    - Your designs now display the ${badgeInfo.label} badge
    - Your profile shows your designer status
    - You're recognized in our community as a trusted designer
    ${tier === 'GOLD_DESIGNER' ? '- You now have the prestigious Gold Cup badge!' : ''}
    ${tier === 'VIP_DESIGNER' ? '- You now have exclusive VIP designer status!' : ''}
    ${tier === 'VVIP_DESIGNER' ? '- You now have the legendary VVIP status with the Jade Cup badge!' : ''}

    Keep creating amazing designs!

    Best regards,
    The Fashion Marketplace Team
  `

  console.log(`[EMAIL] Sending designer promotion email to ${email}:`)
  console.log(`Subject: ${subject}`)
  console.log(emailContent)

  // TODO: Integrate with email service
  // Example with SendGrid:
  // await sendgrid.send({
  //   to: email,
  //   from: 'noreply@fashionmarketplace.com',
  //   subject,
  //   text: emailContent,
  //   html: generateHtmlEmail(emailContent, badgeInfo)
  // })
}

/**
 * Get total sales count for a user
 */
async function getTotalSalesCount(userId: string): Promise<number> {
  const result = await prisma.orderItem.aggregate({
    where: {
      design: {
        designerId: userId
      },
      order: {
        status: 'COMPLETED'
      }
    },
    _sum: {
      quantity: true
    }
  })
  
  return result._sum?.quantity || 0
}

/**
 * Check and update a user's designer status and tier
 * 
 * Tier thresholds:
 * - DESIGNER: 5+ total sales
 * - GOLD_DESIGNER: 20+ total sales
 * - VIP_DESIGNER: 50+ total sales
 * - VVIP_DESIGNER: 100+ total sales
 * 
 * @param userId - The ID of the user to check
 * @returns Object with promotion status and new tier
 */
export async function checkAndPromoteToSeller(userId: string): Promise<{
  promoted: boolean
  tierChanged: boolean
  newTier: DesignerTier
}> {
  try {
    // Get current user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        role: true, 
        designerTier: true,
        email: true,
        name: true,
        emailNotifications: true
      }
    })

    if (!user) {
      return { promoted: false, tierChanged: false, newTier: null }
    }

    // Skip if admin
    if (user.role === 'ADMIN') {
      return { promoted: false, tierChanged: false, newTier: null }
    }

    // Get total sales count
    const totalSales = await getTotalSalesCount(userId)
    
    // Calculate new tier
    const newTier = calculateDesignerTier(totalSales)
    const currentTier = user.designerTier as DesignerTier
    const isCurrentlySeller = user.role === 'SELLER'

    // Check if tier changed
    const tierOrder = [null, 'DESIGNER', 'GOLD_DESIGNER', 'VIP_DESIGNER', 'VVIP_DESIGNER']
    const currentTierIndex = tierOrder.indexOf(currentTier)
    const newTierIndex = tierOrder.indexOf(newTier)
    const tierChanged = newTierIndex > currentTierIndex

    // Check if becoming a seller for the first time
    const becomingSeller = !isCurrentlySeller && newTier !== null

    if (becomingSeller || tierChanged) {
      // Update user role and tier
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'SELLER',
          designerTier: newTier,
          designerTierUpdatedAt: new Date(),
          totalSales: totalSales
        }
      })

      console.log(`User ${userId} ${becomingSeller ? 'promoted to SELLER' : 'tier upgraded'}: ` +
        `${currentTier || 'none'} → ${newTier}, Total sales: ${totalSales}`)

      // Send email notification if user has email notifications enabled
      if (user.emailNotifications && user.email) {
        await sendDesignerPromotionEmail(
          userId,
          user.email,
          user.name,
          newTier,
          becomingSeller
        )
      }

      return { 
        promoted: becomingSeller, 
        tierChanged: tierChanged && !becomingSeller,
        newTier 
      }
    }

    return { promoted: false, tierChanged: false, newTier: currentTier }
  } catch (error) {
    console.error('Error in checkAndPromoteToSeller:', error)
    return { promoted: false, tierChanged: false, newTier: null }
  }
}

/**
 * Check multiple designers after a batch of sales
 * @param designerIds - Array of designer user IDs to check
 */
export async function checkAndPromoteDesigners(designerIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(designerIds)]
  
  for (const designerId of uniqueIds) {
    await checkAndPromoteToSeller(designerId)
  }
}

/**
 * Get designer badge component data for display
 */
export function getDesignerBadgeDisplay(tier: string | null): {
  show: boolean
  label: string
  icon: string
  className: string
} | null {
  if (!tier) return null
  
  const badge = DESIGNER_TIERS[tier]
  if (!badge) return null

  return {
    show: true,
    label: badge.label,
    icon: badge.icon,
    className: `${badge.bgColor} ${badge.color}`
  }
}
