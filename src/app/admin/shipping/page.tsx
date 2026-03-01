'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Edit, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react'

interface ShippingZone {
  id: string
  name: string
  countries: string[]
  baseRate: number
  perItemRate: number
  processingDays: number
  isActive: boolean
}

interface Carrier {
  id: string
  name: string
  apiKey: string
  baseURL: string
  isActive: boolean
  supportedCountries: string[]
}

interface ShippingRate {
  id: string
  zoneId: string
  weightMin: number
  weightMax: number
  rate: number
  estimatedDays: number
}

export default function AdminShippingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'zones' | 'carriers' | 'rates'>('zones')
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [showCarrierForm, setShowCarrierForm] = useState(false)
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null)
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null)

  // Form states
  const [zoneName, setZoneName] = useState('')
  const [zoneCountries, setZoneCountries] = useState('')
  const [baseRate, setBaseRate] = useState('')
  const [perItemRate, setPerItemRate] = useState('')
  const [processingDays, setProcessingDays] = useState('')

  const [carrierName, setCarrierName] = useState('')
  const [carrierApiKey, setCarrierApiKey] = useState('')
  const [carrierBaseURL, setCarrierBaseURL] = useState('')

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

    fetchShippingData()
  }, [status, session, router])

  const fetchShippingData = async () => {
    try {
      setLoading(true)
      const [zonesRes, carriersRes, ratesRes] = await Promise.all([
        fetch('/api/admin/shipping/zones'),
        fetch('/api/admin/shipping/carriers'),
        fetch('/api/admin/shipping/rates'),
      ])

      if (zonesRes.ok) {
        const data = await zonesRes.json()
        setZones(data.zones || [])
      }
      if (carriersRes.ok) {
        const data = await carriersRes.json()
        setCarriers(data.carriers || [])
      }
      if (ratesRes.ok) {
        const data = await ratesRes.json()
        setRates(data.rates || [])
      }
    } catch (error) {
      console.error('Failed to fetch shipping data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateZone = async () => {
    if (!zoneName || !zoneCountries || !baseRate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/admin/shipping/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: zoneName,
          countries: zoneCountries.split(',').map(c => c.trim()),
          baseRate: parseFloat(baseRate),
          perItemRate: parseFloat(perItemRate || '0'),
          processingDays: parseInt(processingDays || '5'),
        }),
      })

      if (response.ok) {
        await fetchShippingData()
        setShowZoneForm(false)
        setZoneName('')
        setZoneCountries('')
        setBaseRate('')
        setPerItemRate('')
        setProcessingDays('')
      }
    } catch (error) {
      console.error('Failed to create zone:', error)
    }
  }

  const handleCreateCarrier = async () => {
    if (!carrierName || !carrierApiKey) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/admin/shipping/carriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: carrierName,
          apiKey: carrierApiKey,
          baseURL: carrierBaseURL,
        }),
      })

      if (response.ok) {
        await fetchShippingData()
        setShowCarrierForm(false)
        setCarrierName('')
        setCarrierApiKey('')
        setCarrierBaseURL('')
      }
    } catch (error) {
      console.error('Failed to create carrier:', error)
    }
  }

  const handleDeleteZone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipping zone?')) return

    try {
      const response = await fetch(`/api/admin/shipping/zones/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchShippingData()
      }
    } catch (error) {
      console.error('Failed to delete zone:', error)
    }
  }

  const handleDeleteCarrier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this carrier?')) return

    try {
      const response = await fetch(`/api/admin/shipping/carriers/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchShippingData()
      }
    } catch (error) {
      console.error('Failed to delete carrier:', error)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading shipping configuration...</div>
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600">Access Denied</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shipping Configuration</h1>
            <p className="text-gray-600">Manage shipping zones, rates, and carriers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-2 border-b-2 font-medium transition ${
              activeTab === 'zones'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Zones ({zones.length})
          </button>
          <button
            onClick={() => setActiveTab('carriers')}
            className={`px-4 py-2 border-b-2 font-medium transition ${
              activeTab === 'carriers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Carriers ({carriers.length})
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2 border-b-2 font-medium transition ${
              activeTab === 'rates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Rates ({rates.length})
          </button>
        </div>

        {/* Zones Tab */}
        {activeTab === 'zones' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Shipping Zones</h2>
              <button
                onClick={() => setShowZoneForm(!showZoneForm)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Zone
              </button>
            </div>

            {showZoneForm && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Create New Zone</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Zone Name (e.g., 'USA - Continental')"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  <input
                    type="text"
                    placeholder="Countries (comma-separated, e.g., 'US, CA, MX')"
                    value={zoneCountries}
                    onChange={(e) => setZoneCountries(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Base Rate ($)"
                      value={baseRate}
                      onChange={(e) => setBaseRate(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-black"
                    />
                    <input
                      type="number"
                      placeholder="Per Item Rate ($)"
                      value={perItemRate}
                      onChange={(e) => setPerItemRate(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-black"
                    />
                  </div>
                  <input
                    type="number"
                    placeholder="Processing Days"
                    value={processingDays}
                    onChange={(e) => setProcessingDays(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowZoneForm(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateZone}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Create Zone
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {zones.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No shipping zones configured</p>
                </div>
              ) : (
                zones.map((zone) => (
                  <div key={zone.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Countries: {zone.countries.join(', ')}
                        </p>
                        <div className="flex gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-600">Base Rate</p>
                            <p className="font-semibold text-indigo-600">${zone.baseRate.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Per Item</p>
                            <p className="font-semibold text-indigo-600">${zone.perItemRate.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Processing Days</p>
                            <p className="font-semibold">{zone.processingDays}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          zone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {zone.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Carriers Tab */}
        {activeTab === 'carriers' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Shipping Carriers</h2>
              <button
                onClick={() => setShowCarrierForm(!showCarrierForm)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Carrier
              </button>
            </div>

            {showCarrierForm && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Add Shipping Carrier</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Carrier Name (e.g., 'FedEx', 'DHL')"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  <input
                    type="text"
                    placeholder="API Key"
                    value={carrierApiKey}
                    onChange={(e) => setCarrierApiKey(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  <input
                    type="text"
                    placeholder="Base URL"
                    value={carrierBaseURL}
                    onChange={(e) => setCarrierBaseURL(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowCarrierForm(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCarrier}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Add Carrier
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {carriers.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No carriers configured</p>
                </div>
              ) : (
                carriers.map((carrier) => (
                  <div key={carrier.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{carrier.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Supported Countries: {carrier.supportedCountries.join(', ') || 'All'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">API Key: {carrier.apiKey.substring(0, 10)}...</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          carrier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {carrier.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteCarrier(carrier.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Rates Tab */}
        {activeTab === 'rates' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Shipping Rates</h2>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Zone</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Weight Range</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Rate</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Est. Days</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No shipping rates configured
                        </td>
                      </tr>
                    ) : (
                      rates.map((rate) => {
                        const zone = zones.find(z => z.id === rate.zoneId)
                        return (
                          <tr key={rate.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900 font-medium">{zone?.name}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {rate.weightMin} - {rate.weightMax} lbs
                            </td>
                            <td className="px-4 py-3 text-gray-900 font-semibold">${rate.rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-gray-600">{rate.estimatedDays} days</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button className="p-1 hover:bg-gray-200 rounded transition">
                                  <Edit className="w-4 h-4 text-gray-600" />
                                </button>
                                <button className="p-1 hover:bg-red-50 rounded transition">
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

