'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Package, Truck, CheckCircle, Clock, ExternalLink } from 'lucide-react'

interface BoutiqueOrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    title: string
    thumbnailUrl: string | null
  }
  seller: {
    id: string
    displayName: string | null
    name: string | null
  }
}

interface BoutiqueOrder {
  id: string
  orderNumber: string
  status: 'PENDING' | 'VERIFIED' | 'LIVE' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  createdAt: string
  shippedAt: string | null
  deliveredAt: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  items: BoutiqueOrderItem[]
}

export default function BoutiqueOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<BoutiqueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchOrders()
  }, [status, router])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/buyer/boutique-orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    return filter === 'all' || order.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'VERIFIED': return 'bg-blue-100 text-blue-800'
      case 'LIVE': return 'bg-indigo-100 text-indigo-800'
      case 'SHIPPED': return 'bg-cyan-100 text-cyan-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'SHIPPED': return <Truck className="w-4 h-4" />
      case 'DELIVERED': return <CheckCircle className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Awaiting verification'
      case 'VERIFIED': return 'Ready to ship'
      case 'LIVE': return 'In marketplace'
      case 'SHIPPED': return 'On the way to you'
      case 'DELIVERED': return 'Delivered'
      case 'CANCELLED': return 'Order cancelled'
      default: return status
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading your boutique orders...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">My Boutique Orders</h1>
            <p className="text-gray-600">Track your physical product purchases</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
          >
            <option value="all">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No boutique orders yet</p>
            <Link
              href="/shop/physical"
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                {/* Order Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Order {order.orderNumber}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {getStatusDescription(order.status)}
                    </span>
                  </div>

                  {/* Tracking Info */}
                  {order.trackingNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Truck className="w-4 h-4" />
                      Tracking: {order.trackingNumber}
                      {order.trackingUrl && (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 ml-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}

                  {order.shippedAt && (
                    <p className="text-xs text-gray-500 mt-2">Shipped on {new Date(order.shippedAt).toLocaleDateString()}</p>
                  )}
                </div>

                {/* Order Items */}
                <div className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-4 sm:p-6 flex gap-4">
                      {item.product.thumbnailUrl && (
                        <div className="w-20 h-20 relative flex-shrink-0">
                          <Image
                            src={item.product.thumbnailUrl}
                            alt={item.product.title}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{item.product.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          By {item.seller.displayName || item.seller.name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                          <span className="font-semibold text-indigo-600">${item.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer */}
                <div className="bg-gray-50 p-4 sm:p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">${order.totalAmount.toFixed(2)}</p>
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    View Details
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-indigo-600">{orders.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total Orders</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-cyan-600">{orders.filter(o => o.status === 'SHIPPED').length}</p>
              <p className="text-xs text-gray-600 mt-1">In Transit</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'DELIVERED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Delivered</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-600">${orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}</p>
              <p className="text-xs text-gray-600 mt-1">Total Spent</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
