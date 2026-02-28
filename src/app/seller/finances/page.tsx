'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrency } from '@/components/CurrencyProvider'
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  _ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  _RefreshCw,
} from 'lucide-react'

interface FinancesSummary {
  totalEarnings: number
  availableBalance: number
  pendingPayout: number
  totalTransfers: number
  successfulTransfers: number
  pendingTransfers: number
  failedTransfers: number
  totalAmountTransferred: number
  recentEarnings: number
  thisMonthEarnings: number
}

interface QuickLink {
  href: string
  label: string
  icon: any
  description: string
  color: string
}

export default function FinancesHub() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<FinancesSummary | null>(null)

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/seller/finances/summary')
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || 'Failed to load finances')
      }
      const data = await response.json()
      setSummary(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Failed to fetch finances summary:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'loading') return
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    // Check seller role
    if (session?.user?.role && !['SELLER', 'ADMIN'].includes(session.user.role)) {
      router.push('/')
      return
    }

    fetchSummary()
  }, [authStatus, session, router])

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your finances...</p>
        </div>
      </div>
    )
  }

  const quickLinks: QuickLink[] = [
    {
      href: '/seller/earnings',
      label: 'Earnings',
      icon: TrendingUp,
      description: 'Track your sales, income, and monthly earnings',
      color: 'from-green-50 to-green-100 border-l-4 border-green-500',
    },
    {
      href: '/seller/payments',
      label: 'Payment History',
      icon: CreditCard,
      description: 'View transactions, fees, and processor details',
      color: 'from-purple-50 to-purple-100 border-l-4 border-purple-500',
    },
    {
      href: '/seller/transfers',
      label: 'Transfers',
      icon: Wallet,
      description: 'Manage payouts and transfer requests',
      color: 'from-blue-50 to-blue-100 border-l-4 border-blue-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-12">
          <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Finances</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Centralized hub for all your financial information</p>
              </div>
            </div>
            <button
              onClick={fetchSummary}
              disabled={loading}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 sm:gap-2 flex-shrink-0"
              title="Refresh financial data"
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2 sm:p-4 mb-4 sm:mb-8">
            <div className="flex gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm sm:text-base font-semibold text-red-900">Error loading finances</p>
                <p className="text-red-800 text-xs sm:text-sm">{error}</p>
                <button
                  onClick={fetchSummary}
                  disabled={loading}
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium mt-2 disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {summary && summary.totalEarnings === 0 && summary.totalTransfers === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-8 mb-4 sm:mb-8 text-center">
            <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-2 sm:mb-4 opacity-50" />
            <h3 className="text-sm sm:text-lg font-semibold text-blue-900 mb-1 sm:mb-2">No Financial Activity Yet</h3>
            <p className="text-blue-800 text-xs sm:text-sm mb-2 sm:mb-4">
              Your financial data will appear here once you make your first sale or transfer.
            </p>
            <Link href="/upload" className="inline-block text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm bg-blue-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-200 transition">
              → Upload Your First Design
            </Link>
          </div>
        )}

        {/* Quick Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-6 sm:mb-12">
            {/* Total Earnings */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border-t-4 border-green-500 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Total Earnings</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">
                    {formatPrice(summary.totalEarnings || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 sm:mt-2">This Month: {formatPrice(summary.thisMonthEarnings || 0)}</p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 opacity-20 flex-shrink-0" />
              </div>
            </div>

            {/* Available Balance */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border-t-4 border-blue-500 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Available Balance (USD)</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">
                    ${(summary.availableBalance || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 sm:mt-2">Ready to transfer</p>
                </div>
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 opacity-20 flex-shrink-0" />
              </div>
            </div>

            {/* Pending Payout */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border-t-4 border-yellow-500 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Pending Payout (USD)</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">
                    ${(summary.pendingPayout || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 sm:mt-2">Being processed</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 opacity-20 flex-shrink-0" />
              </div>
            </div>

            {/* Total Transferred */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 border-t-4 border-indigo-500 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Total Transferred</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">
                    {formatPrice(summary.totalAmountTransferred || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 sm:mt-2">{summary.successfulTransfers} successful</p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 opacity-20 flex-shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Transfer Status Overview */}
        {summary && (summary.totalTransfers > 0 || summary.totalEarnings > 0) && (
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 mb-6 sm:mb-12 border-b-4 border-indigo-200">
            <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">Transfer Status</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{summary.successfulTransfers}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Successful</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{summary.pendingTransfers}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{summary.failedTransfers}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Failed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Navigation Cards */}
        <div className="mb-12">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-6">Finance Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
            {quickLinks.map((link, index) => {
              const Icon = link.icon
              return (
                <Link key={index} href={link.href}>
                  <div className={`bg-gradient-to-br ${link.color} rounded-xl p-3 sm:p-6 h-full hover:shadow-lg transition-all duration-300 cursor-pointer group`}>
                    <div className="flex items-start justify-between mb-2 sm:mb-4">
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700 group-hover:scale-110 transition" />
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-sm sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">{link.label}</h3>
                    <p className="text-gray-700 text-xs sm:text-sm">{link.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Understanding Your Finances</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li><strong>Total Earnings:</strong> All sales income in USD from all time</li>
                <li><strong>Available Balance:</strong> USD available to request as payout (Earnings - Transferred - Pending)</li>
                <li><strong>Pending Payout:</strong> USD in transfers currently being processed</li>
                <li><strong>Total Transferred:</strong> USD successfully transferred to your bank account</li>
                <li className="pt-2 border-t border-blue-200"><strong>Earnings:</strong> Detailed USD earnings breakdown by order</li>
                <li><strong>Payment History:</strong> Transaction audit trail with NGN processor fees and details</li>
                <li><strong>Transfers:</strong> Payout request history and NGN transfer status</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
