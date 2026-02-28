'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import _Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, _Filter, ExternalLink } from 'lucide-react'

interface BoutiqueOrder {
  id: string
  orderNumber: string
  status: 'PENDING' | 'SHIPPED_TO_ADMIN' | 'RECEIVED_BY_ADMIN' | 'VERIFICATION_PASSED' | 'LIVE' | 'CANCELLED' | 'DISPUTE'
  totalAmount: number
  createdAt: string
  product: {
    id: string
    title: string
    thumbnailUrl: string | null
  }
  customer: {
    name: string | null
    email: string | null
  }
  quantity: number
}

export default function BoutiqueOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<BoutiqueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
      const response = await fetch('/api/seller/boutique-orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch boutique orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'SHIPPED_TO_ADMIN': return 'bg-blue-100 text-blue-800'
      case 'RECEIVED_BY_ADMIN': return 'bg-indigo-100 text-indigo-800'
      case 'VERIFICATION_PASSED': return 'bg-green-100 text-green-800'
      case 'LIVE': return 'bg-emerald-100 text-emerald-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      case 'DISPUTE': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'LIVE': return <CheckCircle className="w-4 h-4" />
      case 'CANCELLED': return <XCircle className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading boutique orders...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Boutique Orders</h1>
            <p className="text-gray-600">Track orders placed by customers for your boutique products</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by order # or product..."
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
              <option value="SHIPPED_TO_ADMIN">Shipped to Admin</option>
              <option value="RECEIVED_BY_ADMIN">Received by Admin</option>
              <option value="VERIFICATION_PASSED">Verified</option>
              <option value="LIVE">Live</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DISPUTE">Dispute</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No boutique orders found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.product.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.customer.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.quantity}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-indigo-600">${order.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/seller/boutique-orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{orders.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total Orders</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'PENDING').length}</p>
              <p className="text-xs text-gray-600 mt-1">Pending</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'LIVE').length}</p>
              <p className="text-xs text-gray-600 mt-1">Live</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'CANCELLED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Cancelled</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
