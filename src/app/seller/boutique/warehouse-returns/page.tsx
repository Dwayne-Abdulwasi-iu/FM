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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Warehouse Return Requests</h1>
        <p className="text-gray-600 mt-2">Track your warehouse return requests</p>
      </div>

      {/* Returns List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-lg p-6 text-center text-gray-500">
            Loading...
          </div>
        ) : returns.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center text-gray-500">
            No warehouse return requests yet
          </div>
        ) : (
          returns.map(ret => (
            <div key={ret.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{ret.productTitle}</h3>
                  <p className="text-sm text-gray-600">
                    Requested {formatDistanceToNow(new Date(ret.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ret.status)}`}>
                  {getStatusLabel(ret.status)}
                </span>
              </div>

              {/* Fee Info */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Days in Warehouse</p>
                    <p className="text-2xl font-bold text-amber-600">{ret.daysInWarehouse}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Admin Fee</p>
                    <p className="text-2xl font-bold text-amber-600">{ret.adminFeePerVariant} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="text-lg font-bold text-amber-600">
                      {ret.daysInWarehouse <= 119 ? '0-119 days' : '120-180 days'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {ret.status !== 'CANCELLED' && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Status Timeline</p>
                <div className="flex gap-2">
                  {STEP_ORDER.map((step, index) => {
                    const currentIndex = getStepIndex(ret.status)
                    const isCompleted = index < currentIndex || (index === currentIndex && ret.status === 'COMPLETED')
                    const isCurrent = index === currentIndex

                    return (
                      <div key={step} className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCompleted
                              ? 'bg-green-600 text-white'
                              : isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {isCompleted ? <Check size={16} /> : index + 1}
                        </div>
                        {index < STEP_ORDER.length - 1 && (
                          <div className={`h-0.5 w-6 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-600 flex justify-between">
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
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Truck size={16} />
                    Shipping Details
                  </p>
                  <div className="space-y-1 text-sm text-blue-800">
                    {ret.carrier && <p>Carrier: {ret.carrier}</p>}
                    {ret.trackingNumber && <p>Tracking: {ret.trackingNumber}</p>}
                    {ret.estimatedDelivery && (
                      <p>Est. Delivery: {new Date(ret.estimatedDelivery).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {ret.status === 'PENDING_ADMIN_REVIEW' && (
                  cancelingId === ret.id ? (
                    <div className="w-full bg-red-50 p-3 rounded-lg border border-red-200 flex gap-2 items-center">
                      <span className="text-sm text-red-800 flex-1">Cancel this return request?</span>
                      <button
                        onClick={() => setCancelingId(null)}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleCancel(ret.id)}
                        disabled={canceling}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded text-sm"
                      >
                        {canceling ? 'Canceling...' : 'Yes'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCancelingId(ret.id)}
                      className="flex-1 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Cancel Request
                    </button>
                  )
                )}

                {ret.status === 'SHIPPED_BY_ADMIN' && (
                  receivingId === ret.id ? (
                    <div className="w-full bg-purple-50 p-3 rounded-lg border border-purple-200 flex gap-2 items-center">
                      <span className="text-sm text-purple-800 flex-1">Confirm you received this?</span>
                      <button
                        onClick={() => setReceivingId(null)}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleMarkReceived(ret.id)}
                        disabled={receiving}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded text-sm"
                      >
                        {receiving ? 'Confirming...' : 'Yes'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReceivingId(ret.id)}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Mark Received
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
