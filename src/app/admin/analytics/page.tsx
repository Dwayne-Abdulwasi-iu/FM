'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  DollarSign,
  Package,
  Calendar,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  Download,
  RefreshCw,
  Store,
  CreditCard,
  UserPlus,
  Eye,
  ShoppingCart,
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalRevenue: number
    platformEarnings: number
    totalOrders: number
    totalUsers: number
    totalSellers: number
    totalDesigns: number
    revenueChange: number
    ordersChange: number
    usersChange: number
  }
  daily: {
    date: string
    revenue: number
    orders: number
    signups: number
  }[]
  topDesigns: {
    id: string
    title: string
    sales: number
    revenue: number
    designer: string
  }[]
  topSellers: {
    id: string
    name: string
    email: string
    sales: number
    revenue: number
    designs: number
  }[]
  ordersByStatus: {
    status: string
    count: number
  }[]
  revenueByCategory: {
    category: string
    revenue: number
    count: number
  }[]
  userGrowth: {
    month: string
    users: number
    sellers: number
  }[]
}

export default function AdminAnalyticsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [dateRange, setDateRange] = useState('30')
  const [error, setError] = useState('')

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session || session.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchAnalytics()
  }, [session, authStatus, router, dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/analytics?days=${dateRange}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        // Fallback to stats endpoint if analytics doesn't exist
        const statsResponse = await fetch('/api/admin/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setData({
            overview: {
              totalRevenue: statsData.stats?.totalRevenue || 0,
              platformEarnings: statsData.stats?.platformEarnings || 0,
              totalOrders: statsData.stats?.totalOrders || 0,
              totalUsers: statsData.stats?.totalUsers || 0,
              totalSellers: statsData.stats?.activeUsers || 0,
              totalDesigns: statsData.stats?.totalDesigns || 0,
              revenueChange: 0,
              ordersChange: 0,
              usersChange: 0,
            },
            daily: [],
            topDesigns: [],
            topSellers: [],
            ordersByStatus: [],
            revenueByCategory: [],
            userGrowth: [],
          })
        } else {
          setError('Failed to load analytics data')
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <span className="inline-flex items-center text-sm text-green-600">
          <TrendingUp className="w-4 h-4 mr-1" />
          +{change.toFixed(1)}%
        </span>
      )
    } else if (change < 0) {
      return (
        <span className="inline-flex items-center text-sm text-red-600">
          <TrendingDown className="w-4 h-4 mr-1" />
          {change.toFixed(1)}%
        </span>
      )
    }
    return <span className="text-sm text-gray-500">No change</span>
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Analytics</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Admin Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Comprehensive platform performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenue */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              {getChangeIndicator(data?.overview.revenueChange || 0)}
            </div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(data?.overview.totalRevenue || 0)}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Platform: {formatCurrency(data?.overview.platformEarnings || 0)}
            </p>
          </div>

          {/* Orders */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
              {getChangeIndicator(data?.overview.ordersChange || 0)}
            </div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(data?.overview.totalOrders || 0)}
            </p>
          </div>

          {/* Users */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              {getChangeIndicator(data?.overview.usersChange || 0)}
            </div>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(data?.overview.totalUsers || 0)}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {formatNumber(data?.overview.totalSellers || 0)} sellers
            </p>
          </div>

          {/* Designs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Total Designs</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(data?.overview.totalDesigns || 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Selling Designs */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Top Selling Designs</h2>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="p-6">
              {data?.topDesigns && data.topDesigns.length > 0 ? (
                <div className="space-y-4">
                  {data.topDesigns.slice(0, 5).map((design, index) => (
                    <div key={design.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{design.title}</p>
                        <p className="text-sm text-gray-500">{design.designer}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(design.revenue)}</p>
                        <p className="text-sm text-gray-500">{design.sales} sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No sales data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Sellers */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Top Sellers</h2>
                <Store className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="p-6">
              {data?.topSellers && data.topSellers.length > 0 ? (
                <div className="space-y-4">
                  {data.topSellers.slice(0, 5).map((seller, index) => (
                    <div key={seller.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {seller.name || 'Anonymous'}
                        </p>
                        <p className="text-sm text-gray-500">{seller.designs} designs</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(seller.revenue)}</p>
                        <p className="text-sm text-gray-500">{seller.sales} sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No seller data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Orders by Status */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Orders by Status</h2>
                <PieChart className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="p-6">
              {data?.ordersByStatus && data.ordersByStatus.length > 0 ? (
                <div className="space-y-3">
                  {data.ordersByStatus.map((item) => {
                    const total = data.ordersByStatus.reduce((sum, i) => sum + i.count, 0)
                    const percentage = total > 0 ? (item.count / total) * 100 : 0
                    const colors: Record<string, string> = {
                      PENDING: 'bg-yellow-500',
                      PAID: 'bg-green-500',
                      COMPLETED: 'bg-blue-500',
                      CANCELLED: 'bg-red-500',
                      REFUNDED: 'bg-gray-500',
                    }
                    return (
                      <div key={item.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 capitalize">{item.status.toLowerCase()}</span>
                          <span className="font-medium text-gray-900">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${colors[item.status] || 'bg-gray-400'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No order data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Revenue by Category</h2>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="p-6">
              {data?.revenueByCategory && data.revenueByCategory.length > 0 ? (
                <div className="space-y-3">
                  {data.revenueByCategory.map((item) => {
                    const maxRevenue = Math.max(...data.revenueByCategory.map((i) => i.revenue))
                    const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
                    return (
                      <div key={item.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{item.category}</span>
                          <span className="font-medium text-gray-900">{formatCurrency(item.revenue)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-indigo-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No category data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin?tab=users"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <Users className="w-8 h-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Manage Users</span>
            </Link>
            <Link
              href="/admin?tab=designs"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <Package className="w-8 h-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Review Designs</span>
            </Link>
            <Link
              href="/admin?tab=orders"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <ShoppingBag className="w-8 h-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">View Orders</span>
            </Link>
            <Link
              href="/admin/boutique"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <Store className="w-8 h-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Boutique</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
