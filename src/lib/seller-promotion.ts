'use server'

import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import type { DesignerTier, _DesignerBadgeInfo } from '@/lib/designer-tiers'
import { DESIGNER_TIERS, calculateDesignerTier } from '@/lib/designer-tiers'

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

  // Generate HTML version of email with badge styling
  const badgeHtml = badgeInfo ? `
    <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: ${badgeInfo.bgColor.replace('bg-', '#').replace('100', 'F0')}; border-radius: 8px;">
      <p style="font-size: 40px; margin: 0;">${badgeInfo.icon}</p>
      <p style="font-size: 18px; font-weight: bold; color: ${badgeInfo.color.replace('text-', '#').replace('700', '')}; margin: 5px 0;">${badgeInfo.label}</p>
      <p style="font-size: 14px; color: #666; margin: 0;">${badgeInfo.description}</p>
    </div>
  ` : ''

  const htmlContent = `
    <h2>Congratulations!</h2>
    <p>${emailContent.split('Congratulations!')[1] || emailContent}</p>
    ${badgeHtml}
  `;

  // Send email using the email service
  await sendEmail({
    to: email,
    subject,
    html: htmlContent,
    text: emailContent,
  })
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
