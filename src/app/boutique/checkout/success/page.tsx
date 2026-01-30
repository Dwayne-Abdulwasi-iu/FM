'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Package, Home, ShoppingBag, Loader2, Mail, MapPin, Phone } from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    title: string
    thumbnailUrl: string | null
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  shippingFee: number
  shippingAddress: {
    name?: string
    fullName?: string
    address?: string
    street?: string
    city: string
    state: string
    phone: string
  }
  items: OrderItem[]
  product?: {
    title: string
    thumbnailUrl: string | null
  }
  quantity?: number
  createdAt: string
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const orderIds = searchParams.get('orders')
  const reference = searchParams.get('ref')
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      if (!orderIds && !reference) {
        setLoading(false)
        return
      }

      try {
        // Fetch each order
        if (orderIds) {
          const ids = orderIds.split(',')
          const fetchedOrders: Order[] = []
          
          for (const id of ids) {
            try {
              const res = await fetch(`/api/boutique/orders/${id}`)
              if (res.ok) {
                const order = await res.json()
                fetchedOrders.push(order)
              }
            } catch (err) {
              console.error('Error fetching order:', err)
            }
          }
          
          setOrders(fetchedOrders)
        }
      } catch (err) {
        console.error('Error fetching orders:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [orderIds, reference])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount).replace(/[\n\r\t\s]+/g, '')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    )
  }

  const totalAmount = orders.reduce((sum, o) => sum + (o.total || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-4">
            Thank you for your purchase. Your order has been confirmed and is being processed.
          </p>
          {orders.length > 0 && (
            <div className="inline-block bg-purple-50 rounded-lg px-4 py-2">
              <p className="text-sm text-purple-600">
                {orders.length > 1 ? 'Order Numbers' : 'Order Number'}
              </p>
              <p className="text-lg font-bold text-purple-700">
                {orders.map(o => o.orderNumber).join(', ')}
              </p>
            </div>
          )}
          {reference && orders.length === 0 && (
            <div className="inline-block bg-purple-50 rounded-lg px-4 py-2">
              <p className="text-sm text-purple-600">Payment Reference</p>
              <p className="text-lg font-bold text-purple-700">{reference}</p>
            </div>
          )}
        </div>

        {/* Email Confirmation Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Confirmation email sent</p>
            <p className="text-sm text-blue-700">
              We&apos;ve sent a confirmation email with your order details. Check your inbox!
            </p>
          </div>
        </div>

        {/* Order Details */}
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order #{order.orderNumber}
              </h2>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {order.status}
              </span>
            </div>

            {/* Items */}
            <div className="divide-y">
              {order.items && order.items.length > 0 ? (
                order.items.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={item.product?.thumbnailUrl || '/images/placeholder.png'}
                        alt={item.product?.title || 'Product'}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.product?.title}</h3>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      <p className="text-purple-600 font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              ) : order.product ? (
                <div className="py-4 flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={order.product.thumbnailUrl || '/images/placeholder.png'}
                      alt={order.product.title || 'Product'}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{order.product.title}</h3>
                    <p className="text-sm text-gray-500">Quantity: {order.quantity || 1}</p>
                  </div>
                </div>
              ) : null}
            </div>
            
            {/* Order Total */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900">Order Total</span>
                <span className="text-purple-600">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping To
                </h3>
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900">
                    {order.shippingAddress.name || order.shippingAddress.fullName}
                  </p>
                  <p>{order.shippingAddress.address || order.shippingAddress.street}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                  <p className="flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {order.shippingAddress.phone}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Total Summary (if multiple orders) */}
        {orders.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Paid</span>
              <span className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}

        {/* What's Next */}
        <div className="bg-purple-50 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-purple-900 mb-4">What&apos;s Next?</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-700 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-purple-900">Order Processing</p>
                <p className="text-sm text-purple-700">We&apos;re preparing your items for shipment</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-700 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-purple-900">Shipping</p>
                <p className="text-sm text-purple-700">You&apos;ll receive tracking information via email</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-700 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-purple-900">Delivery</p>
                <p className="text-sm text-purple-700">Your items will arrive within 3-7 business days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/boutique/orders"
            className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold text-center hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            View All Orders
          </Link>
          <Link
            href="/boutique"
            className="flex-1 bg-white text-gray-700 py-3 px-6 rounded-xl font-semibold text-center border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
