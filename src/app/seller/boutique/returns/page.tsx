'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { AlertCircle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface Return {
  id: string
  orderItemId: string
  reason: string
  status: string
  requestedAt: string
  resolvedAt?: string | null
  refundAmount: number
}

export default function SellerReturnsPage() {
  const { data: session } = useSession()
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchReturns()
  }, [filter])

  const fetchReturns = async () => {
    try {
      setLoading(true)
      // Fetch returns from API
      const res = await fetch(`/api/boutique/seller/returns?status=${filter}`)
      if (!res.ok) throw new Error('Failed to load returns')
      
      const data = await res.json()
      setReturns(data.returns || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load returns'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
      case 'REJECTED':
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
      default:
        return <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            Product Returns
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 sm:mt-2">
            Track and manage returns from your boutique products
          </p>
        </div>

        {/* Info Banner */}
        {!session?.user?.id && (
          <div className="mb-4 sm:mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-blue-900">
                Loading...
              </h3>
              <p className="text-xs sm:text-sm text-blue-800 mt-1">
                Please wait while we fetch your returns.
              </p>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
          {['all', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>

        {/* Returns List */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-3" />
            <p className="text-sm sm:text-base text-gray-600">Loading returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 text-center">
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm sm:text-base font-medium text-gray-900">No returns found</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              You don't have any returns to display
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {returns.map((ret) => (
              <div
                key={ret.id}
                className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 md:p-6 hover:shadow-md transition"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  {getStatusIcon(ret.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900 break-words">
                          Order Item: {ret.orderItemId}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                          Reason: {ret.reason}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(
                          ret.status,
                        )}`}
                      >
                        {ret.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 sm:mt-3 text-xs sm:text-sm">
                      <div>
                        <p className="text-gray-600">Requested</p>
                        <p className="text-gray-900 font-medium">
                          {new Date(ret.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Refund Amount</p>
                        <p className="text-gray-900 font-medium">
                          ₦{(ret.refundAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      {ret.resolvedAt && (
                        <div>
                          <p className="text-gray-600">Resolved</p>
                          <p className="text-gray-900 font-medium">
                            {new Date(ret.resolvedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
