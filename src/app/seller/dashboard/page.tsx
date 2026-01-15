'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Eye,
  ShoppingBag,
  DollarSign,
  Star,
  Package,
  Calendar,
  ArrowUpRight,
  Plus,
  Tag,
  Settings,
  ChevronRight,
  Palette,
  Printer,
  HelpCircle,
  BookOpen
} from 'lucide-react'

interface AnalyticsData {
  summary: {
    totalViews: number
    totalSales: number
    totalRevenue: number
    totalFavorites: number
    totalDesigns: number
    avgRating: string
    conversionRate: string
    // Commission data
    totalCommissionEarnings?: number
    totalCompletedCommissions?: number
    activeCommissionCount?: number
    pendingCommissionCount?: number
    pendingCommissionValue?: number
    avgCommissionRating?: string
    totalEarnings?: number
  }
  period: {
    days: number
    sales: number
    earnings: number
  }
  dailyStats: Array<{
    date: string
    views: number
    sales: number
    revenue: number
  }>
  topDesigns: Array<{
    id: string
    title: string
    thumbnailUrl: string | null
    imageUrl: string
    price: number
    totalSales: number
    totalRevenue: number
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    totalAmount: number
    status: string
    createdAt: string
    customer: {
      name: string | null
      image: string | null
    }
    items: Array<{
      quantity: number
      price: number
      design: {
        id: string
        title: string
        thumbnailUrl: string | null
      }
    }>
  }>
  recentReviews: Array<{
    id: string
    rating: number
    comment: string | null
    createdAt: string
    user: {
      name: string | null
      image: string | null
    }
    design: {
      id: string
      title: string
    }
  }>
  // Commission data
  commissions?: {
    completed: Array<{
      id: string
      title: string
      designerQuote: number | null
      designerEarnings: number | null
      completedAt: string | null
      clientRating: number | null
      requester: { name: string | null; displayName: string | null; image: string | null } | null
    }>
    active: Array<{
      id: string
      title: string
      status: string
      designerEarnings: number | null
      requester: { name: string | null; displayName: string | null; image: string | null } | null
    }>
    pending: Array<{
      id: string
      title: string
      status: string
      designerQuote: number | null
      requester: { name: string | null; displayName: string | null } | null
    }>
    stats: {
      totalEarnings: number
      completedCount: number
      activeCount: number
      pendingCount: number
      pendingValue: number
      avgRating: string
    }
  }
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/seller/analytics?period=${period}`)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-gray-300 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-500 mt-1">Track your sales and performance</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Select time period"
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Design
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +12%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-4">
              {analytics.summary.totalViews.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Views</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +8%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-4">
              {analytics.summary.totalSales}
            </p>
            <p className="text-sm text-gray-500">Total Sales</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-4">
              {formatCurrency(analytics.summary.totalEarnings || analytics.summary.totalRevenue)}
            </p>
            <p className="text-sm text-gray-500">Total Earnings</p>
            {analytics.summary.totalCommissionEarnings && analytics.summary.totalCommissionEarnings > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Includes ${analytics.summary.totalCommissionEarnings.toFixed(2)} from commissions
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-4">
              {analytics.summary.avgRating}
            </p>
            <p className="text-sm text-gray-500">Average Rating</p>
          </div>
        </div>

        {/* Period Stats */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 mb-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Period Performance</h2>
            <Calendar className="w-5 h-5 opacity-80" />
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold">{analytics.period.sales}</p>
              <p className="text-sm opacity-80">Sales this period</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{formatCurrency(analytics.period.earnings)}</p>
              <p className="text-sm opacity-80">Earnings this period</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{analytics.summary.conversionRate}%</p>
              <p className="text-sm opacity-80">Conversion Rate</p>
            </div>
          </div>
        </div>

        {/* Commission Earnings Section */}
        {analytics.commissions && (analytics.commissions.stats.completedCount > 0 || analytics.commissions.stats.activeCount > 0 || analytics.commissions.stats.pendingCount > 0) && (
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl shadow-sm p-6 mb-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Commission Earnings</h2>
              <Link href="/seller/commission-requests" className="text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-3xl font-bold">{formatCurrency(analytics.commissions.stats.totalEarnings)}</p>
                <p className="text-sm opacity-80">Total Commission Earnings</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{analytics.commissions.stats.completedCount}</p>
                <p className="text-sm opacity-80">Completed Commissions</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{analytics.commissions.stats.activeCount}</p>
                <p className="text-sm opacity-80">Active Projects</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{analytics.commissions.stats.pendingCount}</p>
                <p className="text-sm opacity-80">Pending Quotes</p>
              </div>
            </div>
            {analytics.commissions.stats.pendingValue > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm opacity-80">
                  You have <span className="font-semibold">{formatCurrency(analytics.commissions.stats.pendingValue)}</span> in active commission work
                </p>
              </div>
            )}
          </div>
        )}

        {/* Print-on-Demand Section */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-sm p-6 mb-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Printer className="w-6 h-6" />
              <h2 className="text-lg font-semibold">Print-on-Demand</h2>
            </div>
            <Link href="/seller/pod-setup" className="text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition">
              🚀 Setup Wizard
            </Link>
          </div>
          <p className="text-sm opacity-90 mb-4">
            Turn your designs into physical products! T-shirts, hoodies, mugs, posters, and more. 
            We handle printing and shipping - you earn on every sale.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/seller/pod-setup" className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
              <p className="text-2xl font-bold">✨</p>
              <p className="text-sm mt-1">Setup Wizard</p>
            </Link>
            <Link href="/seller/pod-products" className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
              <p className="text-2xl font-bold">🎨</p>
              <p className="text-sm mt-1">All Products</p>
            </Link>
            <Link href="/seller/pod-orders" className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
              <p className="text-2xl font-bold">📦</p>
              <p className="text-sm mt-1">POD Orders</p>
            </Link>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-2xl font-bold">Printful</p>
              <p className="text-sm mt-1 opacity-80">454+ Products</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-2xl font-bold">Printify</p>
              <p className="text-sm mt-1 opacity-80">1000+ Products</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Designs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Top Performing Designs</h2>
              <Link href="/seller/designs" className="text-sm text-indigo-600 hover:text-indigo-800">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {analytics.topDesigns.map((design, index) => (
                <Link
                  key={design.id}
                  href={`/designs/${design.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-bold text-gray-400 w-6">{index + 1}</span>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 relative flex-shrink-0">
                    <Image
                      src={design.thumbnailUrl || design.imageUrl}
                      alt={design.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{design.title}</p>
                    <p className="text-sm text-gray-500">{design.totalSales} sales</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(design.totalRevenue)}</p>
                  </div>
                </Link>
              ))}
              {analytics.topDesigns.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sales yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/seller/orders" className="text-sm text-indigo-600 hover:text-indigo-800">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {analytics.recentOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {order.customer.image ? (
                      <Image
                        src={order.customer.image}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-gray-600 font-medium">
                        {(order.customer.name || 'C')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(order.items.reduce((sum, i) => sum + i.price * i.quantity, 0))}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {analytics.recentOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No orders yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.recentReviews.map((review) => (
              <div key={review.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {review.user.image ? (
                      <Image src={review.user.image} alt="" width={32} height={32} />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {(review.user.name || 'U')[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{review.user.name || 'Anonymous'}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/designs/${review.design.id}`}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {review.design.title}
                </Link>
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                )}
              </div>
            ))}
            {analytics.recentReviews.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No reviews yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Link
            href="/seller/commission-requests"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-pink-100"
          >
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <Palette className="w-6 h-6 text-pink-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Commission Requests</p>
              <p className="text-sm text-gray-500">Custom work inquiries</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href="/seller/promotions"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Manage Promotions</p>
              <p className="text-sm text-gray-500">Create discounts & bundles</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href="/seller/designs"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Manage Designs</p>
              <p className="text-sm text-gray-500">Edit & organize your work</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href="/seller/commission-settings"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Commission Settings</p>
              <p className="text-sm text-gray-500">Manage commission availability</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href="/seller/pod-settings"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Print-on-Demand Settings</p>
              <p className="text-sm text-gray-500">Manage POD availability</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href="/profile/edit"
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Profile Settings</p>
              <p className="text-sm text-gray-500">Profile & preferences</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Help & Resources Section */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Help & Resources</h2>
              <p className="text-sm text-gray-600">Learn how to maximize your sales</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/help?category=seller-tiers"
              className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-gray-900 group-hover:text-indigo-600">Seller Tiers</span>
              </div>
              <p className="text-xs text-gray-600">Earn more with lower fees</p>
            </Link>
            <Link
              href="/help?category=commissions"
              className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-5 h-5 text-pink-500" />
                <span className="font-medium text-gray-900 group-hover:text-indigo-600">Commissions</span>
              </div>
              <p className="text-xs text-gray-600">Custom work guide</p>
            </Link>
            <Link
              href="/help?category=pod"
              className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Printer className="w-5 h-5 text-cyan-500" />
                <span className="font-medium text-gray-900 group-hover:text-indigo-600">Print-on-Demand</span>
              </div>
              <p className="text-xs text-gray-600">Sell physical products</p>
            </Link>
            <Link
              href="/help?category=digital-designs"
              className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-gray-900 group-hover:text-indigo-600">Digital Sales</span>
              </div>
              <p className="text-xs text-gray-600">Selling digital designs</p>
            </Link>
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/help"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
            >
              <HelpCircle className="w-4 h-4" />
              View Full Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
