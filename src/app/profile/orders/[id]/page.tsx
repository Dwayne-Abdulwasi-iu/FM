'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SafeImage from '@/components/ui/safe-image'
import { Copy } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface OrderItem {
  id: string
  quantity: number
  price: number
  design: {
    id: string
    title: string
    imageUrl: string
    designer: { id: string; name: string | null; username?: string | null }
  }
}

interface OrderDetails {
  id: string
  orderNumber: string
  totalAmount: number
  platformFee: number
  createdAt: string
  items: OrderItem[]
}

function OrderDetailsInner() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const orderId = params?.id as string | undefined
    if (!orderId) {
      setLoading(false)
      setError('Missing order id')
      return
    }

    const run = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' })
        if (!res.ok) {
          setError(res.status === 404 ? 'Order not found' : 'Failed to load order')
          return
        }
        const data = await res.json()
        setOrder(data.order)
      } catch {
        setError('Unable to load order right now')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [params])

  const formatPrice = (price: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  const formatDate = (d: string) => new Date(d).toLocaleString()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error ?? 'Order Not Found'}</h1>
          <Link href="/profile/orders" className="text-indigo-600 hover:text-indigo-800">Back to Orders</Link>
        </div>
      </div>
    )
  }

  const subtotal = order.totalAmount - order.platformFee

  return (
    <div className="min-h-screen bg-gray-50 py-8 overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">← Back</button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
              <p className="text-sm text-gray-600">Placed on {formatDate(order.createdAt)}</p>
              <button
                onClick={async () => {
                  try {
                    const href = typeof window !== 'undefined' ? window.location.href : ''
                    if (href) {
                      await navigator.clipboard.writeText(href)
                      toast.success('Order link copied')
                    }
                  } catch {
                    // no-op; keep UI calm
                  }
                }}
                className="mt-2 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <Copy className="h-3 w-3" /> Copy link
              </button>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Paid</div>
              <div className="text-lg font-semibold text-gray-900">{formatPrice(order.totalAmount)}</div>
              <div className="mt-2">
                <a
                  href={`/api/orders/${order.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v9.69l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V3a.75.75 0 01.75-.75z" clipRule="evenodd" /><path d="M3 13.5a.75.75 0 01.75.75v3.75A2.25 2.25 0 006 20.25h12a2.25 2.25 0 002.25-2.25v-3.75a.75.75 0 011.5 0v3.75A3.75 3.75 0 0118 21.75H6A3.75 3.75 0 012.25 18v-3.75a.75.75 0 01.75-.75z" /></svg>
                  Download All
                </a>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
                  <SafeImage src={item.design.imageUrl} alt={item.design.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.design.title}</div>
                  <div className="text-sm text-gray-600">by {item.design.designer.username || item.design.designer.name || 'Anonymous'}</div>
                  <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                </div>
                <div className="text-right font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Platform Fee (5%)</span><span>{formatPrice(order.platformFee)}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-gray-300">
              <span className="font-semibold text-gray-900">Total</span><span className="font-semibold text-gray-900">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-gray-50" /> }>
        <OrderDetailsInner />
      </Suspense>
    </ErrorBoundary>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err: unknown) {
    console.error('Order details page error:', err)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">We couldn&#39;t load the order</h1>
            <p className="text-gray-600 mb-4">Please refresh this page or go back to your orders list.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => (typeof window !== 'undefined' ? window.location.reload() : null)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Refresh</button>
              <Link href="/profile/orders" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">My Orders</Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children as React.ReactElement
  }
}
