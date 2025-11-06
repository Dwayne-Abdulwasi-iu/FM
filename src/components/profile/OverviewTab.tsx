"use client"

import React from 'react'
import Link from 'next/link'

export default function OverviewTab({ designsCount, ordersCount, loading, balance, balanceLoading }: { designsCount: number | null, ordersCount: number | null, loading?: boolean, balance?: number | null, balanceLoading?: boolean }) {
  return (
    <div>
      <h2 className="sr-only">Overview</h2>
      <p className="text-sm text-gray-600 mt-2">A quick snapshot of your activity. Use the actions to manage your designs and view orders.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-md">
          <div className="text-sm text-gray-500">Designs</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '…' : (designsCount ?? '—')}</div>
          <div className="mt-3">
            <Link href="/designs" className="text-indigo-600 underline">View designs</Link>
          </div>
        </div>

        <div className="p-4 bg-white border rounded-md">
          <div className="text-sm text-gray-500">Orders</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{loading ? '…' : (ordersCount ?? '—')}</div>
          <div className="mt-3">
            <Link href="/profile/orders" className="text-indigo-600 underline">View orders</Link>
          </div>
        </div>

        <div className="p-4 bg-white border rounded-md">
          <div className="text-sm text-gray-500">Balance</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{(balanceLoading ?? loading) ? '…' : (balance != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance) : '—')}</div>
          <div className="mt-3">
            {/* Use the earnings route which redirects to the profile Earnings tab to be robust */}
            <Link href="/profile/earnings" className="text-indigo-600 underline">View earnings</Link>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link href="/upload" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Upload design</Link>
        <Link href="/designs" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Browse designs</Link>
      </div>
    </div>
  )
}
