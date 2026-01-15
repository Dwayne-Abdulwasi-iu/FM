'use client'

import { DESIGNER_TIERS } from '@/lib/seller-promotion'

interface DesignerBadgeProps {
  tier: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

/**
 * Reusable Designer Badge Component
 * 
 * Displays the appropriate badge based on the designer's tier:
 * - DESIGNER: Basic designer badge with sparkle
 * - GOLD_DESIGNER: Gold cup badge
 * - VIP_DESIGNER: VIP star badge
 * - VVIP_DESIGNER: VVIP jade cup badge
 */
export default function DesignerBadge({ 
  tier, 
  size = 'md', 
  showLabel = true,
  className = ''
}: DesignerBadgeProps) {
  if (!tier) return null

  const badge = DESIGNER_TIERS[tier]
  if (!badge) return null

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${badge.bgColor} ${badge.color}
        ${sizeClasses[size]}
        ${className}
      `}
      title={badge.description}
    >
      <span className={iconSizes[size]}>{badge.icon}</span>
      {showLabel && <span>{badge.label}</span>}
    </span>
  )
}

/**
 * Compact badge for use in cards and small spaces
 */
export function DesignerBadgeCompact({ tier }: { tier: string | null | undefined }) {
  if (!tier) return null

  const badge = DESIGNER_TIERS[tier]
  if (!badge) return null

  return (
    <span 
      className={`
        inline-flex items-center justify-center w-5 h-5 rounded-full text-xs
        ${badge.bgColor}
      `}
      title={`${badge.label}: ${badge.description}`}
    >
      {badge.icon}
    </span>
  )
}

/**
 * Badge for chat messages
 */
export function DesignerChatBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return null

  const badge = DESIGNER_TIERS[tier]
  if (!badge) return null

  return (
    <span 
      className={`
        inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium
        ${badge.bgColor} ${badge.color}
      `}
    >
      {badge.icon}
      <span className="hidden sm:inline">{badge.label}</span>
    </span>
  )
}

/**
 * Large profile badge with full details
 */
export function DesignerProfileBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return null

  const badge = DESIGNER_TIERS[tier]
  if (!badge) return null

  return (
    <div 
      className={`
        inline-flex items-center gap-2 rounded-lg px-3 py-2
        ${badge.bgColor} ${badge.color}
      `}
    >
      <span className="text-2xl">{badge.icon}</span>
      <div className="flex flex-col">
        <span className="font-semibold">{badge.label}</span>
        <span className="text-[10px] opacity-80">{badge.description}</span>
      </div>
    </div>
  )
}
