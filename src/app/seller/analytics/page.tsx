'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, ShoppingCart, Users, Eye, BarChart3, Calendar, Download } from 'lucide-react'

interface AnalyticsData {
  summary: {
    totalViews: number
    totalSales: number
    totalRevenue: number
    totalFavorites: number
    totalDesigns: number
    avgRating: string
    conversionRate: string
    totalCommissionEarnings: number
    totalCompletedCommissions: number
    activeCommissionCount: number
    pendingCommissionCount: number
    pendingCommissionValue: number
    avgCommissionRating: string
    totalEarnings: number
  }
  period: {
    days: number
    sales: number
    earnings: number
  }
  dailyStats: Array<{ date: string; views: number; sales: number; revenue: number }>
  topDesigns: Array<{
    id: string
    title: string
    price: number
    viewCount: number
    totalSales: number
    totalRevenue: number
  }>
  designs: Array<any>
  recentOrders: Array<any>
  recentReviews: Array<any>
  conversionFunnel: any
  trafficSources: Array<any>
  insights: Array<string>
  commissions: any
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
      // Convert period string to days
      const periodDays = period === 'week' ? 7 : period === 'year' ? 365 : 30
      const response = await fetch(`/api/seller/analytics?period=${periodDays}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const periodDays = period === 'week' ? 7 : period === 'year' ? 365 : 30
      const response = await fetch(`/api/seller/analytics/export?period=${periodDays}&format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        // Use .html extension for PDF exports to match the actual content type
        const fileExt = format === 'pdf' ? 'html' : 'csv'
        a.download = `analytics-${period}.${fileExt}`
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
                <p className="text-3xl font-bold text-gray-900">${analytics.summary.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-gray-600 mt-2">
                  {analytics.period.sales} sales this period
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Sales Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.summary.totalSales}</p>
                <p className="text-xs text-gray-600 mt-2">
                  ${(analytics.summary.totalRevenue / (analytics.summary.totalSales || 1)).toFixed(2)} avg
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Designs Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Designs</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.summary.totalDesigns}</p>
                <p className="text-xs text-gray-600 mt-2">{analytics.summary.totalViews} total views</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Conversion Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.summary.conversionRate}%</p>
                <p className="text-xs text-gray-600 mt-2">
                  {analytics.summary.totalFavorites} favorites
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Designs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Designs</h2>
            <div className="space-y-3">
              {analytics.topDesigns.slice(0, 5).map((design, index) => (
                <div key={design.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{design.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      <Eye className="w-3 h-3 inline mr-1" />
                      {design.viewCount} views • {design.totalSales} sales
                    </p>
                  </div>
                  <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {analytics.recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{order.orderNumber}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} • ${order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h2>
            <div className="space-y-3">
              {analytics.recentReviews.slice(0, 5).map((review) => (
                <div key={review.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{review.user?.name || 'Anonymous'}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{review.comment || 'No comment'}</p>
                    <div className="mt-2 flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-lg ${i < review.rating ? '⭐' : '☆'}`}>
                          {i < review.rating ? '⭐' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h2>
            <div className="space-y-3">
              {analytics.insights.map((insight, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-800">{insight}</p>
                </div>
              ))}
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
