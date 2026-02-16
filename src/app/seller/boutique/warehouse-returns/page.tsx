'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { Truck, Check, X } from 'lucide-react'

interface ReturnRequest {
  id: string
  productId: string
  productTitle: string
  status: 'PENDING_ADMIN_REVIEW' | 'APPROVED_BY_ADMIN' | 'SHIPPED_BY_ADMIN' | 'RECEIVED_BY_SELLER' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  daysInWarehouse: number
  adminFeePerVariant: number
  shipmentId: string
  carrier?: string
  trackingNumber?: string
  estimatedDelivery?: string
}

const STEP_ORDER = ['PENDING_ADMIN_REVIEW', 'APPROVED_BY_ADMIN', 'SHIPPED_BY_ADMIN', 'RECEIVED_BY_SELLER', 'COMPLETED']

export default function WarehouseReturnsPage() {
  const { data: session } = useSession()
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [receiving, setReceiving] = useState(false)

  useEffect(() => {
    const fetchReturns = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/boutique/seller/warehouse-returns')
        if (!res.ok) throw new Error('Failed to fetch returns')
        const data = await res.json()
        setReturns(data.returns || [])
      } catch (error) {
        console.error('Fetch error:', error)
        toast.error('Failed to load warehouse returns')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user) {
      fetchReturns()
    }
  }, [session?.user])

  const handleCancel = async (returnId: string) => {
    try {
      setCanceling(true)
      // Extract productId from composite id (format: shipmentId-productId)
      const productId = returnId.split('-').pop()
      if (!productId) throw new Error('Invalid return ID')
      
      const res = await fetch('/api/boutique/seller/cancel-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      if (!res.ok) throw new Error('Failed to cancel')
      toast.success('Return request cancelled')
      setReturns(returns.filter(r => r.id !== returnId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel')
    } finally {
      setCanceling(false)
      setCancelingId(null)
    }
  }

  const handleMarkReceived = async (returnId: string) => {
    try {
      setReceiving(true)
      // Extract productId from composite id (format: shipmentId-productId)
      const productId = returnId.split('-').pop()
      if (!productId) throw new Error('Invalid return ID')
      
      const res = await fetch(`/api/boutique/seller/returned/${productId}/received`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Failed to mark as received')
      toast.success('Return marked as received')
      setReturns(
        returns.map(r =>
          r.id === returnId ? { ...r, status: 'RECEIVED_BY_SELLER' as const } : r
        )
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed')
    } finally {
      setReceiving(false)
      setReceivingId(null)
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

  const getStepIndex = (status: string) => STEP_ORDER.indexOf(status)

  if (!session?.user) {
    return (
      <div className="p-6 text-center text-gray-600">
        Please sign in to view your warehouse returns
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">Warehouse Return Requests</h1>
          <p className="text-purple-100">Track and manage your warehouse return shipments</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Returns List */}
        <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500 shadow-sm border border-gray-200">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
            <p className="mt-4">Loading...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-200">
            <p className="text-lg text-gray-500">No warehouse return requests yet</p>
            <p className="text-sm text-gray-400 mt-2">Return requests will appear here once initiated</p>
          </div>
        ) : (
          returns.map(ret => (
            <div key={ret.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{ret.productTitle}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Requested {formatDistanceToNow(new Date(ret.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ml-4 ${getStatusColor(ret.status)}`}>
                  {getStatusLabel(ret.status)}
                </span>
              </div>

              {/* Fee Info */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-lg border border-amber-200 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Warehouse Details</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Days in Warehouse</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{ret.daysInWarehouse}</p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Admin Fee</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{ret.adminFeePerVariant}</p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Period</p>
                    <p className="text-lg font-bold text-amber-600 mt-1">
                      {ret.daysInWarehouse <= 119 ? '0-119 days' : '120-180 days'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {ret.status !== 'CANCELLED' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-4">Status Timeline</p>
                <div className="flex gap-1">
                  {STEP_ORDER.map((step, index) => {
                    const currentIndex = getStepIndex(ret.status)
                    const isCompleted = index < currentIndex || (index === currentIndex && ret.status === 'COMPLETED')
                    const isCurrent = index === currentIndex

                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 shadow-md'
                              : isCurrent
                              ? 'bg-purple-600 shadow-lg scale-110'
                              : 'bg-gray-300'
                          }`}
                        >
                          {isCompleted ? <Check size={18} /> : index + 1}
                        </div>
                        {index < STEP_ORDER.length - 1 && (
                          <div className={`h-1 flex-1 mx-1 rounded-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 text-xs text-gray-600 flex justify-between font-medium">
                  <span>Pending</span>
                  <span>Approved</span>
                  <span>Shipped</span>
                  <span>Received</span>
                  <span>Done</span>
                </div>
              </div>
              )}

              {/* Shipping Info */}
              {ret.status === 'SHIPPED_BY_ADMIN' && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-5 rounded-lg border border-blue-200 mb-4">
                  <p className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Truck size={18} className="text-blue-600" />
                    Shipping Details
                  </p>
                  <div className="space-y-2 text-sm text-blue-800 font-medium">
                    {ret.carrier && <p>📦 Carrier: <span className="font-semibold">{ret.carrier}</span></p>}
                    {ret.trackingNumber && <p>🔗 Tracking: <span className="font-semibold">{ret.trackingNumber}</span></p>}
                    {ret.estimatedDelivery && (
                      <p>📅 Est. Delivery: <span className="font-semibold">{new Date(ret.estimatedDelivery).toLocaleDateString()}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {ret.status === 'PENDING_ADMIN_REVIEW' && (
                  cancelingId === ret.id ? (
                    <div className="w-full bg-red-50 p-4 rounded-lg border border-red-200 flex gap-3 items-center">
                      <span className="text-sm text-red-800 flex-1">Are you sure you want to cancel this return request?</span>
                      <button
                        onClick={() => setCancelingId(null)}
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded font-medium text-sm transition-colors"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleCancel(ret.id)}
                        disabled={canceling}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
                      >
                        {canceling ? 'Canceling...' : 'Yes, Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCancelingId(ret.id)}
                      className="flex-1 px-4 py-2 border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <X size={18} />
                      Cancel Return Request
                    </button>
                  )
                )}

                {ret.status === 'SHIPPED_BY_ADMIN' && (
                  receivingId === ret.id ? (
                    <div className="w-full bg-purple-50 p-4 rounded-lg border border-purple-200 flex gap-3 items-center">
                      <span className="text-sm text-purple-800 flex-1">Confirm that you have received this return?</span>
                      <button
                        onClick={() => setReceivingId(null)}
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded font-medium text-sm transition-colors"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleMarkReceived(ret.id)}
                        disabled={receiving}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
                      >
                        {receiving ? 'Confirming...' : 'Yes, Received'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReceivingId(ret.id)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                    >
                      <Check size={18} />
                      Mark as Received
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}
