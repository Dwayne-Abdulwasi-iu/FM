'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  Send,
  Box,
  AlertCircle
} from 'lucide-react'

interface DeliveryAddress {
  name: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postalCode?: string
}

interface CommissionDelivery {
  id: string
  title: string
  description: string
  agreedPrice: number
  isPhysical: boolean
  deliveryStatus: string
  deliveryAddress: DeliveryAddress | null
  collectionAddress: DeliveryAddress | null
  collectionNotes: string | null
  trackingNumber: string | null
  courierName: string | null
  estimatedDeliveryDate: string | null
  readyForCollectionAt: string | null
  collectedAt: string | null
  shippedAt: string | null
  actualDeliveredAt: string | null
  deliveryConfirmedAt: string | null
  requester: {
    id: string
    name: string | null
    email: string
  }
  designer: {
    id: string
    name: string | null
    displayName: string | null
    email: string
  }
  createdAt: string
}

interface StatusCounts {
  ready_for_collection: number
  collected: number
  in_transit: number
  delivered: number
  confirmed: number
}

const STATUS_COLORS: Record<string, string> = {
  READY_FOR_COLLECTION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COLLECTED_BY_ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_TRANSIT: 'bg-purple-100 text-purple-800 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
}

const STATUS_LABELS: Record<string, string> = {
  READY_FOR_COLLECTION: 'Ready for Collection',
  COLLECTED_BY_ADMIN: 'Collected by Admin',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
}

