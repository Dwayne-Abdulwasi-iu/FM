'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  RotateCcw, ChevronLeft, Search, Filter, Eye, CheckCircle, 
  XCircle, Clock, Package, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ReturnRequest {
  id: string
  returnNumber: string
  reason: string
  description: string | null
  status: string
  refundAmount: number
  adminNotes: string | null
  imageUrls: string[]
  createdAt: string
  resolvedAt: string | null
  order: {
    id: string
    orderNumber: string
    total: number
  }
  orderItem: {
    id: string
    quantity: number
    price: number
    product: {
      id: string
      title: string
      thumbnailUrl: string | null
    }
  }
  user: {
    id: string
    name: string | null
    email: string
  }
}

const RETURN_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ITEM_SHIPPED', label: 'Item Shipped' },
  { value: 'ITEM_RECEIVED', label: 'Item Received' },
  { value: 'REFUNDED', label: 'Refunded' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return { bg: 'bg-yellow-100 text-yellow-800', icon: Clock }
    case 'APPROVED':
      return { bg: 'bg-blue-100 text-blue-800', icon: CheckCircle }
    case 'REJECTED':
      return { bg: 'bg-red-100 text-red-800', icon: XCircle }
    case 'ITEM_SHIPPED':
      return { bg: 'bg-indigo-100 text-indigo-800', icon: Package }
    case 'ITEM_RECEIVED':
      return { bg: 'bg-purple-100 text-purple-800', icon: Package }
    case 'REFUNDED':
      return { bg: 'bg-green-100 text-green-800', icon: CheckCircle }
    default:
      return { bg: 'bg-gray-100 text-gray-800', icon: Clock }
  }
}

