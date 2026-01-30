'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface StorageOptionSelectorProps {
  productId: string
  productTitle: string
  expiresAt: Date | null
  daysInWarehouse: number
  onSuccess?: () => void
}

export function StorageOptionSelector({
  productId,
  productTitle,
  expiresAt,
  daysInWarehouse,
  onSuccess,
}: StorageOptionSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')

  const daysLeft = expiresAt
    ? Math.floor(
        (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0

  const options = [
    {
      id: 'FULL_RETURN',
      name: 'Free Return',
      description: 'We ship it back to you at no cost',
      details: 'Product returns to your address. No questions asked.',
      cost: '₦0 (Free)',
      icon: '📦',
    },
    {
      id: 'PARTIAL_LIQUIDATION',
      name: 'Liquidation Sale',
      description: 'Auto 50% off, you receive 40% of sale price',
      details: 'We mark it as liquidation. If sold, you get 40%. If unsold in 10 days, it goes to charity.',
      cost: 'Variable (50% off)',
      icon: '🏷️',
    },
    {
      id: 'FLEXIBLE_STORAGE',
      name: 'Extend Storage',
      description: 'Keep in warehouse (₦5,000/month)',
      details: 'Pay monthly to keep product in warehouse. Max 6 months total.',
      cost: '₦5,000/month',
      icon: '📅',
    },
  ]

  const handleSelect = async (optionId: string) => {
    setSelected(optionId)
    setLoading(true)

    try {
      const response = await fetch(`/api/boutique/products/${productId}/storage-option`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storageOption: optionId,
          notes: notes || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to save storage option')
        setSelected(null)
        return
      }

      toast.success(`✓ ${productTitle} storage option saved!`, {
        duration: 5,
        icon: '✓',
      })

      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Error saving storage option:', error)
      toast.error('Failed to save storage option')
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-6 my-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⏰</span>
          <h3 className="text-lg font-bold text-gray-900">
            Your product expires in {daysLeft} days
          </h3>
        </div>
        <p className="text-sm text-gray-600 ml-12">
          Choose what happens when storage expires on{' '}
          <span className="font-bold">
            {expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }) : 'N/A'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={loading}
            className={`p-4 border-2 rounded-lg transition-all text-left ${
              selected === option.id
                ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{option.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-gray-900">{option.name}</div>
                <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                <div className="text-xs text-gray-500 mt-2 italic">{option.details}</div>
                <div className="text-xs font-semibold text-orange-600 mt-3">Cost: {option.cost}</div>
              </div>
            </div>

            {selected === option.id && (
              <div className="mt-3 text-center bg-green-100 rounded py-1">
                <span className="text-green-700 font-bold">✓ Selected</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {selected === 'FLEXIBLE_STORAGE' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-bold text-blue-900 mb-2">Add notes for our team (optional):</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., 'I plan to extend storage for 2 months'"
            className="w-full border rounded px-3 py-2 text-sm"
            rows={2}
          />
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs text-gray-600">
        <p className="font-bold mb-2">📝 Important:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>You must choose an option before day 180 or product will be auto-liquidated</li>
          <li>You can change your mind up until day 179</li>
          <li>All costs/refunds calculated at end of process</li>
        </ul>
      </div>

      {selected && !loading && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 font-bold">
          ✓ Storage option saved. You can change it anytime before day 180.
        </div>
      )}
    </div>
  )
}
