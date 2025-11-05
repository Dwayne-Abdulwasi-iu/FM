'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SafeImage from '@/components/ui/safe-image'
import { Copy, Search, MoreHorizontal } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface OrderListItem {
  id: string
  orderNumber: string
  totalAmount: number
  platformFee: number
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    price: number
    design: { id: string; title: string; imageUrl: string; designer: { id: string; name: string | null } }
  }>
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/orders', { cache: 'no-store' })
        if (!res.ok) {
          setError('Failed to load your orders')
          return
        }
        const data = await res.json()
        setOrders(data.orders || [])
      } catch {
        setError('Unable to load your orders right now')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  useEffect(() => {
    const onDocClick = () => setOpenMenuId(null)
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const downloadInvoice = async (orderId: string, orderNumber: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`, { cache: 'no-store' })
      if (!res.ok) {
        toast.error('Invoice not available')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download invoice')
    }
  }

  const formatPrice = (price: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  const formatDate = (d: string) => new Date(d).toLocaleString()

  const filtered = useMemo(() => {
    if (!query.trim()) return orders
    const q = query.toLowerCase()
    return orders.filter(o =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.items.some(it => it.design.title.toLowerCase().includes(q))
    )
  }, [orders, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h1>
        {error && (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800">{error}</div>
        )}
        {orders.length === 0 ? (
          <div className="text-center bg-white rounded-lg p-8 border border-gray-200">
            <p className="text-gray-700 mb-4">You have no orders yet.</p>
            <Link href="/designs" className="text-indigo-600 hover:text-indigo-800 font-medium">Browse designs</Link>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                  placeholder="Search by order number or design title..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder-gray-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              {current.map((order) => (
                <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-4 relative">
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/orders/${order.id}`} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium truncate max-w-[18rem]">
                          {order.orderNumber}
                        </Link>
                        <button
                          onClick={async () => {
                            try {
                              const base = typeof window !== 'undefined' ? window.location.origin : ''
                              await navigator.clipboard.writeText(`${base}/profile/orders/${order.id}`)
                              toast.success('Order link copied')
                            } catch {
                              /* ignore */
                            }
                          }}
                          aria-label="Copy order link"
                          title="Copy order link"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Quick actions dropdown toggle */}
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === order.id ? null : order.id) }}
                            aria-haspopup="true"
                            aria-expanded={openMenuId === order.id ? 'true' : 'false'}
                            title="Quick actions"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === order.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-sm z-20"
                            >
                              <div className="py-1">
                                <Link href={`/profile/orders/${order.id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">View order</Link>
                                <button
                                  onClick={() => downloadInvoice(order.id, order.orderNumber)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Download invoice
                                </button>
                                <Link href={`/customer-care?orderId=${order.id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Contact support</Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="font-semibold text-gray-900 text-lg">{formatPrice(order.totalAmount)}</div>
                      <p className="text-xs text-gray-500">including fees</p>
                    </div>
                  </div>
                  <Link href={`/profile/orders/${order.id}`} className="flex -space-x-2">
                    {order.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="w-12 h-12 rounded overflow-hidden border border-gray-200 bg-gray-100">
                        <SafeImage src={item.design.imageUrl} alt={item.design.title} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="w-12 h-12 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-600">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm">
              <div className="text-gray-600">Page {page} of {totalPages}</div>
              <div className="space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