export default function AdminReturnsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null)
  const [processing, setProcessing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as any).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchReturns()
  }, [session, status, statusFilter])

  const fetchReturns = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/boutique/returns?admin=true&${params}`)
      if (res.ok) {
        const data = await res.json()
        setReturns(data.returns || [])
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (returnId: string, action: string, notes?: string) => {
    setProcessing(true)
    try {
      const res = await fetch('/api/boutique/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          returnId, 
          action,
          adminNotes: notes || adminNotes 
        }),
      })

      if (res.ok) {
        toast.success(`Return ${action}d successfully`)
        fetchReturns()
        setSelectedReturn(null)
        setAdminNotes('')
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to update return')
      }
    } catch (error) {
      toast.error('Failed to update return')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-2 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-2 sm:mb-8">
          <Link href="/admin/boutique" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-2 sm:mb-3 text-[10px] sm:text-sm">
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            Back to Boutique Admin
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-3xl font-bold text-black">Return Requests</h1>
              <p className="text-[9px] sm:text-sm text-black mt-0.5 sm:mt-1">Manage buyer return requests</p>
            </div>
            <button
              onClick={() => fetchReturns()}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Refresh returns list"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 mb-2 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <form onSubmit={(e) => { e.preventDefault(); fetchReturns(); }} className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by return or order..."
                  className="w-full pl-7 sm:pl-10 pr-2.5 sm:pr-4 py-1.5 sm:py-2 border rounded-lg text-black bg-white focus:ring-2 focus:ring-purple-500 text-[11px] sm:text-sm"
                />
              </div>
            </form>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Filter className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-black bg-white focus:ring-2 focus:ring-purple-500 text-[11px] sm:text-sm"
                aria-label="Filter by return status"
              >
                {RETURN_STATUSES.map(s => (
                  <option key={s.value} value={s.value} className="text-black">{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Returns List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {returns.length === 0 ? (
            <div className="p-6 sm:p-12 text-center">
              <RotateCcw className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-black mb-1 sm:mb-2">No return requests</h3>
              <p className="text-[9px] sm:text-sm text-black">
                {statusFilter ? 'Try adjusting your filters' : 'Return requests will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {returns.map((ret) => {
                const statusInfo = getStatusBadge(ret.status)
                const StatusIcon = statusInfo.icon
                return (
                  <div key={ret.id} className="p-2 sm:p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-2 sm:gap-4">
                      {/* Product Image */}
                      <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {ret.orderItem?.product?.thumbnailUrl ? (
                          <Image
                            src={ret.orderItem?.product?.thumbnailUrl || ''}
                            alt={ret.orderItem?.product?.title || 'Product'}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 sm:w-8 sm:h-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5 sm:mb-1">
                          <div>
                            <p className="font-semibold text-black text-[10px] sm:text-base">{ret.returnNumber}</p>
                            <p className="text-[8px] sm:text-sm text-black">Order: {ret.order?.orderNumber || 'N/A'}</p>
                          </div>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-xs font-medium ${statusInfo.bg}`}>
                            <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span className="hidden xs:inline">{ret.status.replace(/_/g, ' ')}</span>
                          </span>
                        </div>
                        <p className="text-[9px] sm:text-sm text-black font-medium line-clamp-1">{ret.orderItem?.product?.title || 'Product'}</p>
                        <p className="text-[8px] sm:text-sm text-black">
                          {ret.user?.name || ret.user?.email || 'Unknown'} • Qty: {ret.orderItem?.quantity || 0}
                        </p>
                        <p className="text-[8px] sm:text-sm text-black">
                          Reason: <span className="font-medium">{ret.reason?.replace(/_/g, ' ')}</span>
                        </p>
                        {ret.description && (
                          <p className="text-[8px] sm:text-sm text-black mt-0.5">&ldquo;{ret.description}&rdquo;</p>
                        )}
                        <div className="flex items-center justify-between mt-1 sm:mt-2">
                          <p className="text-[8px] sm:text-sm font-semibold text-purple-600">
                            Refund: {formatCurrency(ret.refundAmount)}
                          </p>
                          <p className="text-[7px] sm:text-xs text-black">{formatDate(ret.createdAt)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 sm:gap-2">
                        <button
                          onClick={() => setSelectedReturn(ret)}
                          className="p-1 sm:p-2 text-black hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                          aria-label="View return details"
                        >
                          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        {ret.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleAction(ret.id, 'approve')}
                              disabled={processing}
                              className="p-1 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => setSelectedReturn(ret)}
                              className="p-1 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Return Detail Modal */}
        {selectedReturn && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Return Details</h2>
                  <button
                    onClick={() => setSelectedReturn(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    aria-label="Close modal"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Return Number</p>
                      <p className="font-medium text-gray-900">{selectedReturn.returnNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Order Number</p>
                      <Link href={`/admin/boutique/orders/${selectedReturn.order?.id || ''}`} className="font-medium text-purple-600 hover:underline">
                        {selectedReturn.order?.orderNumber || 'N/A'}
                      </Link>
                    </div>
                    <div>
                      <p className="text-gray-500">Buyer</p>
                      <p className="font-medium text-gray-900">{selectedReturn.user?.name || selectedReturn.user?.email || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Refund Amount</p>
                      <p className="font-medium text-gray-900">{formatCurrency(selectedReturn.refundAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Reason</p>
                      <p className="font-medium text-gray-900">{selectedReturn.reason?.replace(/_/g, ' ') || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium text-gray-900">{selectedReturn.status?.replace(/_/g, ' ') || 'Unknown'}</p>
                    </div>
                  </div>

                  {selectedReturn.description && (
                    <div>
                      <p className="text-gray-500 text-sm">Description</p>
                      <p className="text-gray-900 mt-1">{selectedReturn.description}</p>
                    </div>
                  )}

                  {selectedReturn.imageUrls.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-sm mb-2">Evidence Images</p>
                      <div className="flex gap-2 flex-wrap">
                        {selectedReturn.imageUrls.map((url, idx) => (
                          <a 
                            key={idx} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            aria-label={`View evidence image ${idx + 1}`}
                          >
                            <Image
                              src={url}
                              alt={`Evidence ${idx + 1}`}
                              width={100}
                              height={100}
                              className="rounded-lg object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedReturn.adminNotes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-500 text-sm">Admin Notes</p>
                      <p className="text-gray-900 mt-1">{selectedReturn.adminNotes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedReturn.status === 'PENDING' && (
                    <div className="border-t pt-4 mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes (required for rejection)
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={3}
                        className="w-full border rounded-lg px-3 py-2 text-gray-900"
                        placeholder="Enter notes..."
                      />
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => handleAction(selectedReturn.id, 'approve')}
                          disabled={processing}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve Return
                        </button>
                        <button
                          onClick={() => {
                            if (!adminNotes.trim()) {
                              toast.error('Please enter a rejection reason')
                              return
                            }
                            handleAction(selectedReturn.id, 'reject', adminNotes)
                          }}
                          disabled={processing}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject Return
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedReturn.status === 'ITEM_RECEIVED' && (
                    <div className="border-t pt-4 mt-4">
                      <button
                        onClick={() => handleAction(selectedReturn.id, 'complete_refund')}
                        disabled={processing}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        Complete Refund ({formatCurrency(selectedReturn.refundAmount)})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
