'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCurrency } from '@/components/CurrencyProvider'
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Truck,
  Search,
  Filter,
  ExternalLink,
  Printer
} from 'lucide-react'

interface OrderItem {
  id: string
  designId: string
  price: number
  quantity: number
  design: {
    id: string
    title: string
    thumbnailUrl: string | null
    imageUrl: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  // POD fields
  isPOD?: boolean
  podProvider?: string | null
  podStatus?: string | null
  podOrderId?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  customer: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  items: OrderItem[]
  shippingAddress?: {
    fullName: string
    city: string
    state: string
    country?: string
  } | null
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: <Package className="w-4 h-4" /> },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-4 h-4" /> },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
  REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-4 h-4" /> },
}

// POD Status configuration
const podStatusConfig: Record<string, { label: string; color: string; description: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', description: 'Awaiting production' },
  in_production: { label: 'In Production', color: 'bg-blue-100 text-blue-700', description: 'Being manufactured' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', description: 'On the way to customer' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', description: 'Successfully delivered' },
  canceled: { label: 'Canceled', color: 'bg-red-100 text-red-700', description: 'Order was canceled' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', description: 'Production failed' },
  delivery_failed: { label: 'Delivery Failed', color: 'bg-orange-100 text-orange-700', description: 'Delivery attempt failed' },
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SellerOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/seller/orders')
        if (res.ok) {
          const data = await res.json()
          setOrders(data.orders || [])
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchOrders()
    }
  }, [session])

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/seller/dashboard"
              className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Orders</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Manage orders for your designs</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-2 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by order status"
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-12 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-2 sm:mb-4" />
            <h3 className="text-sm sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No orders found</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {orders.length === 0 
                ? "You haven't received any orders yet. Keep creating great designs!"
                : "No orders match your current filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-4">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.PENDING
              const sellerItems = order.items // Items are already filtered by the API
              const orderTotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Order Header */}
                  <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {order.customer.image ? (
                          <Image
                            src={order.customer.image}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-600 font-medium">
                            {(order.customer.name || order.customer.email)[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">Order #{order.orderNumber}</p>
                          {order.isPOD && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-medium flex-shrink-0">
                              <Printer className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden sm:inline">POD</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                          {(order.customer.name || order.customer.email).substring(0, 20)} • {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
                      <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${status.color}`}>
                        {status.icon}
                        <span className="hidden sm:inline">{status.label}</span>
                      </span>
                      <p className="font-bold text-sm sm:text-base text-gray-900">{formatPrice(orderTotal)}</p>
                    </div>
                  </div>

                  {/* POD Status Section - Only show for POD orders */}
                  {order.isPOD && order.podStatus && (
                    <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                            <Printer className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm font-medium text-gray-700">POD</span>
                              {order.podProvider && (
                                <span className="text-xs text-gray-500">via {order.podProvider}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                              <span className={`inline-flex px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium ${podStatusConfig[order.podStatus]?.color || 'bg-gray-100 text-gray-700'}`}>
                                {podStatusConfig[order.podStatus]?.label || order.podStatus}
                              </span>
                              <span className="text-xs text-gray-500 hidden sm:inline">
                                {podStatusConfig[order.podStatus]?.description}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Tracking Info */}
                        {order.trackingNumber && (
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <span className="text-gray-500">Tracking:</span>
                              <code className="ml-1 px-2 py-0.5 bg-white rounded text-xs">{order.trackingNumber}</code>
                            </div>
                            {order.trackingUrl && (
                              <a
                                href={order.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-cyan-600 rounded-lg text-sm font-medium hover:bg-cyan-50 transition-colors shadow-sm"
                              >
                                Track
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Delivery Timestamps */}
                      {(order.shippedAt || order.deliveredAt) && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {order.shippedAt && (
                            <span>📦 Shipped: {formatDate(order.shippedAt)}</span>
                          )}
                          {order.deliveredAt && (
                            <span>✅ Delivered: {formatDate(order.deliveredAt)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="px-6 py-4">
                    <div className="space-y-3">
                      {sellerItems.map((item) => (
                        <Link
                          key={item.id}
                          href={`/designs/${item.designId}`}
                          className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 relative flex-shrink-0">
                            <Image
                              src={item.design.thumbnailUrl || item.design.imageUrl}
                              alt={item.design.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.design.title}</p>
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Info */}
                  {order.shippingAddress && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ship to:</span> {order.shippingAddress.fullName}, {order.shippingAddress.city}, {order.shippingAddress.state}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Summary */}
        {filteredOrders.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        )}
      </div>
    </div>
  )
}
