'use client'

import { DollarSign, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyProvider'

interface MilestoneDisplayProps {
  template: 'simple' | 'standard' | 'detailed' | null
  totalAmount: number
  platformFee: number
  designerEarnings: number
  platformFeePercent?: number
  compact?: boolean
}

export default function MilestoneDisplay({
  template,
  totalAmount,
  platformFee,
  designerEarnings,
  platformFeePercent = 10,
  compact = false
}: MilestoneDisplayProps) {
  const { formatPrice } = useCurrency()
  const MILESTONETEMPLATES = {
    simple: [
      { name: 'Deposit', percentage: 50, description: 'Released immediately when designer confirms start' },
      { name: 'Final Delivery', percentage: 50, description: 'Released when you approve final work' }
    ],
    standard: [
      { name: 'Deposit', percentage: 30, description: 'Released immediately when designer confirms start' },
      { name: 'First Draft', percentage: 30, description: 'Released when you approve initial draft' },
      { name: 'Final Delivery', percentage: 40, description: 'Released when you approve final work' }
    ],
    detailed: [
      { name: 'Deposit', percentage: 20, description: 'Released immediately when designer confirms start' },
      { name: 'Concept Approval', percentage: 20, description: 'Released when you approve concept' },
      { name: 'First Draft', percentage: 25, description: 'Released when you approve first draft' },
      { name: 'Revisions Complete', percentage: 15, description: 'Released when you approve revisions' },
      { name: 'Final Delivery', percentage: 20, description: 'Released when you approve final delivery' }
    ]
  }

  if (!template) {
    return null
  }

  const milestones = MILESTONE_TEMPLATES[template]
  const netDesignerEarnings = designerEarnings - platformFee

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      {!compact && (
        <div>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Payment Schedule ({template === 'simple' ? '50/50' : template === 'standard' ? '30/30/40' : '20/20/25/15/20'})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Your payment will be released in {milestones.length} milestones as the designer delivers each phase.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {milestones.map((milestone, idx) => {
          const amount = (totalAmount * milestone.percentage) / 100
          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                idx === 0
                  ? 'border-amber-200 bg-amber-50'
                  : idx === milestones.length - 1
                    ? 'border-green-200 bg-green-50'
                    : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {idx === 0 && <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />}
                  {idx === milestones.length - 1 && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                  {idx !== 0 && idx !== milestones.length - 1 && <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                  <span className={`font-bold text-sm ${
                    idx === 0
                      ? 'text-amber-900'
                      : idx === milestones.length - 1
                        ? 'text-green-900'
                        : 'text-blue-900'
                  }`}>
                    {milestone.name}
                  </span>
                </div>
                <span className="font-bold text-gray-900 text-sm">{formatPrice(amount)}</span>
              </div>
              <p className="text-xs text-gray-600 ml-6">{milestone.description}</p>
              {idx === 0 && (
                <p className="text-xs text-amber-700 font-medium mt-2 ml-6">
                  ⚠️ This deposit is <span className="underline">non-refundable</span> if you cancel after this milestone
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Your Payment:</span>
            <span className="font-bold text-gray-900">{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Platform Fee ({platformFeePercent}%):</span>
            <span>{formatPrice(platformFee)}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold">
            <span className="text-gray-900">Designer Receives:</span>
            <span className="text-green-600">{formatPrice(netDesignerEarnings)}</span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">🕐 14-Day Auto-Release Safety Net</p>
            <p>If the designer doesn't respond to your milestone approval for 14 days, funds are automatically released. You're fully protected.</p>
          </div>
        </div>
      )}
    </div>
  )
}

