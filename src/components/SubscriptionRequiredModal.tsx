'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyProvider'

interface SubscriptionRequiredModalProps {
  isOpen: boolean
  onClose: () => void
  currentTier?: string
  current?: number
  max?: number
  errorCode?: 'NO_FEATURED_ACCESS' | 'TIER_LIMIT_REACHED'
  itemType?: 'DESIGN' | 'PRODUCT' // What's being featured
}

export function SubscriptionRequiredModal({
  isOpen,
  onClose,
  currentTier = 'FREE',
  current = 0,
  max = 0,
  errorCode = 'NO_FEATURED_ACCESS',
  itemType = 'DESIGN'
}: SubscriptionRequiredModalProps) {
  const { formatPrice } = useCurrency()
  const [selectedTier, setSelectedTier] = useState<'STARTER' | 'PRO' | 'VIP'>('PRO')

  if (!isOpen) return null

  const tiers: Record<string, { name: string; featured: number; price: string; period?: string; color: string; highlight?: boolean }> = {
    FREE: {
      name: 'Free',
      featured: 0,
      price: formatPrice(0),
      color: 'bg-gray-100 border-gray-300'
    },
    STARTER: {
      name: 'Starter',
      featured: 2,
      price: formatPrice(2.99),
      period: '/month',
      color: 'bg-blue-50 border-blue-300',
      highlight: true
    },
    PRO: {
      name: 'Pro',
      featured: 6,
      price: formatPrice(4.99),
      period: '/month',
      color: 'bg-purple-50 border-purple-300',
      highlight: true
    },
    VIP: {
      name: 'VIP',
      featured: 10,
      price: formatPrice(9.99),
      period: '/month',
      color: 'bg-amber-50 border-amber-300',
      highlight: true
    }
  }

  const features = {
    STARTER: ['2 featured items', 'Basic support', 'Analytics dashboard'],
    PRO: ['6 featured items', 'Priority support', 'Advanced analytics'],
    VIP: ['10 featured items', 'Premium support', 'Advanced analytics', 'Custom branding']
  }

  const handleUpgrade = async (tier: 'STARTER' | 'PRO' | 'VIP') => {
    try {
      // Redirect to upgrade page
      // STARTER, PRO, VIP are the valid plan names
      const planName = tier.toLowerCase() // starter, pro, vip
      window.location.href = `/seller/upgrade?plan=${planName}`
    } catch (error) {
      console.error('Upgrade error:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {errorCode === 'NO_FEATURED_ACCESS' 
                ? 'Subscription Required'
                : 'Upgrade Your Plan'}
            </h2>
            <p className="text-gray-600 mt-1">
              {errorCode === 'NO_FEATURED_ACCESS'
                ? 'You need an active subscription to feature items'
                : `You've reached your featured ${itemType.toLowerCase()} limit`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
            title="Close modal"
            aria-label="Close subscription modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Usage */}
        {errorCode === 'TIER_LIMIT_REACHED' && (
          <div className="px-6 pt-6 pb-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Current usage:</strong> {current} of {max} featured {itemType.toLowerCase()}s
              </p>
            </div>
          </div>
        )}

        {/* Tier Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['FREE', 'STARTER', 'PRO', 'VIP'] as const).map((tier) => {
            const tierData = tiers[tier]
            const isCurrent = tier === currentTier.toUpperCase()
            const isSelected = tier === selectedTier

            return (
              <div
                key={tier}
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  isCurrent
                    ? 'border-green-500 bg-green-50'
                    : isSelected
                    ? tierData.color
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => tier !== 'FREE' && setSelectedTier(tier as 'STARTER' | 'PRO' | 'VIP')}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{tierData.name}</h3>
                    <p className="text-sm text-gray-900 font-semibold">
                      {tierData.price}
                      {tierData.period && <span>{tierData.period}</span>}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-4 py-3 border-y">
                  <p className="font-bold text-gray-900 text-lg">
                    {tierData.featured} featured {itemType.toLowerCase()}s
                  </p>
                </div>

                {tier !== 'FREE' && (
                  <ul className="text-sm space-y-2 mb-4">
                    {features[tier].map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-gray-900 font-medium">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                {tier === 'FREE' ? (
                  <button disabled className="w-full py-2 bg-gray-200 text-gray-600 rounded font-medium cursor-not-allowed">
                    Current Plan
                  </button>
                ) : isCurrent ? (
                  <button disabled className="w-full py-2 bg-green-100 text-green-700 rounded font-medium cursor-not-allowed">
                    Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier as 'PRO' | 'VIP')}
                    className={`w-full py-2 rounded font-medium transition ${
                      isSelected
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200'
                    }`}
                  >
                    {isCurrent ? 'Current' : 'Upgrade'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-100 transition"
          >
            Maybe Later
          </button>
          {selectedTier !== currentTier.toUpperCase() && (
            <button
              onClick={() => handleUpgrade(selectedTier)}
              className="flex-1 px-4 py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:bg-primary/90 transition"
            >
              Upgrade to {selectedTier}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
