'use client'

import { useState, useEffect } from 'react'
import { Award, Crown, Gem, Star, Zap } from 'lucide-react'

interface TierInfo {
  currentTier: string
  tierName: string
  commissionRate: number
  totalEarnings: number
  isProSubscriber: boolean
  nextTier: string | null
  nextTierThreshold: number | null
  amountToNextTier: number | null
  progressToNextTier: number
  allTiers: {
    key: string
    name: string
    threshold: number
    baseRate: number
    effectiveRate: number
    percentageDisplay: string
    isCurrent: boolean
    isUnlocked: boolean
  }[]
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  NEW: <Star className="h-5 w-5" />,
  BRONZE: <Award className="h-5 w-5" />,
  SILVER: <Award className="h-5 w-5" />,
  GOLD: <Crown className="h-5 w-5" />,
  PLATINUM: <Gem className="h-5 w-5" />,
  DIAMOND: <Gem className="h-5 w-5" />,
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NEW: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  BRONZE: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  SILVER: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  GOLD: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400' },
  PLATINUM: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-400' },
  DIAMOND: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-400' },
}

export default function CommissionTierCard() {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllTiers, setShowAllTiers] = useState(false)

  useEffect(() => {
    fetchTierInfo()
  }, [])

  const fetchTierInfo = async () => {
    try {
      const response = await fetch('/api/seller/commission-tier')
      if (response.ok) {
        const data = await response.json()
        setTierInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch tier info:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (!tierInfo) return null

  const colors = TIER_COLORS[tierInfo.currentTier] || TIER_COLORS.NEW

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`p-6 ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${colors.bg} border-2 ${colors.border} rounded-full flex items-center justify-center ${colors.text}`}>
              {TIER_ICONS[tierInfo.currentTier]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold ${colors.text}`}>
                  {tierInfo.tierName} Seller
                </h3>
                {tierInfo.isProSubscriber && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
                    <Zap className="h-3 w-3" />
                    PRO
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Current commission rate: <span className="font-semibold">{(tierInfo.commissionRate * 100).toFixed(0)}%</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className={`text-xl font-bold ${colors.text}`}>
              ${tierInfo.totalEarnings.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress to next tier */}
        {tierInfo.nextTier && tierInfo.amountToNextTier !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">
                Progress to {tierInfo.nextTier.charAt(0) + tierInfo.nextTier.slice(1).toLowerCase()}
              </span>
              <span className="text-gray-600">
                ${tierInfo.amountToNextTier.toLocaleString()} to go
              </span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${colors.text.replace('text', 'bg')}`}
                style={{ width: `${Math.min(tierInfo.progressToNextTier, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700">Commission Tiers</h4>
          <button
            onClick={() => setShowAllTiers(!showAllTiers)}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            {showAllTiers ? 'Show less' : 'View all tiers'}
          </button>
        </div>

        {/* Tiers list */}
        <div className="space-y-2">
          {tierInfo.allTiers
            .slice(0, showAllTiers ? undefined : 3)
            .map((tier) => (
              <div
                key={tier.key}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  tier.isCurrent
                    ? 'bg-indigo-50 border border-indigo-200'
                    : tier.isUnlocked
                    ? 'bg-gray-50'
                    : 'bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    TIER_COLORS[tier.key]?.bg || 'bg-gray-100'
                  } ${TIER_COLORS[tier.key]?.text || 'text-gray-600'}`}>
                    {TIER_ICONS[tier.key]}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${tier.isCurrent ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {tier.name}
                      {tier.isCurrent && (
                        <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${tier.threshold.toLocaleString()}+ in sales
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tier.isCurrent ? 'text-indigo-600' : 'text-gray-900'}`}>
                    {tier.percentageDisplay}
                  </p>
                  <p className="text-xs text-gray-500">commission</p>
                </div>
              </div>
            ))}
        </div>

        {/* Pro Subscription CTA */}
        {!tierInfo.isProSubscriber && (
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                <Zap className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Upgrade to Pro</p>
                <p className="text-sm text-gray-600">
                  Get 1% lower commission on all sales + featured listings
                </p>
              </div>
              <a
                href="/seller/upgrade"
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
              >
                Upgrade
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
