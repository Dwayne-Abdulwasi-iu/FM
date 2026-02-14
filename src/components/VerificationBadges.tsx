'use client'

interface VerificationBadgeProps {
  badge?: string | null
  badges?: string[]
  isVerified?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const badgeConfig: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  RISING_STAR: {
    icon: '⭐',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Rising Star'
  },
  TOP_SELLER: {
    icon: '🏆',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Top Seller'
  },
  VERIFIED_PRO: {
    icon: '✓',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Verified Pro'
  },
  ELITE: {
    icon: '💎',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Elite Designer'
  }
}

const sizeClasses = {
  sm: 'w-4 h-4 text-xs',
  md: 'w-6 h-6 text-sm',
  lg: 'w-8 h-8 text-base'
}

export function VerificationBadge({ 
  badge, 
  badges,
  isVerified = false, 
  size = 'md',
  showLabel = false 
}: VerificationBadgeProps) {
  // Handle multiple badges (preferred)
  if (badges && badges.length > 0) {
    return (
      <div className="flex items-center gap-1.5">
        {badges.map((b) => {
          const config = badgeConfig[b]
          if (!config) return null
          
          return (
            <span key={b} className="inline-flex items-center gap-1" title={config.label}>
              <span className={`inline-flex items-center justify-center rounded-full ${config.bgColor} ${config.color} p-1`}>
                {b === 'VERIFIED_PRO' ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span>{config.icon}</span>
                )}
              </span>
              {showLabel && <span className={`text-xs ${config.color} font-medium`}>{config.label}</span>}
            </span>
          )
        })}
      </div>
    )
  }

  // Handle single badge (legacy support)
  // No badge to display
  if (!badge || badge === 'NONE') {
    if (!isVerified) return null
    
    // Show simple verified checkmark
    return (
      <span 
        className={`inline-flex items-center gap-1 ${sizeClasses[size]}`}
        title="Verified Seller"
      >
        <span className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 p-0.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
        {showLabel && <span className="text-green-600 font-medium">Verified</span>}
      </span>
    )
  }

  const config = badgeConfig[badge]
  if (!config) return null

  return (
    <span 
      className={`inline-flex items-center gap-1 ${sizeClasses[size]}`}
      title={config.label}
    >
      <span className={`inline-flex items-center justify-center rounded-full ${config.bgColor} ${config.color} p-1`}>
        {badge === 'VERIFIED_PRO' ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ) : (
          <span>{config.icon}</span>
        )}
      </span>
      {showLabel && <span className={`${config.color} font-medium`}>{config.label}</span>}
    </span>
  )
}

interface DesignerTierBadgeProps {
  tier?: string | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const tierConfig: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  STARTER: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-300'
  },
  BRONZE: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-400'
  },
  SILVER: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-200 dark:bg-gray-700',
    borderColor: 'border-gray-400'
  },
  GOLD: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    borderColor: 'border-yellow-500'
  },
  PLATINUM: {
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    borderColor: 'border-cyan-500'
  },
  DIAMOND: {
    color: 'text-purple-600',
    bgColor: 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
    borderColor: 'border-purple-500'
  }
}

export function DesignerTierBadge({ tier, size = 'md', showLabel = false }: DesignerTierBadgeProps) {
  if (!tier || tier === 'STARTER') return null

  const config = tierConfig[tier]
  if (!config) return null

  const sizeStyles = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  return (
    <span 
      className={`inline-flex items-center rounded-full border ${config.bgColor} ${config.color} ${config.borderColor} ${sizeStyles[size]} font-medium`}
      title={`${tier} tier designer`}
    >
      {tier === 'DIAMOND' && '💎 '}
      {tier === 'PLATINUM' && '🌟 '}
      {tier === 'GOLD' && '🥇 '}
      {tier === 'SILVER' && '🥈 '}
      {tier === 'BRONZE' && '🥉 '}
      {showLabel && tier}
    </span>
  )
}
