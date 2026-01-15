'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { AlertCircle, CheckCircle, Clock, TrendingUp, DollarSign, ArrowRight } from 'lucide-react'

interface Transfer {
  id: string
  orderId: string
  designId: string
  amountUSD: number
  amountNGN: number
  exchangeRate: number
  paystackStatus: string
  paystackReference?: string
  errorMessage?: string
  retryCount: number
  createdAt: string
  succeededAt?: string
}

interface TransferStats {
  totalTransfers: number
  successfulTransfers: number
  failedTransfers: number
  pendingTransfers: number
  totalAmountUSD: number
  totalAmountNGN: number
}

export default function SellerTransfersPage() {
  const { data: session, status } = useSession()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [stats, setStats] = useState<TransferStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetchTransfers()
    }
  }, [status, session])

  async function fetchTransfers() {
    try {
      setLoading(true)
      const response = await fetch('/api/seller/transfers')

      if (!response.ok) {
        throw new Error('Failed to fetch transfers')
      }

      const data = await response.json()
      setTransfers(data.transfers || [])
      setStats(data.stats || null)
      setError('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Fetch transfers error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading your transfers...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Please sign in to view your transfers</p>
          <Link href="/auth/signin" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const filteredTransfers = selectedStatus
    ? transfers.filter(t => t.paystackStatus === selectedStatus)
    : transfers

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">Payment Transfers</h1>
          <p className="text-xs sm:text-sm text-gray-600">Track your earnings and transfer status</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg shadow p-2.5 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600 text-[10px] sm:text-xs">Total Transfers</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-base sm:text-xl font-bold text-gray-900">{stats.totalTransfers}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-2.5 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600 text-[10px] sm:text-xs">Successful</span>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-base sm:text-xl font-bold text-green-600">{stats.successfulTransfers}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-2.5 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600 text-[10px] sm:text-xs">Pending</span>
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-base sm:text-xl font-bold text-yellow-600">{stats.pendingTransfers}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-2.5 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600 text-[10px] sm:text-xs">Failed</span>
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-base sm:text-xl font-bold text-red-600">{stats.failedTransfers}</p>
            </div>
          </div>
        )}

        {/* Earnings Summary */}
        {stats && stats.totalAmountNGN > 0 && (
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-[10px] sm:text-xs mb-0.5">Total Earnings (Successful Transfers)</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  ₦{stats.totalAmountNGN.toLocaleString()}
                </p>
                <p className="text-gray-500 text-[9px] sm:text-xs mt-0.5">
                  ${stats.totalAmountUSD.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 sm:w-10 h-8 sm:h-10 text-green-600 opacity-20" />
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 flex-wrap">
          <button
            onClick={() => setSelectedStatus(null)}
            className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              selectedStatus === null
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus('SUCCESS')}
            className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              selectedStatus === 'SUCCESS'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setSelectedStatus('PENDING')}
            className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              selectedStatus === 'PENDING'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setSelectedStatus('FAILED')}
            className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              selectedStatus === 'FAILED'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Failed
          </button>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Clock className="w-8 h-8 text-blue-600 animate-spin mr-3" />
              <p className="text-gray-600">Loading transfers...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {selectedStatus ? `No ${selectedStatus.toLowerCase()} transfers` : 'No transfers yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reference</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Retries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransfers.map(transfer => (
                    <tr key={transfer.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(transfer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">
                          ₦{transfer.amountNGN.toLocaleString()}
                        </div>
                        <div className="text-gray-500 text-xs">
                          ${transfer.amountUSD.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {transfer.paystackStatus === 'SUCCESS' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-700 font-medium">Success</span>
                            </>
                          )}
                          {transfer.paystackStatus === 'PENDING' && (
                            <>
                              <Clock className="w-4 h-4 text-yellow-600" />
                              <span className="text-yellow-700 font-medium">Pending</span>
                            </>
                          )}
                          {transfer.paystackStatus === 'FAILED' && (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="text-red-700 font-medium">Failed</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transfer.paystackReference ? (
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {transfer.paystackReference.substring(0, 12)}...
                          </code>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transfer.retryCount > 0 ? (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                            {transfer.retryCount} attempt{transfer.retryCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-blue-900 mb-2 text-xs sm:text-sm">About Payment Transfers</h3>
          <ul className="text-[10px] sm:text-xs text-blue-800 space-y-0.5">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Commission rates are tiered (7-10%) based on your total sales - first $100 is free!</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Transfers are processed automatically when customers complete payment</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Failed transfers are retried automatically with exponential backoff</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Exchange rates are updated hourly from live market data</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