export default function AdminDeliveriesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [deliveries, setDeliveries] = useState<CommissionDelivery[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('READY_FOR_COLLECTION')
  const [selectedDelivery, setSelectedDelivery] = useState<CommissionDelivery | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Form state for actions
  const [trackingNumber, setTrackingNumber] = useState('')
  const [courierName, setCourierName] = useState('')
  const [estimatedDays, setEstimatedDays] = useState(3)
  const [collectionNotes, setCollectionNotes] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchDeliveries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router, activeTab])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/deliveries?status=${activeTab}`)
      if (response.ok) {
        const data = await response.json()
        setDeliveries(data.deliveries)
        setStatusCounts(data.statusCounts)
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string, deliveryId: string) => {
    try {
      setActionLoading(deliveryId)
      
      const body: Record<string, unknown> = { action }
      
      if (action === 'collect') {
        body.collectionNotes = collectionNotes
      }
      
      if (action === 'ship') {
        if (!trackingNumber.trim() || !courierName.trim()) {
          alert('Please provide tracking number and courier name')
          return
        }
        body.trackingNumber = trackingNumber
        body.courierName = courierName
        body.estimatedDeliveryDays = estimatedDays
      }
      
      const response = await fetch(`/api/admin/deliveries?id=${deliveryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (response.ok) {
        await fetchDeliveries()
        setSelectedDelivery(null)
        setTrackingNumber('')
        setCourierName('')
        setCollectionNotes('')
      } else {
        const error = await response.json()
        alert(error.error || 'Action failed')
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert('Failed to perform action')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'READY_FOR_COLLECTION', label: 'Ready for Collection', count: statusCounts?.ready_forcollection || 0, icon: Clock },
    { id: 'COLLECTED_BY_ADMIN', label: 'Collected', count: statusCounts?.collected || 0, icon: Box },
    { id: 'IN_TRANSIT', label: 'In Transit', count: statusCounts?.intransit || 0, icon: Truck },
    { id: 'DELIVERED', label: 'Delivered', count: statusCounts?.delivered || 0, icon: CheckCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/admin" className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Physical Deliveries</h1>
                <p className="text-xs sm:text-base text-gray-900">Manage physical commission deliveries</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Status Tabs */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-900 hover:bg-gray-100 border'
                }`}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                  activeTab === tab.id ? 'bg-pink-600' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Deliveries Grid */}
        {deliveries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
            <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-sm sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No deliveries</h3>
            <p className="text-xs sm:text-base text-gray-900">No physical commissions with this status</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Status Badge */}
                <div className={`px-3 sm:px-4 py-1.5 sm:py-2 ${STATUS_COLORS[delivery.deliveryStatus]} border-b`}>
                  <span className="font-medium text-xs sm:text-sm">
                    {STATUS_LABELS[delivery.deliveryStatus]}
                  </span>
                </div>
                
                {/* Content */}
                <div className="p-3 sm:p-4">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{delivery.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-900 mb-2 sm:mb-3 line-clamp-2">{delivery.description}</p>
                  
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <span className="text-gray-900">Client:</span>
                      <span className="font-medium text-gray-900 truncate">{delivery.requester.name || delivery.requester.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <span className="text-gray-900">Designer:</span>
                      <span className="font-medium text-gray-900 truncate">{delivery.designer.displayName || delivery.designer.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Package className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <span className="text-gray-900">Value:</span>
                      <span className="font-medium text-pink-600">{formatPrice(delivery.agreedPrice)}</span>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {delivery.deliveryAddress && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-1.5 sm:gap-2">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-pink-500 mt-0.5 sm:mt-1 flex-shrink-0" />
                        <div className="text-xs sm:text-sm">
                          <p className="font-medium text-gray-900">{delivery.deliveryAddress.name}</p>
                          <p className="text-gray-900">{delivery.deliveryAddress.address}</p>
                          <p className="text-gray-900">
                            {delivery.deliveryAddress.city}, {delivery.deliveryAddress.state}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span className="text-gray-900">{delivery.deliveryAddress.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Collection Address (for ready items) */}
                  {delivery.collectionAddress && delivery.deliveryStatus === 'READY_FOR_COLLECTION' && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-[10px] sm:text-xs font-medium text-yellow-800 mb-1">COLLECT FROM:</p>
                      <div className="text-xs sm:text-sm">
                        <p className="font-medium text-gray-900">{delivery.collectionAddress.name}</p>
                        <p className="text-gray-900">{delivery.collectionAddress.address}</p>
                        <p className="text-gray-900">
                          {delivery.collectionAddress.city}, {delivery.collectionAddress.state}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="text-gray-900">{delivery.collectionAddress.phone}</span>
                        </div>
                      </div>
                      {delivery.collectionNotes && (
                        <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-900 italic">
                          Note: {delivery.collectionNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tracking Info */}
                  {delivery.trackingNumber && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-[10px] sm:text-xs font-medium text-purple-800 mb-1">TRACKING</p>
                      <p className="font-mono text-xs sm:text-sm text-gray-900">{delivery.trackingNumber}</p>
                      <p className="text-[10px] sm:text-xs text-gray-900">via {delivery.courierName}</p>
                      {delivery.estimatedDeliveryDate && (
                        <p className="text-[10px] sm:text-xs text-gray-900 mt-1">
                          Est. delivery: {formatDate(delivery.estimatedDeliveryDate)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t text-[10px] sm:text-xs text-gray-900 space-y-0.5 sm:space-y-1">
                    {delivery.readyForCollectionAt && (
                      <p>Ready: {formatDate(delivery.readyForCollectionAt)}</p>
                    )}
                    {delivery.collectedAt && (
                      <p>Collected: {formatDate(delivery.collectedAt)}</p>
                    )}
                    {delivery.shippedAt && (
                      <p>Shipped: {formatDate(delivery.shippedAt)}</p>
                    )}
                    {delivery.actualDeliveredAt && (
                      <p>Delivered: {formatDate(delivery.actualDeliveredAt)}</p>
                    )}
                    {delivery.deliveryConfirmedAt && (
                      <p className="text-green-600">Confirmed: {formatDate(delivery.deliveryConfirmedAt)}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-t">
                  {delivery.deliveryStatus === 'READY_FOR_COLLECTION' && (
                    <button
                      onClick={() => setSelectedDelivery(delivery)}
                      disabled={actionLoading === delivery.id}
                      className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      <Box className="h-3 w-3 sm:h-4 sm:w-4" />
                      Mark as Collected
                    </button>
                  )}
                  
                  {delivery.deliveryStatus === 'COLLECTED_BY_ADMIN' && (
                    <button
                      onClick={() => setSelectedDelivery(delivery)}
                      disabled={actionLoading === delivery.id}
                      className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                      Ship Item
                    </button>
                  )}
                  
                  {delivery.deliveryStatus === 'IN_TRANSIT' && (
                    <button
                      onClick={() => handleAction('mark_delivered', delivery.id)}
                      disabled={actionLoading === delivery.id}
                      className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      {actionLoading === delivery.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      Mark as Delivered
                    </button>
                  )}
                  
                  {delivery.deliveryStatus === 'DELIVERED' && !delivery.deliveryConfirmedAt && (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-600">
                      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm">Awaiting client confirmation</span>
                    </div>
                  )}
                  
                  {delivery.deliveryConfirmedAt && (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-green-600">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm">Delivery confirmed by client</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collection Modal */}
      {selectedDelivery && selectedDelivery.deliveryStatus === 'READY_FOR_COLLECTION' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Collect Item</h3>
            <p className="text-xs sm:text-base text-gray-900 mb-3 sm:mb-4">
              Mark &quot;{selectedDelivery.title}&quot; as collected from the designer?
            </p>
            
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">
                Collection Notes (optional)
              </label>
              <textarea
                value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
                placeholder="Any notes about the collection..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-xs sm:text-sm text-gray-900"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setSelectedDelivery(null)}
                className="flex-1 px-3 sm:px-4 py-2 border rounded-lg hover:bg-gray-50 text-xs sm:text-sm text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('collect', selectedDelivery.id)}
                disabled={actionLoading === selectedDelivery.id}
                className="flex-1 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-xs sm:text-sm"
              >
                {actionLoading === selectedDelivery.id ? 'Collecting...' : 'Confirm Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ship Modal */}
      {selectedDelivery && selectedDelivery.deliveryStatus === 'COLLECTED_BY_ADMIN' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Ship Item</h3>
            <p className="text-xs sm:text-base text-gray-900 mb-3 sm:mb-4">
              Enter shipping details for &quot;{selectedDelivery.title}&quot;
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">
                  Courier / Shipping Company *
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g., GIG Logistics, DHL, FedEx"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-xs sm:text-sm text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-xs sm:text-sm text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">
                  Estimated Delivery (days)
                </label>
                <input
                  type="number"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(parseInt(e.target.value) || 3)}
                  min={1}
                  max={30}
                  placeholder="3"
                  title="Estimated number of days for delivery"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-xs sm:text-sm text-gray-900"
                />
              </div>
            </div>
            
            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => {
                  setSelectedDelivery(null)
                  setTrackingNumber('')
                  setCourierName('')
                }}
                className="flex-1 px-3 sm:px-4 py-2 border rounded-lg hover:bg-gray-50 text-xs sm:text-sm text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('ship', selectedDelivery.id)}
                disabled={actionLoading === selectedDelivery.id || !trackingNumber.trim() || !courierName.trim()}
                className="flex-1 px-3 sm:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-xs sm:text-sm"
              >
                {actionLoading === selectedDelivery.id ? 'Shipping...' : 'Confirm Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

