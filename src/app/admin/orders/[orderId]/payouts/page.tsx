import { headers } from 'next/headers'
import Link from 'next/link'

type Item = {
  designId: string
  designTitle: string
  designerId: string | null
  quantity: number
  priceUSD: number
  saleUSD: number
  commissionUSD: number
  sellerUSD: number
  purchaseType: 'REGULAR' | 'OWNERSHIP'
  earning: {
    id: string
    payoutStatus: 'PENDING' | 'SKIPPED_SPLIT' | 'PAID' | 'FAILED'
    payoutProvider: string | null
    payoutTransferId: string | null
    payoutAttemptedAt: string | null
    payoutCompletedAt: string | null
    payoutError: string | null
    payoutCurrency: string | null
    payoutAmountMinor: number | null
    createdAt: string
    sellerAmountUSD: number
    platformCommissionUSD: number
    quantity: number
  } | null
}

type PayoutsResponse = {
  order: {
    id: string
    orderNumber: string | null
    customerId: string
    totalAmountUSD: number
    platformFeeUSD: number | null
    createdAt: string
  }
  items: Item[]
  totals: {
    saleTotalUSD: number
    platformFeeUSD: number
    sellerTotalUSD: number
  }
  statusCounts: Record<string, number>
  paystack: {
    reference?: string
    splitPaymentEnabled?: boolean | null
    metadata?: Record<string, unknown>
    verifyStatus?: number
    note?: string
  } | null
  recommendations: string[]
}

export default async function AdminOrderPayoutsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const h = await headers()
  const cookie = h.get('cookie') || ''
  const base = process.env.NEXTAUTH_URL || ''
  const url = base
    ? `${base}/api/admin/orders/${encodeURIComponent(orderId)}/payouts`
    : `/api/admin/orders/${encodeURIComponent(orderId)}/payouts`

  const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
  if (!res.ok) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Order Payouts</h1>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load payouts breakdown (status {res.status}). Ensure you are signed in as admin and the order exists.
        </div>
        <Link href="/admin" className="text-blue-600 hover:underline">Back to Admin</Link>
      </div>
    )
  }

  const data = (await res.json()) as PayoutsResponse

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order Payouts</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">Back to Admin</Link>
      </div>

      <section className="rounded-md border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Order</h2>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <div><span className="text-gray-500">Order ID:</span> {data.order.id}</div>
          <div><span className="text-gray-500">Order Number:</span> {data.order.orderNumber || '—'}</div>
          <div><span className="text-gray-500">Customer ID:</span> {data.order.customerId}</div>
          <div><span className="text-gray-500">Created:</span> {new Date(data.order.createdAt).toLocaleString()}</div>
          <div><span className="text-gray-500">Order Total (USD):</span> ${data.order.totalAmountUSD.toFixed(2)}</div>
          <div><span className="text-gray-500">Recorded Platform Fee (USD):</span> ${Number(data.order.platformFeeUSD ?? 0).toFixed(2)}</div>
        </div>
      </section>

      <section className="rounded-md border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Items</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2">Design</th>
                <th className="px-3 py-2">Designer</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Price (USD)</th>
                <th className="px-3 py-2">Sale (USD)</th>
                <th className="px-3 py-2">Commission 5% (USD)</th>
                <th className="px-3 py-2">Seller 95% (USD)</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Payout Status</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Attempted</th>
                <th className="px-3 py-2">Completed</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.designId} className="border-t">
                  <td className="px-3 py-2">{it.designTitle}</td>
                  <td className="px-3 py-2 text-gray-600">{it.designerId || '—'}</td>
                  <td className="px-3 py-2">{it.quantity}</td>
                  <td className="px-3 py-2">${it.priceUSD.toFixed(2)}</td>
                  <td className="px-3 py-2">${it.saleUSD.toFixed(2)}</td>
                  <td className="px-3 py-2">${it.commissionUSD.toFixed(2)}</td>
                  <td className="px-3 py-2">${it.sellerUSD.toFixed(2)}</td>
                  <td className="px-3 py-2">{it.purchaseType}</td>
                  <td className="px-3 py-2">{it.earning?.payoutStatus || '—'}</td>
                  <td className="px-3 py-2">{it.earning?.payoutProvider || '—'}</td>
                  <td className="px-3 py-2">{it.earning?.payoutAttemptedAt ? new Date(it.earning.payoutAttemptedAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">{it.earning?.payoutCompletedAt ? new Date(it.earning.payoutCompletedAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 truncate max-w-[240px]">{it.earning?.payoutError || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-medium">
                <td className="px-3 py-2" colSpan={4}>Totals</td>
                <td className="px-3 py-2">${data.totals.saleTotalUSD.toFixed(2)}</td>
                <td className="px-3 py-2">${data.totals.platformFeeUSD.toFixed(2)}</td>
                <td className="px-3 py-2">${data.totals.sellerTotalUSD.toFixed(2)}</td>
                <td className="px-3 py-2" colSpan={5}>&nbsp;</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="rounded-md border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Payout status summary</h2>
        {Object.keys(data.statusCounts || {}).length ? (
          <ul className="flex flex-wrap gap-3 text-sm">
            {Object.entries(data.statusCounts).map(([k, v]) => (
              <li key={k} className="rounded bg-gray-100 px-2 py-1"><span className="text-gray-600">{k}:</span> {v}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-600">No earnings found for this order.</div>
        )}
      </section>

      <section className="rounded-md border bg-white p-4 shadow-sm space-y-2">
        <h2 className="text-lg font-medium">Paystack</h2>
        {data.paystack ? (
          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <div><span className="text-gray-500">Reference:</span> {data.paystack.reference || '—'}</div>
            <div><span className="text-gray-500">Verify Status:</span> {data.paystack.verifyStatus ?? '—'}</div>
            <div>
              <span className="text-gray-500">Split Used:</span>{' '}
              {data.paystack.splitPaymentEnabled === true ? 'Yes' : data.paystack.splitPaymentEnabled === false ? 'No' : 'Unknown'}
            </div>
            {data.paystack.note ? (
              <div className="md:col-span-2"><span className="text-gray-500">Note:</span> {data.paystack.note}</div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-gray-600">No Paystack verification info found for this order.</div>
        )}
      </section>

      {data.recommendations?.length ? (
        <section className="rounded-md border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">Recommendations</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {data.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
