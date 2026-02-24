'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, TrendingUp } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

interface Referrer {
  email: string
  name: string | null
  code: string
  referrals: number
}

interface AnalyticsSummary {
  totalPageViews: number
  totalSignups: number
  signupConversionRate: string
  referralSignups: number
  referralConversionRate: string
  topReferrers: Referrer[]
}

export default function ComingSoonAnalyticsPage() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // Check admin access
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login')
    }
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      redirect('/')
    }
  }, [status, session])

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/coming-soon/analytics', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const result = await response.json()
      setData(result.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = (code: string) => {
    const referralUrl = `https://fashionmarketplace.store/coming-soon?ref=${code}`
    navigator.clipboard.writeText(referralUrl)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-slate-700 rounded"></div>
              <div className="h-32 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-red-200">
            <p className="font-semibold mb-2">Error Loading Analytics</p>
            <p>{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Coming Soon Analytics</h1>
          <p className="text-slate-400">Track referrals, signups, and campaign performance</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Signups */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium uppercase">Total Signups</h3>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{data.totalSignups}</div>
            <p className="text-slot-500 text-sm">
              {data.signupConversionRate} conversion rate
            </p>
          </div>

          {/* Referral Signups */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium uppercase">Referral Signups</h3>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{data.referralSignups}</div>
            <p className="text-slate-500 text-sm">
              {data.referralConversionRate} of signups
            </p>
          </div>

          {/* Page Views */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium uppercase">Page Views</h3>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{data.totalPageViews}</div>
            <p className="text-slate-500 text-sm">
              Total visitors
            </p>
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
            <h2 className="text-xl font-bold text-white">Top Referrers</h2>
            <p className="text-slate-400 text-sm mt-1">Users with the most referrals</p>
          </div>

          {data.topReferrers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/25">
                    <th className="text-left px-6 py-4 text-slate-400 font-semibold text-sm">Rank</th>
                    <th className="text-left px-6 py-4 text-slate-400 font-semibold text-sm">Name</th>
                    <th className="text-left px-6 py-4 text-slate-400 font-semibold text-sm">Email</th>
                    <th className="text-left px-6 py-4 text-slate-400 font-semibold text-sm">Referral Code</th>
                    <th className="text-center px-6 py-4 text-slate-400 font-semibold text-sm">Referrals</th>
                    <th className="text-center px-6 py-4 text-slate-400 font-semibold text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topReferrers.map((referrer, idx) => (
                    <tr key={referrer.code} className="border-b border-slate-700 hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4 text-white font-semibold">#{idx + 1}</td>
                      <td className="px-6 py-4 text-white">{referrer.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-300 text-sm break-all">{referrer.email}</td>
                      <td className="px-6 py-4">
                        <code className="bg-slate-900 px-3 py-2 rounded text-purple-300 text-sm font-mono">
                          {referrer.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full font-semibold text-sm">
                          {referrer.referrals}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => copyCode(referrer.code)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm transition"
                        >
                          {copied === referrer.code ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Link
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate-400">
              <p>No referrals yet</p>
            </div>
          )}
        </div>

        {/* Referral Link Format Info */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-blue-200 font-semibold mb-2">Share Referral Links</h3>
          <p className="text-blue-300/80 text-sm">
            Copy the code above and share: <code className="bg-slate-900 px-2 py-1 rounded text-blue-300">
              https://fashionmarketplace.store/coming-soon?ref=CODE
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}
