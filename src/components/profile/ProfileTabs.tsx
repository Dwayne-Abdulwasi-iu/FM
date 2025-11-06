"use client"

import React, { useEffect, useRef, useState } from 'react'
import SellerAccountTab from '@/components/profile/SellerAccountTab'
// Link removed; individual tabs import Link when needed
import { useSearchParams, useRouter } from 'next/navigation'
import OverviewTab from './OverviewTab'
import DesignsTab from './DesignsTab'
import EarningsTab from './EarningsTab'
import OrdersTab from './OrdersTab'

const TABS = [
  'Overview',
  'Designs',
  'Earnings',
  'Orders',
  'Bank Account',
]

export default function ProfileTabs() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [active, setActive] = useState<string>(() => (searchParams?.get('tab') as string) || 'Overview')
  const [designsCount, setDesignsCount] = useState<number | null>(null)
  const [ordersCount, setOrdersCount] = useState<number | null>(null)
  const [countsLoading, setCountsLoading] = useState(true)
  const [profileUser, setProfileUser] = useState<{ id: string; name?: string | null; email?: string | null; role?: string | null; isVerified?: boolean | null; bio?: string | null; location?: string | null; website?: string | null; createdAt?: string | null } | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [stats, setStats] = useState<{ totalEarnings?: number; totalRevenue?: number; platformCommission?: number; totalSales?: number; totalDesigns?: number } | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [avgOrderValue, setAvgOrderValue] = useState<number | null>(null)
  const [payoutSummary, setPayoutSummary] = useState<{ lastPayoutStatus?: string | null; lastPayoutDate?: string | null } | null>(null)
  const [payoutLoading, setPayoutLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Sync tab from URL when search params change
    const t = searchParams?.get('tab')
    if (t && TABS.includes(t)) setActive(t)
  }, [searchParams])

  useEffect(() => {
    // update URL when active tab changes
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []))
    if (active) params.set('tab', active)
    router.replace(`/profile?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    // focus the panel for accessibility whenever active changes
    if (panelRef.current) {
      panelRef.current.focus()
    }
  }, [active])

  useEffect(() => {
    let mounted = true
    const abort = new AbortController()
    const run = async () => {
      setCountsLoading(true)
      try {
        // Designs: request 1 item but inspect pagination.total
        const dres = await fetch('/api/designs?userOnly=true&page=1&limit=1', { signal: abort.signal })
        if (dres.ok) {
          const ddata = await dres.json()
          if (mounted && ddata?.pagination?.total != null) setDesignsCount(Number(ddata.pagination.total))
        }

        // Orders: fetch list and count length
        const ores = await fetch('/api/orders', { signal: abort.signal })
        if (ores.ok) {
          const odata = await ores.json()
          if (mounted && Array.isArray(odata.orders)) setOrdersCount(odata.orders.length)
        }
      } catch {
        // ignore; keep null counts
      } finally {
        if (mounted) setCountsLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
      abort.abort()
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const ac = new AbortController()
    const run = async () => {
      setProfileLoading(true)
      try {
        const res = await fetch('/api/profile', { signal: ac.signal })
        if (res.ok) {
          const data = await res.json()
          if (mounted && data?.user) setProfileUser(data.user)
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setProfileLoading(false)
      }
    }
    run()
    return () => { mounted = false; ac.abort() }
  }, [])

  useEffect(() => {
    let mounted = true
    const ac = new AbortController()
    const run = async () => {
      setStatsLoading(true)
      try {
        const res = await fetch('/api/profile/stats', { signal: ac.signal })
        if (res.ok) {
          const data = await res.json()
          if (mounted && data?.stats) setStats(data.stats)
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setStatsLoading(false)
      }
    }
    run()
    return () => { mounted = false; ac.abort() }
  }, [])

  // compute average order value and fetch last payout info
  useEffect(() => {
    if (!stats) return
    if ((stats.totalSales || 0) > 0 && stats.totalRevenue != null) {
      setAvgOrderValue(stats.totalRevenue / (stats.totalSales || 1))
    } else {
      setAvgOrderValue(null)
    }
  }, [stats])

  useEffect(() => {
    let mounted = true
    const ac = new AbortController()
    const run = async () => {
      setPayoutLoading(true)
      try {
        // Most recent earning (any status)
        const resRecent = await fetch('/api/profile/earnings?page=1&pageSize=1&sortBy=date&sortOrder=desc', { signal: ac.signal })
        let recentStatus = null
        if (resRecent.ok) {
          const rdata = await resRecent.json()
          const first = (rdata?.earnings && rdata.earnings[0])
          if (first) recentStatus = first.payoutStatus || null
        }

        // Last paid payout date
        const resPaid = await fetch('/api/profile/earnings?status=PAID&page=1&pageSize=1&sortBy=date&sortOrder=desc', { signal: ac.signal })
        let lastPaidDate = null
        if (resPaid.ok) {
          const pdata = await resPaid.json()
          const firstPaid = (pdata?.earnings && pdata.earnings[0])
          if (firstPaid) lastPaidDate = firstPaid.payoutCompletedAt || firstPaid.payoutAttemptedAt || null
        }

        if (mounted) setPayoutSummary({ lastPayoutStatus: recentStatus, lastPayoutDate: lastPaidDate })
      } catch {
        // ignore
      } finally {
        if (mounted) setPayoutLoading(false)
      }
    }
    run()
    return () => { mounted = false; ac.abort() }
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="col-span-1">
        <div className="bg-white border rounded p-4">
          {profileLoading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ) : profileUser ? (
            <div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-semibold text-indigo-700">
                  {/* initials avatar from name */}
                  {(profileUser.name || profileUser.email || '?').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{profileUser.name || '—'}</div>
                  <div className="text-sm text-gray-600">{profileUser.email || '—'}</div>
                </div>
              </div>

              {profileUser.bio && <div className="mt-3 text-sm text-gray-700">{profileUser.bio}</div>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${profileUser.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{profileUser.isVerified ? 'Verified' : 'Unverified'}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${profileUser.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{(profileUser.role || 'USER')}</span>
                {profileUser.location && <span className="px-2 py-1 text-xs text-gray-600">{profileUser.location}</span>}
              </div>

              <div className="mt-3 text-xs text-gray-500">Joined {profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleDateString() : '—'}</div>

              {/* Key totals under profile */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded text-center">
                  <div className="text-xs text-gray-500">Total designs</div>
                  <div className="text-lg font-semibold text-gray-900">{countsLoading ? '…' : (designsCount ?? '—')}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded text-center">
                  <div className="text-xs text-gray-500">Total sales</div>
                  <div className="text-lg font-semibold text-gray-900">{countsLoading ? '…' : (ordersCount ?? '—')}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded text-center">
                  <div className="text-xs text-gray-500">Total revenue</div>
                  <div className="text-lg font-semibold text-gray-900">{statsLoading ? '…' : (stats?.totalRevenue != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalRevenue) : '—')}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded text-center">
                  <div className="text-xs text-gray-500">Your earnings</div>
                  <div className="text-lg font-semibold text-gray-900">{statsLoading ? '…' : (stats?.totalEarnings != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalEarnings) : '—')}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded text-center">
                  <div className="text-xs text-gray-500">Avg order value</div>
                  <div className="text-lg font-semibold text-gray-900">{statsLoading ? '…' : (avgOrderValue != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(avgOrderValue) : '—')}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded text-center">
                  <div className="text-xs text-gray-500">Payout status</div>
                  <div className="text-sm font-medium text-gray-900">{payoutLoading ? '…' : (payoutSummary?.lastPayoutStatus || '—')}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded text-center">
                  <div className="text-xs text-gray-500">Last payout date</div>
                  <div className="text-sm font-medium text-gray-900">{payoutLoading ? '…' : (payoutSummary?.lastPayoutDate ? new Date(payoutSummary.lastPayoutDate).toLocaleString() : '—')}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No profile data</div>
          )}
        </div>
      </aside>

      <div className="col-span-1 lg:col-span-3">
        <div className="border-b border-gray-200">
        <nav role="tablist" aria-label="Profile tabs" className="flex -mb-px space-x-6 px-2 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab === active
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={isActive ? 'true' : 'false'}
                aria-controls={`panel-${tab.replace(/\s+/g, '-').toLowerCase()}`}
                id={`tab-${tab.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => setActive(tab)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    const idx = TABS.indexOf(tab)
                    setActive(TABS[(idx + 1) % TABS.length])
                  } else if (e.key === 'ArrowLeft') {
                    const idx = TABS.indexOf(tab)
                    setActive(TABS[(idx - 1 + TABS.length) % TABS.length])
                  }
                }}
                className={`py-3 px-1 whitespace-nowrap text-sm font-medium ${isActive ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}
              >
                {tab}
              </button>
            )
          })}
        </nav>
        </div>

        <div className="mt-6" ref={panelRef} tabIndex={-1}>
          {active === 'Overview' && <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview"><OverviewTab designsCount={designsCount} ordersCount={ordersCount} loading={countsLoading} /></div>}
          {active === 'Designs' && <div role="tabpanel" id="panel-designs" aria-labelledby="tab-designs"><DesignsTab /></div>}
          {active === 'Earnings' && <div role="tabpanel" id="panel-earnings" aria-labelledby="tab-earnings"><EarningsTab /></div>}
          {active === 'Orders' && <div role="tabpanel" id="panel-orders" aria-labelledby="tab-orders"><OrdersTab /></div>}
          {active === 'Bank Account' && <div role="tabpanel" id="panel-bank-account" aria-labelledby="tab-bank-account"><SellerAccountTab /></div>}
        </div>
      </div>
    </div>
  )
}
