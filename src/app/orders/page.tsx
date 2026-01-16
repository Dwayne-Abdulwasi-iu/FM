'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package,
  Download,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingBag,
  Eye,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
} from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  price: number
  purchaseType: 'REGULAR' | 'OWNERSHIP' | 'POD'
  podProductId?: string
  podProductName?: string
  design: {
    id: string
    title: string
    imageUrl: string
    thumbnailUrl?: string
    category: string
    designer: {
      id: string
      name: string | null
    }
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  orderType: 'DIGITAL' | 'POD'
  totalAmount: number
  createdAt: string
  paidAt?: string
  paymentMethod?: string
  podProvider?: string
  podStatus?: string
  trackingNumber?: string
  trackingUrl?: string
  estimatedDelivery?: string
  items: OrderItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Package },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
}

export default function OrdersPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'DIGITAL' | 'POD'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchOrders()
  }, [session, authStatus, router, page, statusFilter, typeFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)

      const response = await fetch(`/api/profile/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.items.some(item => item.design.title.toLowerCase().includes(query))
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              My Orders
            </h1>
            <p className="text-gray-600 mt-1">View and manage your digital purchases</p>
          </div>
          <Link
            href="/boutique/orders"
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800"
          >
            <Package className="w-4 h-4" />
            View Boutique Orders
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'DIGITAL' | 'POD')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="all">All Types</option>
              <option value="DIGITAL">Digital Downloads</option>
              <option value="POD">Print-on-Demand</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : "You haven't made any purchases yet"}
            </p>
            <Link
              href="/designs"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Browse Designs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
              const StatusIcon = statusConfig.icon

              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Order Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.createdAt)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.orderType === 'POD' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.orderType === 'POD' ? 'Print-on-Demand' : 'Digital'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 relative flex-shrink-0">
                            <Image
                              src={item.design.thumbnailUrl || item.design.imageUrl}
                              alt={item.design.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/designs/${item.design.id}`}
                              className="font-medium text-gray-900 hover:text-indigo-600 truncate block"
                            >
                              {item.design.title}
                            </Link>
                            <p className="text-sm text-gray-500">
                              by {item.design.designer.name || 'Unknown Designer'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                item.purchaseType === 'OWNERSHIP'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.purchaseType === 'POD'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {item.purchaseType === 'OWNERSHIP' ? 'Ownership' : item.purchaseType === 'POD' ? 'POD' : 'License'}
                              </span>
                              {item.podProductName && (
                                <span className="text-xs text-gray-500">{item.podProductName}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(item.price)}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="px-6 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                    {/* POD Tracking */}
                    {order.orderType === 'POD' && order.trackingNumber && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Truck className="w-4 h-4" />
                        <span>Tracking: {order.trackingNumber}</span>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Link>
                      {order.orderType === 'DIGITAL' && (order.status === 'PAID' || order.status === 'COMPLETED') && (
                        <Link
                          href="/profile#purchases"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                          <Download className="w-4 h-4" />
                          Downloads
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
