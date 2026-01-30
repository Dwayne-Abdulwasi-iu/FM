'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getCommissionRate } from '@/lib/commission-tiers'
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Info, 
  Star,
  Lock,
  PieChart,
  Calendar,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'

interface MilestoneTemplate {
  id: 'simple' | 'standard' | 'detailed'
  name: string
  description: string
  icon: string
  milestones: Array<{ name: string; percentage: number; days?: number }>
  recommended: boolean
  lockedForTier?: string
  bestFor: string
  riskLevel: 'low' | 'medium' | 'high'
}

const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  {
    id: 'simple',
    name: 'Simple (50/50)',
    description: 'Best for smaller, faster projects',
    icon: '⚡',
    milestones: [
      { name: 'Deposit', percentage: 50, days: 0 },
      { name: 'Final Delivery', percentage: 50, days: 7 }
    ],
    recommended: false,
    lockedForTier: 'GOLD_DESIGNER',
    bestFor: 'Experienced designers only - Fast turnaround projects',
    riskLevel: 'high'
  },
  {
    id: 'standard',
    name: 'Standard (30/30/40)',
    description: 'Balanced payment structure for most projects',
    icon: '⚖️',
    milestones: [
      { name: 'Deposit', percentage: 30, days: 0 },
      { name: 'First Draft', percentage: 30, days: 7 },
      { name: 'Final Delivery', percentage: 40, days: 14 }
    ],
    recommended: true,
    bestFor: 'Most custom commissions - Good protection for both parties',
    riskLevel: 'low'
  },
  {
    id: 'detailed',
    name: 'Detailed (20/20/25/15/20)',
    description: 'Maximum protection with frequent checkpoints',
    icon: '🔐',
    milestones: [
      { name: 'Deposit', percentage: 20, days: 0 },
      { name: 'Concept Approval', percentage: 20, days: 5 },
      { name: 'First Draft', percentage: 25, days: 10 },
      { name: 'Revisions Complete', percentage: 15, days: 15 },
      { name: 'Final Delivery', percentage: 20, days: 21 }
    ],
    recommended: false,
    bestFor: 'Complex projects - Most protection, frequent check-ins',
    riskLevel: 'low'
  }
]

