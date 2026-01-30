'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, ShoppingCart, Users, Eye, BarChart3, Calendar, Download } from 'lucide-react'

interface AnalyticsData {
  period: 'week' | 'month' | 'year'
  revenue: {
    total: number
    trend: number
    dailyBreakdown: Array<{ date: string; amount: number }>
  }
  orders: {
    total: number
    trend: number
    averageValue: number
    topProducts: Array<{ id: string; title: string; quantity: number; revenue: number }>
  }
  customers: {
    total: number
    new: number
    returning: number
    retentionRate: number
  }
  designs: {
    total: number
    views: number
    avgViewsPerDesign: number
    topDesigns: Array<{ id: string; title: string; views: number; sales: number }>
  }
  conversion: {
    rate: number
    trend: number
    viewsToSales: number
  }
  traffic: {
    pageViews: number
    uniqueVisitors: number
    bounceRate: number
    avgSessionDuration: number
  }
}

export default function SellerAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchAnalytics()
  }, [status, period, router])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/seller/analytics?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/seller/analytics/export?period=${period}&format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${period}.${format}`
        a.click()
      }
    } catch (error) {
      console.error('Failed to export:', error)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading analytics...</div>
  }

  if (!analytics) {
    return <div className="p-8 text-center text-red-600">Failed to load analytics</div>
  }

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatTrend = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/seller/dashboard" className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
            <p className="text-gray-600 mt-1">Track your performance and insights</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-black"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(analytics.revenue.total)}</p>
                <p className={`text-xs mt-2 ${analytics.revenue.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatTrend(analytics.revenue.trend)} vs previous period
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Orders Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.orders.total}</p>
                <p className="text-xs text-gray-600 mt-2">Avg: {formatCurrency(analytics.orders.averageValue)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Customers Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.customers.total}</p>
                <p className="text-xs text-gray-600 mt-2">{analytics.customers.new} new this period</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Conversion Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.conversion.rate.toFixed(2)}%</p>
                <p className={`text-xs mt-2 ${analytics.conversion.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatTrend(analytics.conversion.trend)} vs previous
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h2>
            <div className="space-y-3">
              {analytics.orders.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {product.quantity} sold • {formatCurrency(product.revenue)}
                    </p>
                  </div>
                  <span className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Designs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Designs by Views</h2>
            <div className="space-y-3">
              {analytics.designs.topDesigns.map((design, index) => (
                <div key={design.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{design.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      <Eye className="w-3 h-3 inline mr-1" />
                      {design.views} views • {design.sales} sales
                    </p>
                  </div>
                  <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Page Views</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.traffic.pageViews}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Unique Visitors</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.traffic.uniqueVisitors}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Bounce Rate</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.traffic.bounceRate.toFixed(2)}%</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Avg Session Duration</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.traffic.avgSessionDuration.toFixed(0)}s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Insights */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Returning Customers</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.customers.returning}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Customer Retention Rate</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.customers.retentionRate.toFixed(2)}%</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Designs with Views</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.designs.total}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Avg Views per Design</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.designs.avgViewsPerDesign.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Revenue chart will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
