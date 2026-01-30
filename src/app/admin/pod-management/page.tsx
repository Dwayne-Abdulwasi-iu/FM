'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, Truck, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react'

interface PODOrder {
  id: string
  orderNumber: string
  status: 'PENDING' | 'CREATED' | 'ACKNOWLEDGED' | 'CANCELED' | 'IN_PRODUCTION' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'RETURNED' | 'FAILED'
  seller: {
    id: string
    name: string
  }
  buyer: {
    id: string
    name: string
    email: string
  }
  items: Array<{
    id: string
    title: string
    sku: string
    quantity: number
  }>
  total: number
  podOrderId: string
  createdAt: string
  updatedAt: string
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
  }
  tracking: {
    number: string | null
    carrier: string | null
    status: string | null
  } | null
}

export default function AdminPODManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<PODOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<PODOrder | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    if (status !== 'authenticated') return

    fetchPODOrders()
  }, [status, session, router, filter])

  const fetchPODOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/pod-management?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch POD orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/pod-management/${orderId}/sync`, {
        method: 'POST',
      })
      if (response.ok) {
        await fetchPODOrders()
      }
    } catch (error) {
      console.error('Failed to sync order:', error)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Cancel this POD order?')) return

    try {
      const response = await fetch(`/api/admin/pod-management/${orderId}/cancel`, {
        method: 'POST',
      })
      if (response.ok) {
        await fetchPODOrders()
      }
    } catch (error) {
      console.error('Failed to cancel order:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800'
      case 'CREATED': return 'bg-yellow-100 text-yellow-800'
      case 'ACKNOWLEDGED': return 'bg-blue-100 text-blue-800'
      case 'IN_PRODUCTION': return 'bg-indigo-100 text-indigo-800'
      case 'READY_TO_SHIP': return 'bg-purple-100 text-purple-800'
      case 'SHIPPED': return 'bg-green-100 text-green-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELED': return 'bg-red-100 text-red-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SHIPPED':
      case 'DELIVERED':
        return <Truck className="w-4 h-4" />
      case 'READY_TO_SHIP':
      case 'IN_PRODUCTION':
        return <Package className="w-4 h-4" />
      case 'DELIVERED':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const filteredOrders = orders.filter((o) => {
    const statusMatch = filter === 'all' || o.status === filter
    const searchMatch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.seller.name.toLowerCase().includes(searchQuery.toLowerCase())
    return statusMatch && searchMatch
  })

  if (loading) {
    return <div className="p-8 text-center">Loading POD orders...</div>
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600">Access Denied</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">POD Order Management</h1>
            <p className="text-gray-600 mt-1">Track and manage print-on-demand orders</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by order #, seller, or buyer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CREATED">Created</option>
              <option value="IN_PRODUCTION">In Production</option>
              <option value="READY_TO_SHIP">Ready to Ship</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No POD orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">Order {order.orderNumber}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.seller.name} → {order.buyer.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Order Total</p>
                    <p className="font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Items</p>
                    <p className="font-semibold text-gray-900">{order.items.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Created</p>
                    <p className="font-semibold text-gray-900 text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">POD Order ID</p>
                    <p className="font-semibold text-gray-900 text-sm truncate">{order.podOrderId}</p>
                  </div>
                </div>

                {order.tracking && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">Tracking</p>
                    <p className="text-sm text-blue-800">
                      {order.tracking.carrier}: {order.tracking.number || 'Pending'}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleSyncOrder(order.id)}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sync
                  </button>
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition text-sm"
                    >
                      Cancel
                    </button>
                  )}
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
              <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'PENDING' || o.status === 'CREATED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Processing</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'SHIPPED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Shipped</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">${orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}</p>
              <p className="text-xs text-gray-600 mt-1">Total Revenue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
