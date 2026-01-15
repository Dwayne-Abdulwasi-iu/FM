'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Package, Save, AlertCircle, CheckCircle, Loader2, Info, DollarSign, Truck, Settings, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface PODSettings {
  acceptsPOD: boolean
  podDefaultMarkup: number
  podAutoApprove: boolean
}

export default function PODSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [settings, setSettings] = useState<PODSettings>({
    acceptsPOD: false,
    podDefaultMarkup: 20,
    podAutoApprove: true,
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchSettings()
  }, [session, status, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/seller/pod-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch POD settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/seller/pod-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'POD settings saved successfully!' })
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/seller/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-orange-600" />
            Print-on-Demand Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure your Print-on-Demand (POD) availability and preferences
          </p>
        </div>

        {/* How POD Works Explanation */}
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-orange-800 flex items-center gap-2 mb-4">
            <Info className="h-5 w-5" />
            How Print-on-Demand Works
          </h2>
          
          <div className="space-y-4 text-sm text-orange-900">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center font-bold text-orange-700">1</div>
              <div>
                <p className="font-medium">You Enable POD</p>
                <p className="text-orange-700">Turn on POD availability to let buyers purchase your designs on physical products like t-shirts, mugs, hoodies, and more.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center font-bold text-orange-700">2</div>
              <div>
                <p className="font-medium">Configure Products</p>
                <p className="text-orange-700">Use the <Link href="/seller/pod-setup" className="underline font-medium">POD Setup Wizard</Link> to select which products you want to offer and set your markup prices.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center font-bold text-orange-700">3</div>
              <div>
                <p className="font-medium">Buyers See Physical Products</p>
                <p className="text-orange-700">When viewing your designs, buyers will see an option to purchase physical products with your design printed on them.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center font-bold text-orange-700">4</div>
              <div>
                <p className="font-medium">Automatic Fulfillment</p>
                <p className="text-orange-700">When an order is placed, our POD partners (Printful/Printify) automatically print and ship the product directly to the buyer.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center font-bold text-orange-700">5</div>
              <div>
                <p className="font-medium">You Earn Your Markup</p>
                <p className="text-orange-700">You receive your markup profit automatically. No inventory, no shipping hassles!</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white/60 rounded-lg border border-orange-200">
            <p className="text-xs text-orange-800">
              <strong>💡 Example:</strong> If a t-shirt costs $15 base price and you set a 25% markup, 
              the buyer pays $18.75. You earn $3.75 profit per sale, minus platform commission.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Enable POD Toggle */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Enable Print-on-Demand
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Allow buyers to purchase your designs on physical products
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.acceptsPOD}
                  onChange={(e) => setSettings({ ...settings, acceptsPOD: e.target.checked })}
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700">
                  {settings.acceptsPOD ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
            
            {/* Status Indicator */}
            <div className={`mt-4 p-3 rounded-lg ${settings.acceptsPOD ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              {settings.acceptsPOD ? (
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  POD is enabled. Buyers can purchase physical products with your designs.
                </p>
              ) : (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  POD is disabled. Enable it to start offering physical products.
                </p>
              )}
            </div>
          </div>

          {/* Additional Settings (shown when POD is enabled) */}
          {settings.acceptsPOD && (
            <>
              {/* Default Markup */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Default Markup Percentage
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set your default profit margin on POD products. You can customize per-product in the POD setup wizard.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={settings.podDefaultMarkup}
                    onChange={(e) => setSettings({ ...settings, podDefaultMarkup: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="w-20 text-center">
                    <span className="text-2xl font-bold text-orange-600">{settings.podDefaultMarkup}%</span>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>5% (Low profit)</span>
                  <span>50% (Balanced)</span>
                  <span>100% (High profit)</span>
                </div>
              </div>

              {/* Auto Approve */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Settings className="h-5 w-5 text-blue-600" />
                      Auto-Approve Products
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Automatically make all your designs available for POD, or manually select which ones to offer.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.podAutoApprove}
                      onChange={(e) => setSettings({ ...settings, podAutoApprove: e.target.checked })}
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-6 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href="/seller/pod-setup"
                    className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <Package className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-gray-900">POD Setup Wizard</p>
                      <p className="text-xs text-gray-500">Configure products for your designs</p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto text-gray-400" />
                  </Link>
                  
                  <Link
                    href="/seller/dashboard"
                    className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <Truck className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="font-medium text-gray-900">View POD Orders</p>
                      <p className="text-xs text-gray-500">Track physical product orders</p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto text-gray-400" />
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="p-6 bg-white border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save POD Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-700">
            Our POD service integrates with Printful and Printify, giving you access to hundreds of products.
            Check out our <Link href="/help" className="underline font-medium">Help Center</Link> for tutorials 
            and tips on maximizing your POD earnings.
          </p>
        </div>
      </div>
    </div>
  )
}
