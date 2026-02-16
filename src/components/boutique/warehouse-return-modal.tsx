'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { AlertCircle, X } from 'lucide-react'

interface WarehouseReturnModalProps {
  productId: string
  productTitle: string
  daysInWarehouse: number
  onSuccess?: () => void
}

export function WarehouseReturnModal({
  productId,
  productTitle,
  daysInWarehouse,
  onSuccess
}: WarehouseReturnModalProps) {
  const [open, setOpen] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const adminFeePerVariant = daysInWarehouse <= 119 ? 2 : 1

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      toast.error('Please agree to the terms')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/boutique/seller/request-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit request')
      }

      toast.success('Return request submitted! Awaiting admin approval.')
      setOpen(false)
      setAgreedToTerms(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 border border-amber-200 bg-white hover:bg-amber-50 text-amber-600 font-medium rounded"
        title="Request warehouse return"
      >
        Request Warehouse Return
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Request Warehouse Return</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{productTitle}</span>
            </p>

            {/* Fee Breakdown */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-3 text-sm">📋 Fee Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-800">Days in Warehouse:</span>
                  <span className="font-semibold text-amber-900">{daysInWarehouse}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-800">Storage Period:</span>
                  <span className="font-semibold text-amber-900">
                    {daysInWarehouse <= 119 ? 'Days 0-119' : 'Days 120-180'}
                  </span>
                </div>
                <div className="border-t border-amber-200 pt-2 mt-2 flex justify-between">
                  <span className="text-amber-900 font-semibold">Admin Fee (units):</span>
                  <span className="text-2xl font-bold text-amber-600">{adminFeePerVariant}</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">⚠️ Important</p>
                <p>
                  Once the admin approves your return, the fee lock becomes <strong>irreversible</strong>. 
                  You cannot cancel after approval.
                </p>
              </div>
            </div>

            {/* Fee Details */}
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 space-y-1">
              <p>
                <strong>What this fee means:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{adminFeePerVariant} unit{adminFeePerVariant !== 1 ? 's' : ''} will be deducted from your inventory</li>
                <li>This represents the warehouse storage cost</li>
                <li>It's a one-time charge, not recurring</li>
              </ul>
            </div>

            {/* Agreement */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-blue-900 cursor-pointer leading-relaxed">
                I understand that the <strong>{adminFeePerVariant}-unit admin fee is irreversible</strong> once the admin approves my return request.
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !agreedToTerms}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-medium rounded"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
