'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DollarSign, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

interface Transaction {
  id: string
  orderId: string
  processor: string
  currency: string
  buyerAmount: number
  platformFee: number
  sellerPayout: number
  processorFee: number
  initiatedAt: string
  completedAt: string
  payoutStatus: string
  payoutScheduledAt: string
  payoutCompletedAt: string
  processorStatus: string
  failureReason?: string
  order: {
    id: string
    orderNumber: string
    status: string
    total: number
    items: Array<{
      id: string
      product: { title: string }
      quantity: number
      price: number
    }>
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

interface Summary {
  totalTransactions: number
  totalRevenue: number
  totalPayout: number
  totalPlatformFee: number
  totalProcessorFee: number
}

export default function SellerPaymentsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })
  const [summary, setSummary] = useState<Summary>({
    totalTransactions: 0,
    totalRevenue: 0,
    totalPayout: 0,
    totalPlatformFee: 0,
    totalProcessorFee: 0,
  })

  const [filters, setFilters] = useState({
    status: '',
    processor: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPayments()
    }
  }, [status, pagination.page, filters])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.processor && { processor: filters.processor }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      })

      const res = await fetch(`/api/seller/payments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch payments')

      const data = await res.json()
      setTransactions(data.transactions)
      setPagination(data.pagination)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'FAILED':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'INITIATED':
        return 'bg-blue-50 border-blue-200 text-blue-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getProcessorBadge = (processor: string) => {
    switch (processor) {
      case 'PAYSTACK':
        return 'bg-indigo-100 text-indigo-800'
      case 'STRIPE':
        return 'bg-purple-100 text-purple-800'
      case 'FLUTTERWAVE':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Payment Audit Trail</h1>
          <p className="text-gray-600">Track all your transactions, payouts, and processor details</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₦{summary.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="text-indigo-600 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Your Payout</p>
                <p className="text-2xl font-bold text-gray-900">₦{summary.totalPayout.toLocaleString()}</p>
              </div>
              <TrendingUp className="text-green-600 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Platform Fee</p>
                <p className="text-2xl font-bold text-gray-900">₦{summary.totalPlatformFee.toLocaleString()}</p>
              </div>
              <AlertCircle className="text-orange-600 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Processor Fee</p>
                <p className="text-2xl font-bold text-gray-900">₦{summary.totalProcessorFee.toLocaleString()}</p>
              </div>
              <Clock className="text-red-600 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalTransactions}</p>
              </div>
              <CheckCircle className="text-blue-600 w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payout Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="INITIATED">Initiated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Processor</label>
              <select
                value={filters.processor}
                onChange={(e) => handleFilterChange('processor', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Processors</option>
                <option value="PAYSTACK">Paystack</option>
                <option value="STRIPE">Stripe</option>
                <option value="FLUTTERWAVE">Flutterwave</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Processor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Currency</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Buyer Paid</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Your Payout</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Platform Fee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{txn.order.orderNumber}</span>
                          <span className="text-xs text-gray-500">{txn.orderId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getProcessorBadge(txn.processor)}`}>
                          {txn.processor}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{txn.currency}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        ₦{txn.buyerAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                        ₦{txn.sellerPayout.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-600">
                        ₦{txn.platformFee.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getPayoutStatusColor(
                            txn.payoutStatus
                          )}`}
                        >
                          {txn.payoutStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(txn.completedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))
                  }
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
