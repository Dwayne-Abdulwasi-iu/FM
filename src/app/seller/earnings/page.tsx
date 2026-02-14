'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Wallet,
  ArrowRight,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Banknote,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface EarningsStats {
  totalEarnings: number
  pendingPayout: number
  availableBalance: number
  totalWithdrawn: number
  thisMonthEarnings: number
  lastMonthEarnings: number
}

interface Transaction {
  id: string
  type: 'EARNING' | 'PAYOUT' | 'REFUND'
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  description: string
  createdAt: string
  orderId?: string
  designTitle?: string
}

export default function SellerEarningsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<EarningsStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<'ALL' | 'EARNING' | 'PAYOUT' | 'REFUND'>('ALL')
  const [dateRange, setDateRange] = useState('30')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Reset page to 1 when filter or dateRange changes
    setPage(1)
  }, [filter, dateRange])

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session?.user?.role && !['SELLER', 'ADMIN'].includes(session.user.role)) {
      router.push('/')
      return
    }
    fetchEarningsData()
  }, [session, authStatus, router, filter, dateRange, page])

  const fetchEarningsData = async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch stats
      const statsResponse = await fetch('/api/seller/earnings/stats')
      if (!statsResponse.ok) {
        const statsError = await statsResponse.json().catch(() => ({}))
        throw new Error(statsError.error || statsError.message || 'Failed to fetch earnings stats')
      }
      const statsData = await statsResponse.json()
      setStats(statsData)

      // Fetch transactions
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        days: dateRange,
        ...(filter !== 'ALL' && { type: filter }),
      })
      const txResponse = await fetch(`/api/seller/earnings/transactions?${queryParams}`)
      if (!txResponse.ok) {
        const txError = await txResponse.json().catch(() => ({}))
        throw new Error(txError.error || txError.message || 'Failed to fetch transactions')
      }
      const txData = await txResponse.json()
      setTransactions(txData.transactions || [])
      setHasMore(txData.hasMore || false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to fetch earnings data:', error)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'EARNING':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case 'PAYOUT':
        return <Banknote className="w-5 h-5 text-blue-500" />
      case 'REFUND':
        return <RefreshCw className="w-5 h-5 text-red-500" />
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        )
      default:
        return null
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Links */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/seller/finances" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            ← Finances Hub
          </Link>
          <span className="text-gray-400">•</span>
          <Link href="/seller/payments" className="text-sm text-indigo-600 hover:text-indigo-700">
            Payment History
          </Link>
          <span className="text-gray-400">•</span>
          <Link href="/seller/transfers" className="text-sm text-indigo-600 hover:text-indigo-700">
            Transfers
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
            <p className="text-gray-600 mt-1">Track your sales and payouts</p>
          </div>
          <Link
            href="/seller/transfers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Wallet className="w-4 h-4" />
            Request Payout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.totalEarnings || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Available Balance */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.availableBalance || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Payout */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Payout</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.pendingPayout || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.thisMonthEarnings || 0)}
                </p>
                {stats?.lastMonthEarnings !== undefined && (
                  <p className="text-xs text-gray-400">
                    Last month: {formatCurrency(stats.lastMonthEarnings)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bank Account Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Payout Account</h3>
                <p className="text-sm text-gray-500">
                  Configure your bank account to receive payouts
                </p>
              </div>
            </div>
            <Link
              href="/seller/settings#bank"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
            >
              Manage Account
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
              <div className="flex items-center gap-3">
                {/* Filter */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Filter by transaction type"
                >
                  <option value="ALL">All Types</option>
                  <option value="EARNING">Earnings</option>
                  <option value="PAYOUT">Payouts</option>
                  <option value="REFUND">Refunds</option>
                </select>

                {/* Date Range */}
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Select date range"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 3 months</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            </div>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchEarningsData}
                className="mt-4 text-indigo-600 hover:text-indigo-800"
              >
                Try Again
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No transactions found</p>
              <p className="text-sm text-gray-400 mt-1">
                Earnings will appear here when you make sales
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tx.description}</p>
                          {tx.designTitle && (
                            <p className="text-sm text-gray-500">{tx.designTitle}</p>
                          )}
                          <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            tx.type === 'EARNING'
                              ? 'text-green-600'
                              : tx.type === 'REFUND'
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {tx.type === 'EARNING' ? '+' : tx.type === 'REFUND' ? '-' : ''}
                          {formatCurrency(tx.amount)}
                        </p>
                        {getStatusBadge(tx.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {hasMore && (
                <div className="p-4 border-t border-gray-100 text-center">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-indigo-50 rounded-xl p-6">
          <h3 className="font-medium text-indigo-900 mb-2">Understanding Your Earnings</h3>
          <ul className="text-sm text-indigo-800 space-y-2">
            <li>• <strong>Platform Fee:</strong> 10% is deducted from each sale</li>
            <li>• <strong>Available Balance:</strong> Funds ready for withdrawal</li>
            <li>• <strong>Pending:</strong> Earnings from recent sales (held for 7 days)</li>
            <li>• <strong>Payouts:</strong> Processed within 2-5 business days</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