export default function CommissionMilestonesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<'simple' | 'standard' | 'detailed'>('standard')
  const [userTier, setUserTier] = useState<string | null>(null)
  const [userEarnings, setUserEarnings] = useState(0)
  const [isProSubscriber, setIsProSubscriber] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    fetchUserData()
  }, [session, status, router])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setUserTier(data.designerTier || 'USER')
        setUserEarnings(data.totalEarnings || 0)
        setIsProSubscriber(data.designerTier === 'VIP_DESIGNER' || data.designerTier === 'VVIP_DESIGNER')
        
        // Try to load saved milestone preference
        const settingsResponse = await fetch('/api/seller/commission-settings/milestones')
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          if (settings.milestoneTemplate) {
            setSelectedTemplate(settings.milestoneTemplate)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/seller/commission-settings/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneTemplate: selectedTemplate })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Milestone template saved successfully!' })
        setTimeout(() => router.push('/seller/commission-settings'), 2000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save milestone template' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  const canUseTemplate = (templateId: string): boolean => {
    const template = MILESTONE_TEMPLATES.find(t => t.id === templateId)
    if (!template?.lockedForTier) return true
    
    // Check if user tier is in the allowed tiers
    const goldPlusTiers = ['GOLD_DESIGNER', 'VIP_DESIGNER', 'VVIP_DESIGNER']
    return goldPlusTiers.includes(userTier || '')
  }

  const getTemplate = (id: 'simple' | 'standard' | 'detailed'): MilestoneTemplate => {
    return MILESTONE_TEMPLATES.find(t => t.id === id)!
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  const selected = getTemplate(selectedTemplate)
  const isLocked = !canUseTemplate(selectedTemplate) && selectedTemplate === 'simple'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/seller/commission-settings"
            className="text-purple-600 hover:text-purple-700 text-sm mb-3 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💳 Payment Milestone Templates
          </h1>
          <p className="text-gray-600">
            Choose how your commission payments are divided across milestones. This applies to all new commissions.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">💡 How it works:</p>
            <p>Your chosen template will be used for all new commissions. Funds are released to you as each milestone is approved by the buyer. The 14-day auto-release safety net applies if the buyer doesn't respond.</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {MILESTONE_TEMPLATES.map((template) => {
            const isSelected = selectedTemplate === template.id
            const isDisabled = !canUseTemplate(template.id)

            return (
              <button
                key={template.id}
                onClick={() => {
                  if (!isDisabled) {
                    setSelectedTemplate(template.id as 'simple' | 'standard' | 'detailed')
                  }
                }}
                disabled={isDisabled}
                className={`relative rounded-lg border-2 p-6 text-left transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 shadow-lg'
                    : isDisabled
                      ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                {/* Recommended Badge */}
                {template.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    RECOMMENDED
                  </div>
                )}

                {/* Locked Badge */}
                {isDisabled && (
                  <div className="absolute top-3 right-3 bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    GOLD+ ONLY
                  </div>
                )}

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-purple-600 text-white h-6 w-6 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}

                {/* Icon & Title */}
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <p className="text-xs text-gray-600">{template.description}</p>
                  </div>
                </div>

                {/* Risk Level */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-gray-700">Risk Level:</span>
                    <div className="flex gap-1">
                      {template.riskLevel === 'high' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">High</span>
                      )}
                      {template.riskLevel === 'medium' && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">Medium</span>
                      )}
                      {template.riskLevel === 'low' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Low</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-2 mb-4">
                  {template.milestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="text-gray-700">{milestone.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{milestone.percentage}%</span>
                    </div>
                  ))}
                </div>

                {/* Best For */}
                <p className="text-xs text-gray-600 italic">{template.bestFor}</p>
              </button>
            )
          })}
        </div>

        {/* Selected Template Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            📊 {selected.name} - Payment Timeline
          </h2>

          <div className="space-y-4 mb-8">
            {selected.milestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  idx === 0
                    ? 'border-l-amber-500 bg-amber-50'
                    : idx === selected.milestones.length - 1
                      ? 'border-l-green-500 bg-green-50'
                      : 'border-l-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Milestone {idx + 1}: {milestone.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {idx === 0
                        ? 'Released immediately when you confirm you\'re starting work'
                        : idx === selected.milestones.length - 1
                          ? 'Released when buyer approves final delivery'
                          : `Released when buyer approves this milestone`}
                    </p>
                    {idx === 0 && (
                      <p className="text-xs text-amber-700 font-medium mt-2">
                        ⚠️ This deposit is <span className="underline">non-refundable</span> if buyer cancels after this milestone
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">{milestone.percentage}%</div>
                    {idx === selected.milestones.length - 1 && (
                      <div className="text-xs text-green-700 font-medium mt-1">✅ Final Payment</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Example with Numbers */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4">💰 Example: $500 Commission</h3>
            <div className="space-y-2">
              {selected.milestones.map((milestone, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-700">{milestone.name} ({milestone.percentage}%):</span>
                  <span className="font-bold text-gray-900">${(500 * milestone.percentage) / 100}</span>
                </div>
              ))}
              <div className="border-t border-purple-300 pt-2 mt-2 flex justify-between font-bold">
                {(() => {
                  const feeRate = getCommissionRate(userEarnings, isProSubscriber)
                  const feePercent = Math.round(feeRate * 100)
                  const platformFee = 500 * feeRate
                  const earnings = 500 - platformFee
                  return (
                    <>
                      <span className="text-gray-900">Your Earnings (after {feePercent}% fee):</span>
                      <span className="text-green-600">${earnings.toFixed(2)}</span>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Tier Lock Info */}
        {selectedTemplate === 'simple' && userTier !== 'GOLD_DESIGNER' && userTier !== 'VIP_DESIGNER' && userTier !== 'VVIP_DESIGNER' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex gap-3">
            <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">🔒 Simple Template (50/50) - GOLD Designer Tier & Above</p>
              <p>This template is only available for GOLD Designer tier and above (VIP Designer, VVIP Designer). Your current tier is <strong>{userTier || 'DESIGNER'}</strong>. The 50/50 split requires you to wait until final approval to get your second payment, which is higher risk. Upgrade your tier or choose Standard or Detailed instead.</p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving || (selectedTemplate === 'simple' && !canUseTemplate('simple'))}
            className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save as My Default Template
              </>
            )}
          </button>
          <Link
            href="/seller/commission-settings"
            className="py-3 px-6 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
