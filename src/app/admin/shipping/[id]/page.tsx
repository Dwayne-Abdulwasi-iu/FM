'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, _X, Plus, Trash2 } from 'lucide-react'

interface ShippingZone {
  id: string
  name: string
  countries: string[]
  baseRate: number
  perItemRate: number
  processingDays: number
  isActive: boolean
  rates: Array<{
    id: string
    weightMin: number
    weightMax: number
    rate: number
    estimatedDays: number
  }>
}

export default function ShippingZoneDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const zoneId = params.id as string

  const [zone, setZone] = useState<ShippingZone | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [countries, setCountries] = useState('')
  const [baseRate, setBaseRate] = useState('')
  const [perItemRate, setPerItemRate] = useState('')
  const [processingDays, setProcessingDays] = useState('')
  const [isActive, setIsActive] = useState(false)

  // Rate form
  const [showRateForm, setShowRateForm] = useState(false)
  const [rateWeightMin, setRateWeightMin] = useState('')
  const [rateWeightMax, setRateWeightMax] = useState('')
  const [ratePrice, setRatePrice] = useState('')
  const [rateEstDays, setRateEstDays] = useState('')
  const [rates, setRates] = useState<ShippingZone['rates']>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (session?.user?.role !== 'ADMIN') {
      router.push('/admin')
      return
    }
    if (status !== 'authenticated') return

    fetchZoneDetail()
  }, [status, session, router])

  const fetchZoneDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/shipping/zones/${zoneId}`)
      if (response.ok) {
        const data = await response.json()
        const z = data.zone
        setZone(z)
        setName(z.name)
        setCountries(z.countries.join(', '))
        setBaseRate(z.baseRate.toString())
        setPerItemRate(z.perItemRate.toString())
        setProcessingDays(z.processingDays.toString())
        setIsActive(z.isActive)
        setRates(z.rates)
      }
    } catch (error) {
      console.error('Failed to fetch zone:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name || !countries || !baseRate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/shipping/zones/${zoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          countries: countries.split(',').map(c => c.trim()),
          baseRate: parseFloat(baseRate),
          perItemRate: parseFloat(perItemRate || '0'),
          processingDays: parseInt(processingDays || '5'),
          isActive,
        }),
      })

      if (response.ok) {
        await fetchZoneDetail()
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to save zone:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddRate = async () => {
    if (!rateWeightMin || !rateWeightMax || !ratePrice) {
      alert('Please fill in all rate fields')
      return
    }

    try {
      const response = await fetch(`/api/admin/shipping/zones/${zoneId}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weightMin: parseFloat(rateWeightMin),
          weightMax: parseFloat(rateWeightMax),
          rate: parseFloat(ratePrice),
          estimatedDays: parseInt(rateEstDays || '5'),
        }),
      })

      if (response.ok) {
        setRateWeightMin('')
        setRateWeightMax('')
        setRatePrice('')
        setRateEstDays('')
        setShowRateForm(false)
        await fetchZoneDetail()
      }
    } catch (error) {
      console.error('Failed to add rate:', error)
    }
  }

  const handleDeleteRate = async (rateId: string) => {
    if (!confirm('Delete this rate?')) return

    try {
      const response = await fetch(`/api/admin/shipping/zones/${zoneId}/rates/${rateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchZoneDetail()
      }
    } catch (error) {
      console.error('Failed to delete rate:', error)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading zone details...</div>
  }

  if (!zone) {
    return <div className="p-8 text-center text-red-600">Zone not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link href="/admin/shipping" className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Shipping Zone</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{zone.name}</p>
          </div>
        </div>

        {/* Zone Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Zone Configuration</h2>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {editMode ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Zone Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Zone name"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Countries (comma-separated) *</label>
                  <input
                    type="text"
                    value={countries}
                    onChange={(e) => setCountries(e.target.value)}
                    aria-label="Countries list"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                    placeholder="US, CA, MX"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Base Rate ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={baseRate}
                      onChange={(e) => setBaseRate(e.target.value)}
                      aria-label="Base rate"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Per Item ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={perItemRate}
                      onChange={(e) => setPerItemRate(e.target.value)}
                      aria-label="Per item rate"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Processing Days</label>
                    <input
                      type="number"
                      value={processingDays}
                      onChange={(e) => setProcessingDays(e.target.value)}
                      aria-label="Processing days"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-900">
                    Active Zone
                  </label>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-600">Zone Name</p>
                  <p className="text-lg font-semibold text-gray-900">{zone.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Countries</p>
                  <p className="text-lg font-semibold text-gray-900">{zone.countries.join(', ')}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Base Rate</p>
                    <p className="text-lg font-semibold text-gray-900">${zone.baseRate.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Per Item</p>
                    <p className="text-lg font-semibold text-gray-900">${zone.perItemRate.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Processing Days</p>
                    <p className="text-lg font-semibold text-gray-900">{zone.processingDays}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    zone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Weight-Based Rates */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Weight-Based Rates</h2>
            {!showRateForm && (
              <button
                onClick={() => setShowRateForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Rate
              </button>
            )}
          </div>

          {showRateForm && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Min Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rateWeightMin}
                    onChange={(e) => setRateWeightMin(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Max Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rateWeightMax}
                    onChange={(e) => setRateWeightMax(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ratePrice}
                    onChange={(e) => setRatePrice(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Est. Days</label>
                  <input
                    type="number"
                    value={rateEstDays}
                    onChange={(e) => setRateEstDays(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRate}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Rate
                </button>
              </div>
            </div>
          )}

          {/* Rates Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Weight Range</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Rate</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Est. Days</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No rates configured
                    </td>
                  </tr>
                ) : (
                  rates.map((rate) => (
                    <tr key={rate.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {rate.weightMin} - {rate.weightMax} lbs
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">${rate.rate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{rate.estimatedDays} days</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteRate(rate.id)}
                          className="p-1 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
