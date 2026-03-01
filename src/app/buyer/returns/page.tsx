'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Package, Truck, XCircle, Clock, MessageSquare, ExternalLink } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyProvider'

interface ReturnItem {
  id: string
  orderId: string
  orderNumber: string
  status: 'INITIATED' | 'APPROVED' | 'SHIPPED_BACK' | 'RECEIVED' | 'REFUNDED' | 'REJECTED'
  reason: string
  refundAmount: number
  createdAt: string
  approvedAt: string | null
  refundedAt: string | null
  product: {
    title: string
    thumbnailUrl: string | null
  }
  seller: {
    name: string
  }
}

export default function BuyerReturnsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [returns, setReturns] = useState<ReturnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchReturns()
  }, [status, router])

  const fetchReturns = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/buyer/returns')
      if (response.ok) {
        const data = await response.json()
        setReturns(data.returns || [])
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReturns = returns.filter(r => {
    return filter === 'all' || r.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INITIATED': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-blue-100 text-blue-800'
      case 'SHIPPED_BACK': return 'bg-cyan-100 text-cyan-800'
      case 'RECEIVED': return 'bg-indigo-100 text-indigo-800'
      case 'REFUNDED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'INITIATED': return 'Return request submitted'
      case 'APPROVED': return 'Return approved - awaiting shipment'
      case 'SHIPPED_BACK': return 'Item shipped back to seller'
      case 'RECEIVED': return 'Item received by seller'
      case 'REFUNDED': return 'Refund processed'
      case 'REJECTED': return 'Return request denied'
      default: return status
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading your returns...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Returns</h1>
            <p className="text-gray-600">Track items you've returned for refund</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
          >
            <option value="all">All Returns</option>
            <option value="INITIATED">Initiated</option>
            <option value="APPROVED">Approved</option>
            <option value="SHIPPED_BACK">Shipped Back</option>
            <option value="RECEIVED">Received</option>
            <option value="REFUNDED">Refunded ✓</option>
            <option value="REJECTED">Rejected ✗</option>
          </select>
        </div>

        {/* Returns List */}
        {filteredReturns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No returns found</p>
            <Link
              href="/orders"
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              View Orders
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReturns.map((returnItem) => (
              <div key={returnItem.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                {/* Return Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Order {returnItem.orderNumber}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Initiated {new Date(returnItem.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(returnItem.status)}`}>
                      {getStatusDescription(returnItem.status)}
                    </span>
                  </div>

                  {/* Progress Timeline */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${['INITIATED', 'APPROVED', 'SHIPPED_BACK', 'RECEIVED', 'REFUNDED'].includes(returnItem.status) ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <span>Step 1: Initiated</span>
                    <span className={`w-2 h-2 rounded-full ${['APPROVED', 'SHIPPED_BACK', 'RECEIVED', 'REFUNDED'].includes(returnItem.status) ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <span>Step 2: Approved</span>
                    <span className={`w-2 h-2 rounded-full ${['SHIPPED_BACK', 'RECEIVED', 'REFUNDED'].includes(returnItem.status) ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <span>Step 3: Refund</span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4 sm:p-6 border-b border-gray-200 flex gap-4">
                  {returnItem.product.thumbnailUrl && (
                    <div className="w-20 h-20 relative flex-shrink-0">
                      <Image
                        src={returnItem.product.thumbnailUrl}
                        alt={returnItem.product.title}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">{returnItem.product.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">By {returnItem.seller.name}</p>
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Reason for return:</p>
                      <p className="text-sm text-gray-900">{returnItem.reason}</p>
                    </div>
                  </div>
                </div>

                {/* Refund Amount & Actions */}
                <div className="bg-gray-50 p-4 sm:p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Refund Amount</p>
                    <p className="text-2xl font-bold text-green-600">{formatPrice(returnItem.refundAmount)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/orders/${returnItem.orderId}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                    >
                      View Order
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm">
                      <MessageSquare className="w-4 h-4" />
                      Contact Seller
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {returns.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-indigo-600">{returns.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total Returns</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-yellow-600">{returns.filter(r => r.status === 'INITIATED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Pending Approval</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">{returns.filter(r => r.status === 'REFUNDED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Refunded</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-red-600">{formatPrice(returns.reduce((sum, r) => sum + r.refundAmount, 0))}</p>
              <p className="text-xs text-gray-600 mt-1">Total Refunded</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

