'use client'

import { Zap, Crown, Award } from 'lucide-react'

interface SubscriptionTierBadgeProps {
  tier: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

/**
 * Subscription Tier Badge Component
 * 
 * Displays the appropriate badge based on the user's subscription tier:
 * - STARTER: Basic tier (blue)
 * - PRO: Professional tier (purple)
 * - VIP: Premium tier (gold)
 * - null: Free user (no badge)
 */
export default function SubscriptionTierBadge({ 
  tier, 
  size = 'md', 
  showLabel = true,
  className = ''
}: SubscriptionTierBadgeProps) {
  if (!tier) return null

  const tierConfig: Record<string, {
    icon: React.ReactNode
    label: string
    description: string
    bgColor: string
    textColor: string
  }> = {
    STARTER: {
      icon: <Zap className="w-full h-full" />,
      label: 'Starter',
      description: 'Starter subscription tier',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    PRO: {
      icon: <Award className="w-full h-full" />,
      label: 'Pro',
      description: 'Professional subscription tier',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700'
    },
    VIP: {
      icon: <Crown className="w-full h-full" />,
      label: 'VIP',
      description: 'VIP subscription tier',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700'
    }
  }

  const config = tierConfig[tier]
  if (!config) return null

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <span 
      className={`
        inline-flex items-center rounded-full font-semibold
        ${config.bgColor} ${config.textColor}
        ${sizeClasses[size]}
        ${className}
      `}
      title={config.description}
    >
      <span className={iconSizes[size]}>
        {config.icon}
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

/**
 * Compact badge for use in cards and small spaces
 */
export function SubscriptionTierBadgeCompact({ 
  tier, 
  className = '' 
}: { 
  tier: string | null | undefined
  className?: string
}) {
  if (!tier) return null

  const tierConfig: Record<string, {
    icon: React.ReactNode
    label: string
    bgColor: string
    textColor: string
  }> = {
    STARTER: {
      icon: <Zap className="w-full h-full" />,
      label: 'Starter',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    PRO: {
      icon: <Award className="w-full h-full" />,
      label: 'Pro',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700'
    },
    VIP: {
      icon: <Crown className="w-full h-full" />,
      label: 'VIP',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700'
    }
  }

  const config = tierConfig[tier]
  if (!config) return null

  return (
    <span 
      className={`
        inline-flex items-center justify-center w-5 h-5 rounded-full
        ${config.bgColor}
        ${className}
      `}
      title={`${config.label} subscription`}
    >
      <span className={`${config.textColor}`}>
        {config.icon}
      </span>
    </span>
  )
}
