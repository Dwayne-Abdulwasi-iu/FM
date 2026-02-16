/**
 * Designer Tier Constants and Utilities
 * 
 * Client-safe exports for designer badge information.
 * No server dependencies or external module imports.
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
