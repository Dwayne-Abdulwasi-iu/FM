'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Users,
  Filter,
  Search,
  Clock,
  DollarSign,
  Crown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  Zap,
} from 'lucide-react'

interface Subscription {
  id: string
  email: string
  name: string
  tier: string
  price: number
  billingCycle: string
  subscriptionType: 'PAID' | 'TRIAL' | null
  expiresAt: string
  daysRemaining: number
  status: string
  startedAt: string
  totalEarnings: number
  joinedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
  hasMore: boolean
}

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0, hasMore: false })
  const [filters, setFilters] = useState({
    tier: searchParams.get('tier') || '',
    status: searchParams.get('status') || 'ACTIVE',
    search: searchParams.get('search') || '',
  })
  const [sort, setSort] = useState<string>(searchParams.get('sort') || 'expiresAt')
  const [showFilters, setShowFilters] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  // Redirect non-admins
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session?.user?.role, router])

  // Fetch subscriptions
  useEffect(() => {
    fetchSubscriptions()
  }, [filters, sort, pagination.page])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort,
        ...(filters.tier && { tier: filters.tier }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      })

      const res = await fetch(`/api/admin/subscriptions?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setSubscriptions(data.subscriptions)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (userId: string) => {
    if (!window.confirm('Cancel this subscription? This cannot be undone.')) return

    try {
      setCancelingId(userId)
      const res = await fetch('/api/admin/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: 'Admin cancellation' })
      })

      if (!res.ok) throw new Error('Failed to cancel')

      toast.success('Subscription cancelled')
      fetchSubscriptions()
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error('Failed to cancel subscription')
    } finally {
      setCancelingId(null)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'STARTER':
        return 'bg-blue-100 text-blue-800'
      case 'PRO':
        return 'bg-purple-100 text-purple-800'
      case 'VIP':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string, type: string) => {
    if (status === 'EXPIRED') return 'bg-red-100 text-red-800'
    if (type === 'TRIAL') return 'bg-green-100 text-green-800'
    if (type === 'PAID') return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (status === 'loading') return <div className="p-8">Loading...</div>
  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') return null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
              <p className="text-gray-600 mt-1">Manage all seller subscriptions</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{pagination.total}</div>
              <div className="text-sm text-gray-600">Active subscriptions</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value })
                  setPagination({ ...pagination, page: 1 })
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              {/* Tier Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Tier</label>
                <select
                  value={filters.tier}
                  onChange={(e) => {
                    setFilters({ ...filters, tier: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Tiers</option>
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial Only</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value)
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="expiresAt">Expiry Date</option>
                  <option value="subscriptionTier">Tier</option>
                  <option value="createdAt">Newest</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No subscriptions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Seller</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Expires</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Days Left</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Earnings</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{sub.name}</div>
                            <div className="text-sm text-gray-600">{sub.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(sub.tier)}`}>
                            {sub.tier || 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sub.status || 'EXPIRED', sub.subscriptionType || 'PAID')}`}>
                            {sub.subscriptionType === 'PAID' ? '💳 Paid' : sub.subscriptionType === 'TRIAL' ? '🎁 Trial' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">${sub.price || 0}</span>
                            {sub.billingCycle && <span className="text-xs text-gray-500">/{sub.billingCycle}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className={sub.daysRemaining <= 7 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                              {sub.daysRemaining} days
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">${sub.totalEarnings.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleCancel(sub.id)}
                            disabled={cancelingId === sub.id}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-50"
                            title="Cancel subscription"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const pageNum = Math.max(1, pagination.page - 2) + i
                      if (pageNum > pagination.pages) return null
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination({ ...pagination, page: pageNum })}
                          className={`px-3 py-1 rounded-lg ${
                            pageNum === pagination.page
                              ? 'bg-purple-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={!pagination.hasMore}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
