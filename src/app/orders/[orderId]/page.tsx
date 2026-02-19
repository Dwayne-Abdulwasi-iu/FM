'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Download, Eye, Truck, CheckCircle, Clock, Package } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyProvider'

interface OrderItem {
  id: string
  quantity: number
  price: number
  purchaseType: 'REGULAR' | 'OWNERSHIP' | 'POD'
  design: {
    id: string
    title: string
    imageUrl: string
    thumbnailUrl?: string
    designer: {
      name: string | null
    }
  }
  downloadUrl?: string
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
  trackingNumber?: string
  trackingUrl?: string
  items: OrderItem[]
}

export default function OrderDetailsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const { formatPrice } = useCurrency()
  const orderNumber = params.orderNumber as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchOrder()
  }, [session, authStatus, router])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderNumber}`)
      if (!response.ok) {
        setError('Order not found')
        return
      }
      const data = await response.json()
      setOrder(data)
    } catch (err) {
      setError('Failed to load order details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || 'Order not found'}</h2>
            <Link href="/orders" className="text-indigo-600 hover:text-indigo-800">
              View all orders
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
    PENDING: { icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    COMPLETED: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    PAID: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    SHIPPED: { icon: Truck, color: 'bg-blue-100 text-blue-800' },
  }

  const config = statusConfig[order.status] || { icon: Package, color: 'bg-gray-100 text-gray-800' }
  const StatusIcon = config.icon

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${config.color} font-medium`}>
              <StatusIcon className="w-5 h-5" />
              {order.status}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Order Type</p>
              <p className="font-semibold text-gray-900">{order.orderType === 'POD' ? 'Print-on-Demand' : 'Digital'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</p>
            </div>
            {order.paymentMethod && (
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-semibold text-gray-900">{order.paymentMethod}</p>
              </div>
            )}
            {order.paidAt && (
              <div>
                <p className="text-sm text-gray-600">Paid At</p>
                <p className="font-semibold text-gray-900">{new Date(order.paidAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Items in this order</h2>
          </div>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {/* Item Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                    <Image
                      src={item.design.thumbnailUrl || item.design.imageUrl}
                      alt={item.design.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1">
                    <Link
                      href={`/designs/${item.design.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-indigo-600 block mb-1"
                    >
                      {item.design.title}
                    </Link>
                    <p className="text-sm text-gray-600 mb-3">by {item.design.designer.name || 'Unknown'}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        Quantity: <span className="font-semibold">{item.quantity}</span>
                      </span>
                      <span className="text-sm text-gray-600">
                        Price: <span className="font-semibold">{formatPrice(item.price)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Download Button */}
                  {order.orderType === 'DIGITAL' && (order.status === 'PAID' || order.status === 'COMPLETED') && item.downloadUrl && (
                    <div className="flex items-center">
                      <a
                        href={item.downloadUrl}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tracking Info */}
        {order.orderType === 'POD' && order.trackingNumber && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Tracking Information
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tracking Number</p>
                <p className="font-semibold text-gray-900">{order.trackingNumber}</p>
              </div>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Eye className="w-4 h-4" />
                  Track Package
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
