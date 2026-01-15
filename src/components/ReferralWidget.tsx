'use client'

import { useState, useEffect } from 'react'

interface ReferralData {
  referralCode: string
  referralLink: string
  stats: {
    totalReferrals: number
    successfulReferrals: number
    pendingReferrals: number
    totalRewards: number
  }
}

export function ReferralWidget() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    try {
      const response = await fetch('/api/referrals')
      if (response.ok) {
        const data = await response.json()
        setReferralData(data)
      } else if (response.status !== 401) {
        setError('Failed to load referral data')
      }
    } catch {
      setError('Failed to load referral data')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!referralData) return
    
    try {
      await navigator.clipboard.writeText(referralData.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
    )
  }

  if (error || !referralData) {
    return null // Don't show widget if not logged in or error
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-indigo-100 dark:border-indigo-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        🎁 Invite Friends, Earn Rewards
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Earn $10 credit for every friend who makes a purchase. They get 15% off their first order!
      </p>

      {/* Referral Link */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={referralData.referralLink}
          readOnly
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none"
        />
        <button
          onClick={copyToClipboard}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {referralData.stats.totalReferrals}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Invited</p>
        </div>
        <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {referralData.stats.successfulReferrals}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Purchased</p>
        </div>
        <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
            {referralData.stats.pendingReferrals}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
        </div>
        <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            ${referralData.stats.totalRewards.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Earned</p>
        </div>
      </div>

      {/* Share buttons */}
      <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Share via:</p>
        <div className="flex gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=Check%20out%20this%20fashion%20marketplace!%20Get%2015%25%20off%20your%20first%20order%20with%20my%20link:%20${encodeURIComponent(referralData.referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#1DA1F2] text-white rounded hover:opacity-80 transition-opacity"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a
            href={`https://wa.me/?text=Check%20out%20this%20fashion%20marketplace!%20Get%2015%25%20off%20your%20first%20order%20with%20my%20link:%20${encodeURIComponent(referralData.referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#25D366] text-white rounded hover:opacity-80 transition-opacity"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
          <a
            href={`mailto:?subject=Check%20out%20this%20fashion%20marketplace!&body=Get%2015%25%20off%20your%20first%20order%20with%20my%20referral%20link:%20${encodeURIComponent(referralData.referralLink)}`}
            className="p-2 bg-gray-600 text-white rounded hover:opacity-80 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
