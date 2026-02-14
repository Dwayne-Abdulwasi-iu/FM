'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { TrendingUp, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react'

interface Transaction {
  id: string
  processor: string
  currency: string
  buyerAmount: number
  processorFee: number
  platformFee: number
  sellerPayout: number
  processorStatus: string
  payoutStatus: string
  completedAt: string
  reconciliationStatus: string
  buyer: { email: string; name: string }
  seller: { email: string; name: string }
}

interface ReconciliationReport {
  id: string
  processor: string
  reportDate: string
  periodStart: string
  periodEnd: string
  expectedBalance: number
  actualBalance: number
  discrepancy: number
  status: string
  reviewedAt: string
}

interface Overview {
  totalTransactions: number
  totalRevenue: number
  totalProcessorFees: number
  totalPlatformFees: number
  totalPayouts: number
  pendingPayouts: number
}

export default function AdminPaymentReconciliationPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<Overview>({
    totalTransactions: 0,
    totalRevenue: 0,
    totalProcessorFees: 0,
    totalPlatformFees: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
  })

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [reports, setReports] = useState<ReconciliationReport[]>([])
  const [processorSummaries, setProcessorSummaries] = useState<Record<string, any>>({})
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, any>>({})

  const [filters, setFilters] = useState({
    processor: '',
    startDate: '',
    endDate: '',
  })

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReconciliationData()
    }
  }, [status, page, filters])

  const fetchReconciliationData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.processor && { processor: filters.processor }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      })

      const res = await fetch(`/api/admin/payment-reconciliation?${params}`)
      if (!res.ok) throw new Error('Failed to fetch reconciliation data')

      const data = await res.json()
      setTransactions(data.transactions)
      setOverview(data.overview)
      setReports(data.reconciliationReports)
      setProcessorSummaries(data.processorSummaries)
      setStatusBreakdown(data.statusBreakdown)
      setTotalPages(data.pagination.pages)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load reconciliation data')
    } finally {
      setLoading(false)
    }
  }

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200'
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200'
      case 'FAILED':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-3 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Payment Reconciliation</h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600">Monitor processor balances, transaction status, and reconciliation reports</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base truncate">Total Revenue</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 truncate">₦{overview.totalRevenue.toLocaleString()}</p>
              </div>
              <BarChart3 className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base truncate">Total Payouts</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 truncate">₦{overview.totalPayouts.toLocaleString()}</p>
              </div>
              <CheckCircle className="text-green-600 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base truncate">Pending Payouts</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 truncate">₦{overview.pendingPayouts.toLocaleString()}</p>
              </div>
              <AlertTriangle className="text-red-600 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-6 border-l-4 border-orange-600">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base truncate">Processor Fees</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 truncate">₦{overview.totalProcessorFees.toLocaleString()}</p>
              </div>
              <TrendingUp className="text-orange-600 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base truncate">Platform Fees</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 truncate">₦{overview.totalPlatformFees.toLocaleString()}</p>
              </div>
              <BarChart3 className="text-purple-600 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-6 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-gray-600 text-xs sm:text-sm lg:text-base truncate">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalTransactions}</p>
              </div>
              <BarChart3 className="text-indigo-600 w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Processor Summaries */}
        {Object.keys(processorSummaries).length > 0 && (
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Processor Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {Object.entries(processorSummaries).map(([processor, data]: any) => (
                <div key={processor} className="border border-gray-200 rounded-lg p-2 sm:p-3 lg:p-4">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 sm:mb-2">{processor}</h3>
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transactions:</span>
                      <span className="font-medium">{data.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-medium">₦{data.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fees:</span>
                      <span className="font-medium">₦{data.fees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payouts:</span>
                      <span className="font-medium text-green-600">₦{data.payouts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-2 sm:p-3 lg:p-6 mb-2 sm:mb-4 lg:mb-8">
          <h2 className="text-xs sm:text-base lg:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2 lg:mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 lg:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">Processor</label>
              <select
                value={filters.processor}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, processor: e.target.value }))
                  setPage(1)
                }}
                className="w-full border border-gray-300 rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Processors</option>
                <option value="PAYSTACK">Paystack</option>
                <option value="STRIPE">Stripe</option>
                <option value="FLUTTERWAVE">Flutterwave</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                  setPage(1)
                }}
                className="w-full border border-gray-300 rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5 sm:mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                  setPage(1)
                }}
                className="w-full border border-gray-300 rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4 sm:mb-6 lg:mb-8">
          <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 border-b border-gray-200">
            <h2 className="text-xs sm:text-base lg:text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-xs font-semibold text-gray-900">Seller</th>
                  <th className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-xs font-semibold text-gray-900">Processor</th>
                  <th className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-3 text-right text-xs font-semibold text-gray-900">Amount</th>
                  <th className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-3 text-right text-xs font-semibold text-gray-900">Payout</th>
                  <th className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-xs font-semibold text-gray-900">Status</th>
                  <th className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-3 text-left text-xs font-semibold text-gray-900">Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-3 lg:px-6 py-2 sm:py-4 lg:py-6 text-center text-xs text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className={`hover:bg-gray-50 ${getPayoutStatusColor(txn.payoutStatus)}`}>
                      <td className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-gray-900 truncate">{txn.seller.name}</span>
                          <span className="text-xs text-gray-500 truncate hidden sm:block">{txn.seller.email}</span>
                        </div>
                      </td>
                      <td className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-4">
                        <span className="inline-block bg-gray-100 px-1 sm:px-2 py-0.5 rounded text-xs font-medium truncate">
                          {txn.processor}
                        </span>
                      </td>
                      <td className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-4 text-right">
                        <span className="font-medium text-xs text-gray-900 truncate">₦{txn.buyerAmount.toFixed(2)}</span>
                      </td>
                      <td className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-4 text-right">
                        <span className="font-medium text-xs text-green-600 truncate">₦{txn.sellerPayout.toFixed(2)}</span>
                      </td>
                      <td className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-4">
                        <span className="inline-block px-1 sm:px-2 py-0.5 rounded text-xs font-medium bg-opacity-20 bg-gray-800 truncate">
                          {txn.payoutStatus}
                        </span>
                      </td>
                      <td className="px-1 sm:px-3 lg:px-6 py-1.5 sm:py-2 lg:py-4">
                        <span className="inline-block px-1 sm:px-2 py-0.5 rounded text-xs font-medium bg-opacity-20 bg-blue-800 truncate">
                          {txn.reconciliationStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Reconciliation Reports</h2>
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{report.processor}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Expected</p>
                      <p className="font-medium">₦{report.expectedBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Actual</p>
                      <p className="font-medium">₦{report.actualBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Discrepancy</p>
                      <p className={`font-medium ${report.discrepancy !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₦{report.discrepancy.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Report Date</p>
                      <p className="font-medium">{new Date(report.reportDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
