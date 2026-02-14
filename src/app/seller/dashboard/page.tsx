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
  BookOpen,
  Store,
  Truck,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { useCurrency } from '@/components/CurrencyProvider'
import { TrialStatusCard } from '@/components/seller/TrialStatusCard'

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
  const { formatPrice } = useCurrency()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [trialInfo, setTrialInfo] = useState<{
    isActive: boolean
    expiresAt: Date | null
    activatedAt: Date | null
  } | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchAnalytics()
    fetchTrialInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, period])

  const fetchTrialInfo = async () => {
    try {
      const response = await fetch('/api/subscriptions/pro-trial')
      if (response.ok) {
        const data = await response.json()
        setTrialInfo({
          isActive: data.isTrialActive,
          expiresAt: data.trialExpiresAt ? new Date(data.trialExpiresAt) : null,
          activatedAt: data.trialActivatedAt ? new Date(data.trialActivatedAt) : null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch trial info:', error)
    }
  }

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

  // Use the currency context's formatPrice (renamed to formatCurrency for backward compatibility)
  const formatCurrency = formatPrice

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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-xs sm:text-base text-gray-500 mt-0.5 sm:mt-1">Track your sales and performance</p>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center gap-2 sm:gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Select time period"
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm text-gray-900"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs sm:text-sm font-medium"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              New Design
            </Link>
          </div>
        </div>

        {/* Trial Status Card */}
        {trialInfo && (
          <div className="mb-4 sm:mb-6">
            <TrialStatusCard 
              isActive={trialInfo.isActive}
              expiresAt={trialInfo.expiresAt}
              activatedAt={trialInfo.activatedAt}
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <span className="text-[10px] sm:text-xs text-green-600 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                +12%
              </span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-2 sm:mt-4">
              {analytics.summary.totalViews.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-sm text-gray-500">Total Views</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <span className="text-[10px] sm:text-xs text-green-600 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                +8%
              </span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-2 sm:mt-4">
              {analytics.summary.totalSales}
            </p>
            <p className="text-[10px] sm:text-sm text-gray-500">Total Sales</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-2 sm:mt-4">
              {formatCurrency(analytics.summary.totalEarnings || analytics.summary.totalRevenue)}
            </p>
            <p className="text-[10px] sm:text-sm text-gray-500">Total Earnings</p>
            {analytics.summary.totalCommissionEarnings && analytics.summary.totalCommissionEarnings > 0 && (
              <p className="text-[8px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
                Includes ${analytics.summary.totalCommissionEarnings.toFixed(2)} from commissions
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-2 sm:mt-4">
              {analytics.summary.avgRating}
            </p>
            <p className="text-[10px] sm:text-sm text-gray-500">Average Rating</p>
          </div>
        </div>

        {/* Period Stats */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-8 text-white">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-lg font-semibold">Period Performance</h2>
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <div>
              <p className="text-xl sm:text-3xl font-bold">{analytics.period.sales}</p>
              <p className="text-[10px] sm:text-sm opacity-80">Sales this period</p>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-bold">{formatCurrency(analytics.period.earnings)}</p>
              <p className="text-[10px] sm:text-sm opacity-80">Earnings this period</p>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-bold">{analytics.summary.conversionRate}%</p>
              <p className="text-[10px] sm:text-sm opacity-80">Conversion Rate</p>
            </div>
          </div>
        </div>

        {/* Commission Earnings Section */}
        {analytics.commissions && (analytics.commissions.stats.completedCount > 0 || analytics.commissions.stats.activeCount > 0 || analytics.commissions.stats.pendingCount > 0) && (
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-8 text-white">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-sm sm:text-lg font-semibold">Commission Earnings</h2>
              <Link href="/seller/commission-requests" className="text-[10px] sm:text-sm bg-white/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full hover:bg-white/30 transition">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
              <div>
                <p className="text-xl sm:text-3xl font-bold">{formatCurrency(analytics.commissions.stats.totalEarnings)}</p>
                <p className="text-[10px] sm:text-sm opacity-80">Total Commission Earnings</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-bold">{analytics.commissions.stats.completedCount}</p>
                <p className="text-[10px] sm:text-sm opacity-80">Completed Commissions</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-bold">{analytics.commissions.stats.activeCount}</p>
                <p className="text-[10px] sm:text-sm opacity-80">Active Projects</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-bold">{analytics.commissions.stats.pendingCount}</p>
                <p className="text-[10px] sm:text-sm opacity-80">Pending Quotes</p>
              </div>
            </div>
            {analytics.commissions.stats.pendingValue > 0 && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
                <p className="text-[10px] sm:text-sm opacity-80">
                  You have <span className="font-semibold">{formatCurrency(analytics.commissions.stats.pendingValue)}</span> in active commission work
                </p>
              </div>
            )}
          </div>
        )}

        {/* Print-on-Demand Section */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-8 text-white">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Printer className="w-4 h-4 sm:w-6 sm:h-6" />
              <h2 className="text-sm sm:text-lg font-semibold">Print-on-Demand</h2>
            </div>
            <Link href="/seller/pod-setup" className="text-[10px] sm:text-sm bg-white/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full hover:bg-white/30 transition">
              🚀 Setup Wizard
            </Link>
          </div>
          <p className="text-[10px] sm:text-sm opacity-90 mb-3 sm:mb-4">
            Turn your designs into physical products! T-shirts, hoodies, mugs, posters, and more. 
            We handle printing and shipping - you earn on every sale.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            <Link href="/seller/pod-setup" className="bg-white/10 rounded-lg p-2.5 sm:p-4 hover:bg-white/20 transition">
              <p className="text-lg sm:text-2xl font-bold">✨</p>
              <p className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Setup Wizard</p>
            </Link>
            <Link href="/seller/pod-products" className="bg-white/10 rounded-lg p-2.5 sm:p-4 hover:bg-white/20 transition">
              <p className="text-lg sm:text-2xl font-bold">🎨</p>
              <p className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">All Products</p>
            </Link>
            <Link href="/seller/pod-orders" className="bg-white/10 rounded-lg p-2.5 sm:p-4 hover:bg-white/20 transition">
              <p className="text-lg sm:text-2xl font-bold">📦</p>
              <p className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">POD Orders</p>
            </Link>
            <div className="bg-white/10 rounded-lg p-2.5 sm:p-4">
              <p className="text-lg sm:text-2xl font-bold">Printful</p>
              <p className="text-[10px] sm:text-sm mt-0.5 sm:mt-1 opacity-80">454+ Products</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5 sm:p-4">
              <p className="text-lg sm:text-2xl font-bold">Printify</p>
              <p className="text-[10px] sm:text-sm mt-0.5 sm:mt-1 opacity-80">1000+ Products</p>
            </div>
          </div>
        </div>

        {/* Boutique Section - Physical Products */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-8 text-white">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-3">
              <Store className="w-6 h-6" />
              <h2 className="text-sm sm:text-lg font-semibold">Physical Boutique</h2>
            </div>
            <Link href="/seller/boutique/upload" className="text-[10px] sm:text-sm bg-white/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full hover:bg-white/30 transition">
              + Add Product
            </Link>
          </div>
          <p className="text-[10px] sm:text-sm opacity-90 mb-3 sm:mb-4">
            Sell your physical fashion items! Upload clothing, accessories, bags, and more. 
            Ship to our warehouse or directly to customers.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            <Link href="/seller/boutique/upload" className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
              <p className="text-2xl font-bold">📦</p>
              <p className="text-sm mt-1">Upload Product</p>
            </Link>
            <Link href="/seller/boutique" className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
              <p className="text-2xl font-bold">👗</p>
              <p className="text-sm mt-1">My Products</p>
            </Link>
            <Link href="/seller/boutique/orders" className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
              <p className="text-2xl font-bold">🛍️</p>
              <p className="text-sm mt-1">Boutique Orders</p>
            </Link>
            <Link href="/seller/boutique/earnings" className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
              <p className="text-2xl font-bold">💰</p>
              <p className="text-sm mt-1">Earnings</p>
            </Link>
            <Link href="/seller/boutique/ship" className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition">
              <p className="text-2xl font-bold flex items-center gap-1">
                <Truck className="w-5 h-5" />
              </p>
              <p className="text-sm mt-1">Ship to Warehouse</p>
            </Link>
          </div>
        </div>

        {/* Featured Items Section */}
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-8 text-white">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6" />
              <h2 className="text-sm sm:text-lg font-semibold">Featured Items</h2>
            </div>
            <Link href="/seller/featured-items" className="text-[10px] sm:text-sm bg-white/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full hover:bg-white/30 transition">
              Manage
            </Link>
          </div>
          <p className="text-[10px] sm:text-sm opacity-90 mb-3 sm:mb-4">
            Showcase your best designs and products! Feature up to 6 items in your shop and platform.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            <Link href="/seller/featured-items" className="bg-white/10 rounded-lg p-2.5 sm:p-4 hover:bg-white/20 transition">
              <p className="text-lg sm:text-2xl font-bold">⭐</p>
              <p className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Manage Featured</p>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 md:gap-8">
          {/* Top Designs */}
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-6">
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Top Performing Designs</h2>
              <Link href="/seller/designs" className="text-[10px] sm:text-sm text-indigo-600 hover:text-indigo-800">
                View all
              </Link>
            </div>
            <div className="space-y-2 sm:space-y-4">
              {analytics.topDesigns.map((design, index) => (
                <Link
                  key={design.id}
                  href={`/designs/${design.id}`}
                  className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm sm:text-lg font-bold text-gray-400 w-4 sm:w-6">{index + 1}</span>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-100 relative flex-shrink-0">
                    <Image
                      src={design.thumbnailUrl || design.imageUrl || '/api/placeholder?w=48&h=48&text=Design'}
                      alt={design.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-base font-medium text-gray-900 truncate">{design.title}</p>
                    <p className="text-[10px] sm:text-sm text-gray-500">{design.totalSales} sales</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-base font-semibold text-gray-900">{formatCurrency(design.totalRevenue)}</p>
                  </div>
                </Link>
              ))}
              {analytics.topDesigns.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Package className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-base">No sales yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-6">
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/seller/orders" className="text-[10px] sm:text-sm text-indigo-600 hover:text-indigo-800">
                View all
              </Link>
            </div>
            <div className="space-y-2 sm:space-y-4">
              {analytics.recentOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {order.customer.image ? (
                      <Image
                        src={order.customer.image}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-xs sm:text-base text-gray-600 font-medium">
                        {(order.customer.name || 'C')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-base font-medium text-gray-900 truncate">#{order.orderNumber}</p>
                    <p className="text-[10px] sm:text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-base font-semibold text-gray-900">
                      {formatCurrency(order.items.reduce((sum, i) => sum + i.price * i.quantity, 0))}
                    </p>
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
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
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <ShoppingBag className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-base">No orders yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="mt-4 sm:mt-8 bg-white rounded-xl shadow-sm p-3 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-6">
            <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Recent Reviews</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            {analytics.recentReviews.map((review) => (
              <div key={review.id} className="p-2.5 sm:p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {review.user.image ? (
                      <Image src={review.user.image} alt="" width={32} height={32} />
                    ) : (
                      <span className="text-[10px] sm:text-sm font-medium text-gray-600">
                        {(review.user.name || 'U')[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">{review.user.name || 'Anonymous'}</p>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/designs/${review.design.id}`}
                  className="text-[10px] sm:text-sm text-indigo-600 hover:underline"
                >
                  {review.design.title}
                </Link>
                {review.comment && (
                  <p className="text-[10px] sm:text-sm text-gray-600 mt-1.5 sm:mt-2">{review.comment}</p>
                )}
              </div>
            ))}
            {analytics.recentReviews.length === 0 && (
              <div className="col-span-2 text-center py-6 sm:py-8 text-gray-500">
                <Star className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-base">No reviews yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions - Organized by Category */}
        <div className="mt-4 sm:mt-8">
          {/* Digital Products Section */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide px-2 mb-2 sm:mb-3">Digital Products</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <Link
                href="/seller/designs"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Manage Designs</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Edit & organize your work</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/featured-items"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-yellow-100"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Featured Items</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Manage featured designs & products</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/pod-orders"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📦</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">POD Orders</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Print-on-demand order tracking</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/pod-settings"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">POD Settings</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Manage POD availability</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>
            </div>
          </div>

          {/* Physical Products Section */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide px-2 mb-2 sm:mb-3">Physical Products</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <Link
                href="/seller/boutique"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-purple-100"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Boutique Products</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Manage physical items</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/boutique/orders"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-pink-100"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Boutique Orders</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Track & fulfill orders</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/boutique/returns"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">↩️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Boutique Returns</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Manage return requests</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/boutique/settings"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Boutique Settings</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Shipping & product settings</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>
            </div>
          </div>

          {/* Orders & Commissions Section */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide px-2 mb-2 sm:mb-3">Orders & Commissions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <Link
                href="/seller/orders"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">All Orders</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Digital & physical orders</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/commission-requests"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-rose-100"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                  <Palette className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Commission Requests</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Custom work inquiries</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/commission-settings"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Commission Settings</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Manage commission availability</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/commission-settings/milestones"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Tier Milestones</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Track seller tier progress</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>
            </div>
          </div>

          {/* Finances & Promotions Section */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide px-2 mb-2 sm:mb-3">Finances & Promotions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <Link
                href="/seller/finances"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-indigo-100"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Finances Hub</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Earnings, payments & transfers</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/promotions"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Manage Promotions</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Create discounts & bundles</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/upgrade"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">⬆️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Upgrade Account</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Explore premium seller benefits</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>
            </div>
          </div>

          {/* Settings & Verification Section */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide px-2 mb-2 sm:mb-3">Settings & Verification</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <Link
                href="/seller/settings"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-gray-100"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Seller Settings</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Bank account & payout preferences</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/profile/edit"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Profile Settings</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Profile & preferences</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/verification"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Account Verification</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Verify seller account status</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>

              <Link
                href="/seller/onboarding"
                className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-2 border-indigo-100"
              >
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2 sm:truncate">Getting Started</p>
                  <p className="text-[10px] sm:text-sm text-gray-500 hidden sm:block">Seller onboarding guide</p>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hidden sm:block" />
              </Link>
            </div>
          </div>
        </div>

        {/* Help & Resources Section */}
        <div className="mt-4 sm:mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Help & Resources</h2>
              <p className="text-[10px] sm:text-sm text-gray-600">Learn how to maximize your sales</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <Link
              href="/help?category=seller-tiers"
              className="bg-white p-2.5 sm:p-4 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-yellow-500" />
                <span className="text-xs sm:text-base font-medium text-gray-900 group-hover:text-indigo-600">Seller Tiers</span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600">Earn more with lower fees</p>
            </Link>
            <Link
              href="/help?category=commissions"
              className="bg-white p-2.5 sm:p-4 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <Palette className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-pink-500" />
                <span className="text-xs sm:text-base font-medium text-gray-900 group-hover:text-indigo-600">Commissions</span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600">Custom work guide</p>
            </Link>
            <Link
              href="/help?category=pod"
              className="bg-white p-2.5 sm:p-4 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <Printer className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-cyan-500" />
                <span className="text-xs sm:text-base font-medium text-gray-900 group-hover:text-indigo-600">POD</span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600">Sell physical products</p>
            </Link>
            <Link
              href="/help?category=digital-designs"
              className="bg-white p-2.5 sm:p-4 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <BookOpen className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-purple-500" />
                <span className="text-xs sm:text-base font-medium text-gray-900 group-hover:text-indigo-600">Digital Sales</span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600">Selling digital designs</p>
            </Link>
          </div>
          <div className="mt-3 sm:mt-4 text-center">
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 sm:gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-xs sm:text-sm"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              View Full Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
