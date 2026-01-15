'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Settings, Save, AlertCircle, CheckCircle, Loader2, Info, DollarSign, MessageSquare, Clock, Users } from 'lucide-react'
import Link from 'next/link'

interface CommissionSettings {
  acceptsCommissions: boolean
  commissionStatus: string
  commissionMinBudget: number | null
  commissionMaxBudget: number | null
  commissionTurnaround: string | null
  commissionTypes: string[]
  commissionTerms: string | null
  commissionQueueSize: number | null
}

const COMMISSION_TYPE_OPTIONS = [
  'Custom Patterns',
  'Alterations',
  'Full Design',
  'Sketch to Pattern',
  'Rush Orders',
  'Bulk Orders',
  'Matching Sets',
  'Kids Sizes',
  'Plus Sizes',
]

export default function CommissionSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [settings, setSettings] = useState<CommissionSettings>({
    acceptsCommissions: false,
    commissionStatus: 'CLOSED',
    commissionMinBudget: null,
    commissionMaxBudget: null,
    commissionTurnaround: null,
    commissionTypes: [],
    commissionTerms: null,
    commissionQueueSize: null,
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // Allow any authenticated user to access commission settings
    // The API will handle permissions if needed

    fetchSettings()
  }, [session, status, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/seller/commission-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch commission settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/seller/commission-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Commission settings saved successfully!' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  const toggleCommissionType = (type: string) => {
    setSettings(prev => ({
      ...prev,
      commissionTypes: prev.commissionTypes.includes(type)
        ? prev.commissionTypes.filter(t => t !== type)
        : [...prev.commissionTypes, type]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/seller/dashboard" className="text-purple-600 hover:text-purple-700 text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-purple-600" />
            Commission Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure how customers can request custom commissions from you
          </p>
        </div>

        {/* How Commissions Work Explanation */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-purple-800 flex items-center gap-2 mb-4">
            <Info className="h-5 w-5" />
            How Commissions Work
          </h2>
          
          <div className="space-y-4 text-sm text-purple-900">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center font-bold text-purple-700">1</div>
              <div>
                <p className="font-medium">You Enable Commissions</p>
                <p className="text-purple-700">Turn on commission availability to let buyers request custom work from you based on your design style.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center font-bold text-purple-700">2</div>
              <div>
                <p className="font-medium">Buyers Browse & Request</p>
                <p className="text-purple-700">Buyers see a &quot;Request Commission&quot; button on your designs. They submit their requirements and budget.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center font-bold text-purple-700">3</div>
              <div>
                <p className="font-medium">You Review & Accept</p>
                <p className="text-purple-700">Review commission requests in your dashboard. Accept, negotiate, or decline based on your availability.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center font-bold text-purple-700">4</div>
              <div>
                <p className="font-medium">Payment & Delivery</p>
                <p className="text-purple-700">Once you accept, the buyer pays upfront. You deliver the custom work, and funds are released to you.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center font-bold text-purple-700">5</div>
              <div>
                <p className="font-medium">Earn More Per Project</p>
                <p className="text-purple-700">Commission work typically earns more than standard sales. Set your own prices and work directly with clients.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white/60 rounded-lg border border-purple-200 text-center">
              <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-purple-800">Higher Earnings</p>
              <p className="text-[10px] text-purple-600">Set your own prices</p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg border border-purple-200 text-center">
              <MessageSquare className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-purple-800">Direct Communication</p>
              <p className="text-[10px] text-purple-600">Chat with clients</p>
            </div>
            <div className="p-3 bg-white/60 rounded-lg border border-purple-200 text-center">
              <Users className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-purple-800">Build Relationships</p>
              <p className="text-[10px] text-purple-600">Repeat customers</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
          {/* Accept Commissions Toggle */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Accept Commissions</h2>
                <p className="text-sm text-gray-600">
                  When enabled, customers can request custom work based on your designs
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.acceptsCommissions}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    acceptsCommissions: e.target.checked,
                    commissionStatus: e.target.checked ? 'OPEN' : 'CLOSED'
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Status */}
          {settings.acceptsCommissions && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Availability Status</h2>
              <div className="flex gap-3">
                {['OPEN', 'BUSY', 'CLOSED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSettings(prev => ({ ...prev, commissionStatus: status }))}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      settings.commissionStatus === status
                        ? status === 'OPEN'
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : status === 'BUSY'
                            ? 'bg-amber-100 border-amber-500 text-amber-700'
                            : 'bg-red-100 border-red-500 text-red-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {status === 'OPEN' && '🟢 '}
                    {status === 'BUSY' && '🟡 '}
                    {status === 'CLOSED' && '🔴 '}
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Open: Accepting new requests • Busy: Temporarily not accepting • Closed: Not available
              </p>
            </div>
          )}

          {/* Budget Range */}
          {settings.acceptsCommissions && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Budget Range (USD)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Minimum</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.commissionMinBudget || ''}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      commissionMinBudget: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    placeholder="e.g., 50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Maximum</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.commissionMaxBudget || ''}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      commissionMaxBudget: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    placeholder="e.g., 500"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This helps customers know your typical pricing range
              </p>
            </div>
          )}

          {/* Turnaround Time */}
          {settings.acceptsCommissions && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Typical Turnaround</h2>
              <input
                type="text"
                value={settings.commissionTurnaround || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, commissionTurnaround: e.target.value || null }))}
                placeholder="e.g., 2-3 weeks"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
          )}

          {/* Commission Types */}
          {settings.acceptsCommissions && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Commission Types You Offer</h2>
              <div className="flex flex-wrap gap-2">
                {COMMISSION_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleCommissionType(type)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      settings.commissionTypes.includes(type)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Queue Size */}
          {settings.acceptsCommissions && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Queue Size (Optional)</h2>
              <input
                type="number"
                min="1"
                value={settings.commissionQueueSize || ''}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  commissionQueueSize: e.target.value ? parseInt(e.target.value) : null 
                }))}
                placeholder="e.g., 5 commissions at a time"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
              />
              <p className="text-xs text-gray-500 mt-2">
                Maximum number of active commissions you&apos;ll take at once
              </p>
            </div>
          )}

          {/* Terms */}
          {settings.acceptsCommissions && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Commission Terms (Optional)</h2>
              <textarea
                value={settings.commissionTerms || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, commissionTerms: e.target.value || null }))}
                placeholder="Any specific terms, conditions, or notes for potential commissioners..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white resize-none"
              />
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
