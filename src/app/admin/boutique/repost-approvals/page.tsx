'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, _AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface RepostRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason: string
  notes?: string
  originalStock: number
  requestedStock: number
  approvedStock?: number
  daysInWarehouse?: number
  adminNotes?: string
  createdAt: string
  product: {
    id: string
    title: string
    basePrice: number
    thumbnailUrl?: string
    receivedByAdminAt: string
  }
  seller: {
    id: string
    name?: string
    email: string
  }
}

export default function RepostApprovalPage() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<RepostRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchRequests()
    }
  }, [session?.user?.role])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/boutique/admin/repost-requests?status=PENDING')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Failed to load repost requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      const response = await fetch('/api/boutique/admin/repost-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'APPROVE',
          adminNotes: adminNotes[requestId],
        }),
      })

      if (!response.ok) throw new Error('Failed to approve')
      toast.success('Repost approved!')
      setAdminNotes(prev => ({ ...prev, [requestId]: '' }))
      await fetchRequests()
    } catch (error) {
      console.error('Error approving repost:', error)
      toast.error('Failed to approve repost')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      const response = await fetch('/api/boutique/admin/repost-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'REJECT',
          adminNotes: adminNotes[requestId],
        }),
      })

      if (!response.ok) throw new Error('Failed to reject')
      toast.success('Repost rejected!')
      setAdminNotes(prev => ({ ...prev, [requestId]: '' }))
      await fetchRequests()
    } catch (error) {
      console.error('Error rejecting repost:', error)
      toast.error('Failed to reject repost')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return <div className="p-4 sm:p-8 text-center text-xs sm:text-sm">Loading...</div>
  }

  if (requests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Repost Approvals</h1>
          <div className="text-center py-12">
            <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-xs sm:text-sm text-gray-600">No pending repost requests</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Repost Approval Queue</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Review and approve seller requests to repost warehouse products
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {requests.map(request => (
            <div
              key={request.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                className="w-full p-2.5 sm:p-3 md:p-4 flex items-start gap-2 sm:gap-3 md:gap-4 hover:bg-gray-50 transition-colors"
              >
                {request.product.thumbnailUrl && (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-gray-200 rounded">
                    <Image
                      src={request.product.thumbnailUrl}
                      alt={request.product.title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-1">{request.product.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-1">
                    By {request.seller.name || request.seller.email}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                      {request.reason}
                    </span>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded whitespace-nowrap">
                      {request.originalStock} → {request.requestedStock}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">
                    ₦{request.product.basePrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === request.id && (
                <div className="border-t border-gray-200 p-3 sm:p-4 md:p-6 bg-gray-50 space-y-3 sm:space-y-4">
                  {/* Request Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Original Stock</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{request.originalStock}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Requested Stock</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{request.requestedStock}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Deduction</p>
                      <p className="text-base sm:text-lg font-bold text-orange-600">
                        {request.originalStock - request.requestedStock} unit
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Days in Warehouse</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{request.daysInWarehouse || '—'}</p>
                    </div>
                  </div>

                  {/* Seller Notes */}
                  {request.notes && (
                    <div className="bg-white p-2.5 sm:p-3 rounded border border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Seller Notes</p>
                      <p className="text-xs sm:text-sm text-gray-600">{request.notes}</p>
                    </div>
                  )}

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Admin Notes (optional)
                    </label>
                    <textarea
                      value={adminNotes[request.id] || ''}
                      onChange={(e) =>
                        setAdminNotes(prev => ({
                          ...prev,
                          [request.id]: e.target.value,
                        }))
                      }
                      placeholder="Add notes for your decision..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs sm:text-sm"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {processingId === request.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {processingId === request.id ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
