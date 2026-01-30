'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle, AlertCircle, Loader2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReturnAddress {
  name: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postalCode: string
}

export default function BoutiqueSettingsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [returnAddress, setReturnAddress] = useState<ReturnAddress>({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchSettings()
  }, [session, authStatus, router])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/seller/boutique/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.returnAddress) {
          setReturnAddress(data.returnAddress)
        }
      }
    } catch (error) {
      console.error('Failed to fetch boutique settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setReturnAddress(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    // Validate all fields are filled
    if (!returnAddress.name || !returnAddress.phone || !returnAddress.address || 
        !returnAddress.city || !returnAddress.state || !returnAddress.country || !returnAddress.postalCode) {
      toast.error('Please fill in all address fields')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/seller/boutique/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnAddress }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Return address saved successfully' })
        toast.success('Return address saved')
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save' })
        toast.error(data.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/seller/boutique" className="p-1.5 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-0.5">Return shipping address</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Return Address Section */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
          <div className="flex items-start gap-2 mb-4">
            <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Return Address</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Used for rejected product returns. Courier will pick up from here.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs sm:text-sm">
            <p className="text-blue-800">
              <strong>Important:</strong> You pay return shipping costs. Returns must be completed within 7 days.
            </p>
          </div>

          {/* Form Grid */}
          <div className="space-y-3">
            {/* Name and Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={returnAddress.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={returnAddress.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                />
              </div>
            </div>

            {/* Address Row */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Street Address *
              </label>
              <input
                type="text"
                name="address"
                value={returnAddress.address}
                onChange={handleInputChange}
                placeholder="123 Main Street"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
              />
            </div>

            {/* City, State, Country Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={returnAddress.city}
                  onChange={handleInputChange}
                  placeholder="New York"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  State/Province *
                </label>
                <input
                  type="text"
                  name="state"
                  value={returnAddress.state}
                  onChange={handleInputChange}
                  placeholder="NY"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Postal Code *
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={returnAddress.postalCode}
                  onChange={handleInputChange}
                  placeholder="10001"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                />
              </div>
            </div>

            {/* Country Row */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Country *
              </label>
              <input
                type="text"
                name="country"
                value={returnAddress.country}
                onChange={handleInputChange}
                placeholder="United States"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition font-medium"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 sm:p-6 border border-purple-200">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-3">How It Works</h3>
          <ol className="space-y-2 text-xs sm:text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-semibold text-purple-600 flex-shrink-0">1.</span>
              <span>Admin rejects product after verification</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-purple-600 flex-shrink-0">2.</span>
              <span>You receive email with rejection reason and pickup date</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-purple-600 flex-shrink-0">3.</span>
              <span>Prepare product for return at this address</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-purple-600 flex-shrink-0">4.</span>
              <span>Courier picks up on scheduled date</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-purple-600 flex-shrink-0">5.</span>
              <span><strong>You pay</strong> return shipping costs</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-purple-600 flex-shrink-0">6.</span>
              <span>Complete within 7 days of pickup date</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
