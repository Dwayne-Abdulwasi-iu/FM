'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Check, X, Truck } from 'lucide-react'

interface ShipmentProduct {
  id: string
  title: string
  warehouseReceivedAt: string | null
}

interface Seller {
  id: string
  email: string
  name: string | null
}

interface Shipment {
  id: string
  productIds: string[]
  status: string
  createdAt: string
  itemsExpected: number
  products: ShipmentProduct[]
  seller: Seller
}

interface ReturnRequest {
  shipment: Shipment
  daysInWarehouse: number
  adminFeePerVariant: number
}

export default function WarehouseReturnsPage() {
  const [requests, setRequests] = useState<ReturnRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('PENDING_ADMIN_REVIEW')

  const [approvingProductId, setApprovingProductId] = useState<string | null>(null)
  const [approveNotes, setApproveNotes] = useState('')
  const [approving, setApproving] = useState(false)

  const [rejectingProductId, setRejectingProductId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [shippingProductId, setShippingProductId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [estimatedDelivery, setEstimatedDelivery] = useState('')
  const [shipping, setShipping] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmingProductId, setConfirmingProductId] = useState<string | null>(null)

  // Store product IDs array for batch operations
  const [currentShipmentProductIds, setCurrentShipmentProductIds] = useState<string[]>([])

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/boutique/admin/warehouse-returns-pending')
      if (!res.ok) throw new Error('Failed to fetch returns')
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load warehouse returns')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleApprove = async (productIds: string[]) => {
    try {
      setApproving(true)
      
      // Approve all products in shipment
      const results = await Promise.allSettled(
        productIds.map(productId =>
          fetch('/api/boutique/admin/approve-return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, notes: approveNotes })
          })
        )
      )

      // Check for failures
      const failures: string[] = []
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'rejected') {
          failures.push(`Product ${i + 1}: ${result.reason}`)
        } else {
          const res = result.value
          if (!res.ok) {
            const err = await res.json()
            failures.push(`Product ${i + 1}: ${err.error || 'Failed to approve'}`)
          }
        }
      }

      if (failures.length > 0) {
        throw new Error(failures.join('; '))
      }

      toast.success('Return approved. Seller notified.')
      setApprovingProductId(null)
      setApproveNotes('')
      await fetchRequests()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (productIds: string[]) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      setRejecting(true)
      
      // Reject all products in shipment
      const results = await Promise.allSettled(
        productIds.map(productId =>
          fetch('/api/boutique/admin/reject-return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, reason: rejectReason })
          })
        )
      )

      // Check for failures
      const failures: string[] = []
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'rejected') {
          failures.push(`Product ${i + 1}: ${result.reason}`)
        } else {
          const res = result.value
          if (!res.ok) {
            const err = await res.json()
            failures.push(`Product ${i + 1}: ${err.error || 'Failed to reject'}`)
          }
        }
      }

      if (failures.length > 0) {
        throw new Error(failures.join('; '))
      }

      toast.success('Return rejected. Seller notified.')
      setRejectingProductId(null)
      setRejectReason('')
      await fetchRequests()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject')
    } finally {
      setRejecting(false)
    }
  }

  const handleShip = async (productIds: string[]) => {
    try {
      setShipping(true)
      
      // Ship all products in shipment
      const results = await Promise.allSettled(
        productIds.map(productId =>
          fetch('/api/boutique/admin/ship-return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              trackingNumber: trackingNumber || undefined,
              carrier: carrier || undefined,
              estimatedDelivery: estimatedDelivery || undefined
            })
          })
        )
      )

      // Check for failures
      const failures: string[] = []
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'rejected') {
          failures.push(`Product ${i + 1}: ${result.reason}`)
        } else {
          const res = result.value
          if (!res.ok) {
            const err = await res.json()
            failures.push(`Product ${i + 1}: ${err.error || 'Failed to ship'}`)
          }
        }
      }

      if (failures.length > 0) {
        throw new Error(failures.join('; '))
      }

      toast.success('Return shipped. Seller notified.')
      setShippingProductId(null)
      setTrackingNumber('')
      setCarrier('')
      setEstimatedDelivery('')
      await fetchRequests()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to ship')
    } finally {
      setShipping(false)
    }
  }

  const handleConfirm = async (productIds: string[]) => {
    try {
      setConfirming(true)
      
      // Confirm all products in shipment
      const results = await Promise.allSettled(
        productIds.map(productId =>
          fetch(`/api/boutique/admin/returned/${productId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
        )
      )

      // Check for failures
      const failures: string[] = []
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'rejected') {
          failures.push(`Product ${i + 1}: ${result.reason}`)
        } else {
          const res = result.value
          if (!res.ok) {
            const err = await res.json()
            failures.push(`Product ${i + 1}: ${err.message || 'Failed to confirm'}`)
          }
        }
      }

      if (failures.length > 0) {
        throw new Error(failures.join('; '))
      }

      toast.success('Return completed and confirmed.')
      setConfirmingProductId(null)
      await fetchRequests()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to confirm')
    } finally {
      setConfirming(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING_ADMIN_REVIEW': 'bg-yellow-100 text-yellow-800',
      'APPROVED_BY_ADMIN': 'bg-blue-100 text-blue-800',
      'SHIPPED_BY_ADMIN': 'bg-green-100 text-green-800',
      'RECEIVED_BY_SELLER': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) =>
    status
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')

  const filtered = requests.filter(r => r.shipment.status === filterStatus)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black">Warehouse Returns</h1>
        <p className="text-gray-800 mt-2">Manage seller warehouse return requests and shipments</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['PENDING_ADMIN_REVIEW', 'APPROVED_BY_ADMIN', 'SHIPPED_BY_ADMIN', 'RECEIVED_BY_SELLER', 'COMPLETED'].map(
          status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded font-medium text-sm transition ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {getStatusLabel(status)}
            </button>
          )
        )}
      </div>

      {/* Returns List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-lg p-6 text-center text-gray-800">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center text-gray-800">
            No returns found for this status
          </div>
        ) : (
          filtered.map(request => (
            <div key={request.shipment.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-black">{request.shipment.products.length} Item{request.shipment.products.length !== 1 ? 's' : ''} in Shipment</h3>
                      <div className="mt-1 text-sm text-gray-800">
                        {request.shipment.products.map(p => p.title).join(', ')}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.shipment.status)}`}>
                      {getStatusLabel(request.shipment.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-2">
                    Seller: {request.shipment.seller.name || 'Unknown'} ({request.shipment.seller.email})
                  </p>
                </div>
              </div>

              {/* Fee Info */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 mb-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-800">Days in Warehouse</p>
                    <p className="text-2xl font-bold text-orange-600">{request.daysInWarehouse}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">Admin Fee</p>
                    <p className="text-2xl font-bold text-orange-600">{request.adminFeePerVariant} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">Items Expected</p>
                    <p className="text-2xl font-bold text-orange-600">{request.shipment.itemsExpected}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mt-3">
                  Fee: {request.daysInWarehouse <= 119 ? '2 units (Days 0-119)' : '1 unit (Days 120-180)'}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {request.shipment.status === 'PENDING_ADMIN_REVIEW' && (
                  <>
                    {approvingProductId === request.shipment.productIds[0] && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium mb-2 text-gray-900">Optional Notes</label>
                        <textarea
                          placeholder="Add any notes about this approval..."
                          value={approveNotes}
                          onChange={e => setApproveNotes(e.target.value)}
                          className="w-full p-2 border rounded text-sm mb-3"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setApprovingProductId(null)
                              setApproveNotes('')
                            }}
                            className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleApprove(currentShipmentProductIds)}
                            disabled={approving}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded text-sm flex items-center justify-center gap-2"
                          >
                            <Check size={14} />
                            {approving ? 'Approving...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}

                    {rejectingProductId === request.shipment.productIds[0] && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium mb-2 text-gray-900">Rejection Reason *</label>
                        <textarea
                          placeholder="Why are you rejecting this return?"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          className="w-full p-2 border rounded text-sm mb-3"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setRejectingProductId(null)
                              setRejectReason('')
                            }}
                            className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReject(currentShipmentProductIds)}
                            disabled={rejecting || !rejectReason.trim()}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded text-sm flex items-center justify-center gap-2"
                          >
                            <X size={14} />
                            {rejecting ? 'Rejecting...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}

                    {approvingProductId !== request.shipment.productIds[0] && rejectingProductId !== request.shipment.productIds[0] && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCurrentShipmentProductIds(request.shipment.productIds)
                            setApprovingProductId(request.shipment.productIds[0])
                          }}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded flex items-center justify-center gap-2"
                          disabled={approving}
                        >
                          <Check size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setCurrentShipmentProductIds(request.shipment.productIds)
                            setRejectingProductId(request.shipment.productIds[0])
                          }}
                          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded flex items-center justify-center gap-2"
                          disabled={rejecting}
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </div>
                    )}
                  </>
                )}

                {request.shipment.status === 'APPROVED_BY_ADMIN' && (
                  <>
                    {shippingProductId === request.shipment.productIds[0] && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium mb-2 text-gray-900">Carrier (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g., DHL, FedEx, UPS"
                          value={carrier}
                          onChange={e => setCarrier(e.target.value)}
                          className="w-full p-2 border rounded text-sm mb-3"
                        />
                        <label className="block text-sm font-medium mb-2 text-gray-900">Tracking Number (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g., 1234567890"
                          value={trackingNumber}
                          onChange={e => setTrackingNumber(e.target.value)}
                          className="w-full p-2 border rounded text-sm mb-3"
                        />
                        <label className="block text-sm font-medium mb-2 text-gray-900">Estimated Delivery (Optional)</label>
                        <input
                          type="date"
                          value={estimatedDelivery}
                          onChange={e => setEstimatedDelivery(e.target.value)}
                          className="w-full p-2 border rounded text-sm mb-3"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShippingProductId(null)
                              setTrackingNumber('')
                              setCarrier('')
                              setEstimatedDelivery('')
                            }}
                            className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleShip(currentShipmentProductIds)}
                            disabled={shipping}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded text-sm flex items-center justify-center gap-2"
                          >
                            <Truck size={14} />
                            {shipping ? 'Shipping...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}

                    {shippingProductId !== request.shipment.productIds[0] && (
                      <button
                        onClick={() => {
                          setCurrentShipmentProductIds(request.shipment.productIds)
                          setShippingProductId(request.shipment.productIds[0])
                        }}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded flex items-center justify-center gap-2"
                        disabled={shipping}
                      >
                        <Truck size={16} />
                        Ship Return
                      </button>
                    )}
                  </>
                )}

                {request.shipment.status === 'RECEIVED_BY_SELLER' && (
                  <button
                    onClick={() => handleConfirm(request.shipment.productIds)}
                    disabled={confirming}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    {confirming ? 'Confirming...' : 'Confirm Complete'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
