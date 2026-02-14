'use client'

import { useState } from 'react'
import { X, AlertCircle, Check } from 'lucide-react'

interface FeaturedItemsConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  itemTitle: string
  itemType: 'DESIGN' | 'PRODUCT'
  subscriptionTier: string | null
  maxFeatured: number
  currentFeatured: number
  remainingSlots: number
}

export function FeaturedItemsConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  subscriptionTier,
  maxFeatured,
  currentFeatured,
  remainingSlots
}: FeaturedItemsConfirmationModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }

  const canAdd = remainingSlots > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {canAdd ? 'Add to Featured' : 'Featured Limit Reached'}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Item Info */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Item to feature:</p>
            <p className="font-semibold text-gray-900 truncate">{itemTitle}</p>
          </div>

          {/* Subscription Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Your subscription:</p>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">
                {subscriptionTier === 'FREE' ? 'Free Plan' : `${subscriptionTier} Plan`}
              </span>
              <span className="text-sm font-medium text-gray-700">{maxFeatured} featured items</span>
            </div>

            {/* Featured Count Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Currently featured:</span>
                <span className="font-medium text-gray-900">{currentFeatured}/{maxFeatured}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    remainingSlots > 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(currentFeatured / maxFeatured) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status Message */}
          {!canAdd ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">
                  You've reached your featured items limit
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Remove some items from featured or upgrade your subscription to add more.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">
                  Ready to add to featured
                </p>
                <p className="text-sm text-green-700 mt-1">
                  This item will appear on your featured items page and potentially on the homepage.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canAdd || isLoading}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition ${
              canAdd
                ? 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Adding...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
