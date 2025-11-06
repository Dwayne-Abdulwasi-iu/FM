"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import SafeImage from '@/components/ui/safe-image'

export default function OrdersTab() {
  type OrderItem = {
    id: string
    orderNumber: string
    totalAmount: number
    createdAt: string
    items: Array<{ id: string; design: { id: string; title: string; imageUrl: string } }>
  }

  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const res = await fetch('/api/orders')
        if (!res.ok) return
        const data = await res.json()
        if (mounted && Array.isArray(data.orders)) setOrders((data.orders as OrderItem[]).slice(0, 5))
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
      <p className="text-sm text-gray-600 mt-2">All orders placed for your designs. View details and invoices in the orders page.</p>
      <div className="mt-4">
        <Link href="/profile/orders" className="text-indigo-600 underline">View orders</Link>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="text-sm text-gray-600">You have no orders yet.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.id} href={`/profile/orders/${o.id}`} className="flex items-center gap-3 bg-white border rounded p-3">
                <div className="flex -space-x-2">
                  {o.items.slice(0, 3).map((it) => (
                    <div key={it.id} className="w-12 h-12 rounded overflow-hidden border border-gray-200 bg-gray-100">
                      <SafeImage src={it.design.imageUrl} alt={it.design.title} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {o.items.length > 3 && (
                    <div className="w-12 h-12 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-600">+{o.items.length - 3}</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-indigo-600 font-medium truncate max-w-[18rem]">{o.orderNumber}</div>
                    <div className="text-sm text-gray-900 font-semibold">${(o.totalAmount || 0).toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
