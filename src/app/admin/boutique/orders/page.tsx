'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Package, ChevronLeft, ChevronRight, Search, Filter, Eye, Truck, CheckCircle, XCircle, Clock } from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    title: string
    thumbnailUrl: string | null
    seller: {
      id: string
      name: string
      email: string
    }
  }
}

interface BoutiqueOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  shippingCost: number
  shippingAddress: any
  paymentReference: string
  createdAt: string
  updatedAt: string
  buyer: {
    id: string
    name: string
    email: string
  }
  items: OrderItem[]
}

const ORDERSTATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'RETURN_REQUESTED', label: 'Return Requested' },
  { value: 'RETURN_APPROVED', label: 'Return Approved' },
  { value: 'RETURN_SHIPPED', label: 'Return Shipped' },
  { value: 'RETURN_RECEIVED', label: 'Return Received' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'DISPUTED', label: 'Disputed' },
]

function getStatusColor(status: string) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'bg-yellow-100 text-yellow-800'
    case 'PAID':
      return 'bg-blue-100 text-blue-800'
    case 'PROCESSING':
      return 'bg-purple-100 text-purple-800'
    case 'SHIPPED':
      return 'bg-indigo-100 text-indigo-800'
    case 'DELIVERED':
      return 'bg-green-100 text-green-800'
    case 'COMPLETED':
      return 'bg-green-100 text-green-800'
    case 'RETURN_REQUESTED':
      return 'bg-amber-100 text-amber-800'
    case 'RETURN_APPROVED':
      return 'bg-orange-100 text-orange-800'
    case 'RETURN_SHIPPED':
      return 'bg-orange-100 text-orange-800'
    case 'RETURN_RECEIVED':
      return 'bg-emerald-100 text-emerald-800'
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    case 'DISPUTED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return <Clock className="w-4 h-4" />
    case 'PAID':
      return <CheckCircle className="w-4 h-4" />
    case 'PROCESSING':
      return <Package className="w-4 h-4" />
    case 'SHIPPED':
      return <Truck className="w-4 h-4" />
    case 'DELIVERED':
      return <CheckCircle className="w-4 h-4" />
    case 'COMPLETED':
      return <CheckCircle className="w-4 h-4" />
    case 'RETURN_REQUESTED':
      return <Clock className="w-4 h-4" />
    case 'RETURN_APPROVED':
      return <CheckCircle className="w-4 h-4" />
    case 'RETURN_SHIPPED':
      return <Truck className="w-4 h-4" />
    case 'RETURN_RECEIVED':
      return <CheckCircle className="w-4 h-4" />
    case 'REFUNDED':
      return <CheckCircle className="w-4 h-4" />
    case 'CANCELLED':
      return <XCircle className="w-4 h-4" />
    case 'DISPUTED':
      return <XCircle className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

export default function AdminBoutiqueOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<BoutiqueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as any).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchOrders()
  }, [session, status, page, statusFilter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/boutique/admin/orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
        setTotalPages(data.totalPages || 1)
        setTotalOrders(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchOrders()
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId)
    try {
      const res = await fetch(`/api/boutique/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      }
    } catch (error) {
      console.error('Failed to update order:', error)
    } finally {
      setUpdatingOrder(null)
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
      hour: '2-digit',
      minute: '2-digit',
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <Link href="/admin" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-3 sm:mb-4 text-xs sm:text-sm">
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            Back to Admin
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Boutique Orders</h1>
              <p className="text-xs sm:text-base text-gray-600 mt-0.5 sm:mt-1">{totalOrders} total orders</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row gap-2 sm:gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders..."
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
            </form>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="border rounded-lg px-2 sm:px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs sm:text-sm"
                aria-label="Filter by order status"
              >
                {ORDERSTATUSES.map((s: { value: string; label: string }) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No orders found</h3>
              <p className="text-xs sm:text-base text-gray-500">
                {statusFilter || searchQuery
                  ? 'Try adjusting your filters'
                  : 'Orders will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Customer
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Items
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Date
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                          {order.paymentReference}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-xs sm:text-sm text-gray-900">{order.buyer?.name || 'N/A'}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">{order.buyer?.email}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                        <div className="flex -space-x-2">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border-2 border-white">
                              <Image
                                src={item.product?.thumbnailUrl || '/images/placeholder.png'}
                                alt={item.product?.title || 'Product'}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center">
                              <span className="text-[10px] sm:text-xs text-gray-600">+{order.items.length - 3}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                          {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {formatCurrency(order.total)}
                        </div>
                        {order.shippingCost > 0 && (
                          <div className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                            +{formatCurrency(order.shippingCost)} ship
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="hidden xs:inline">{order.status}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Link
                            href={`/admin/boutique/orders/${order.id}`}
                            className="text-purple-600 hover:text-purple-700"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Link>
                          {order.status === 'PAID' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'PROCESSING')}
                              disabled={updatingOrder === order.id}
                              className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                              title="Mark as Processing"
                            >
                              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          )}
                          {order.status === 'PROCESSING' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'SHIPPED')}
                              disabled={updatingOrder === order.id}
                              className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                              title="Mark as Shipped"
                            >
                              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          )}
                          {order.status === 'SHIPPED' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                              disabled={updatingOrder === order.id}
                              className="text-green-600 hover:text-green-700 disabled:opacity-50"
                              title="Mark as Delivered"
                            >
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-t">
              <div className="text-xs sm:text-sm text-gray-700">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 sm:px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 sm:px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

