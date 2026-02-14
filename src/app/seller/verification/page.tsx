'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  BadgeCheck,
  Shield,
  Award,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Zap,
  Badge
} from 'lucide-react'

interface SellerStats {
  totalSales: number
  avgRating: number
  designCount: number
  currentBadge: string | null
  allBadges: string[]
}

export default function VerificationPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [stats, setStats] = useState<SellerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionStatus])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/seller/stats')
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch seller stats:', error)
      // Continue anyway - will show error state
    } finally {
      setLoading(false)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-48 mb-8" />
          <div className="h-64 bg-gray-300 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600">Unable to load your stats. Please try again later.</p>
          </div>
        </div>
      </div>
    )
  }

  const badgeThresholds = [
    {
      badge: 'RISING_STAR',
      icon: <Star className="w-8 h-8 text-purple-500" />,
      name: 'Rising Star',
      description: 'Fast-growing new designer',
      requirements: { sales: 5, rating: 4.0, designs: 3 },
      color: 'purple'
    },
    {
      badge: 'TOP_SELLER',
      icon: <Award className="w-8 h-8 text-yellow-500" />,
      name: 'Top Seller',
      description: 'Highly successful designer',
      requirements: { sales: 50, rating: 4.3, designs: 10 },
      color: 'yellow'
    },
    {
      badge: 'VERIFIED_PRO',
      icon: <BadgeCheck className="w-8 h-8 text-blue-500" />,
      name: 'Verified Pro',
      description: 'Professional verified designer',
      requirements: { sales: 100, rating: 4.5, designs: 20 },
      color: 'blue',
      requiresManual: true
    },
    {
      badge: 'ELITE',
      icon: <Zap className="w-8 h-8 text-amber-500" />,
      name: 'Elite',
      description: 'Premier marketplace designer',
      requirements: { sales: 500, rating: 4.7, designs: 50 },
      color: 'amber',
      requiresManual: true
    }
  ]

  const qualifiesForBadge = (requirements: { sales: number; rating: number; designs: number }) => {
    return (
      stats.totalSales >= requirements.sales &&
      stats.avgRating >= requirements.rating &&
      stats.designCount >= requirements.designs
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Badges</h1>
        <p className="text-gray-600 mb-8">
          Earn badges automatically as you grow! Badges showcase your professional standing and build buyer trust.
        </p>

        {/* Your Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSales}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgRating.toFixed(1)}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Designs Published</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.designCount}</p>
              </div>
              <Badge className="w-8 h-8 text-indigo-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Current Badges */}
        {stats.allBadges && stats.allBadges.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm p-6 mb-8 border border-indigo-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎉 Your Earned Badges
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {stats.allBadges.map((badgeId) => {
                const badgeInfo = badgeThresholds.find(b => b.badge === badgeId)
                if (!badgeInfo) return null
                return (
                  <div key={badgeId} className="flex flex-col items-center p-4 bg-white rounded-lg border border-indigo-200">
                    <div className="mb-3">
                      {badgeInfo.icon}
                    </div>
                    <p className="font-semibold text-gray-900 text-center text-sm">{badgeInfo.name}</p>
                    <p className="text-xs text-gray-500 text-center mt-1">{badgeInfo.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Badge Roadmap */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Badge Requirements</h2>
          
          {badgeThresholds.map((badge) => {
            const qualifies = qualifiesForBadge(badge.requirements)
            const isCurrentBadge = badge.badge === stats.currentBadge
            
            return (
              <div
                key={badge.badge}
                className={`rounded-xl p-6 border-2 transition-all ${
                  isCurrentBadge
                    ? `border-${badge.color}-500 bg-${badge.color}-50`
                    : qualifies
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {badge.icon}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{badge.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
                      {badge.requiresManual && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          ✓ This badge requires admin verification after you meet all requirements.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    {isCurrentBadge ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        Earned
                      </span>
                    ) : qualifies ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        Qualify
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                        <Clock className="w-4 h-4" />
                        In Progress
                      </span>
                    )}
                  </div>
                </div>

                {/* Requirements Progress */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Sales Required</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-lg font-bold ${stats.totalSales >= badge.requirements.sales ? 'text-green-600' : 'text-gray-900'}`}>
                        {stats.totalSales}/{badge.requirements.sales}
                      </span>
                    </div>
                    <div className="mt-2 bg-gray-300 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${stats.totalSales >= badge.requirements.sales ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{width: `${Math.min(100, (stats.totalSales / badge.requirements.sales) * 100)}%`}}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Rating Required</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-lg font-bold ${stats.avgRating >= badge.requirements.rating ? 'text-green-600' : 'text-gray-900'}`}>
                        {stats.avgRating.toFixed(1)}/{badge.requirements.rating}
                      </span>
                    </div>
                    <div className="mt-2 bg-gray-300 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${stats.avgRating >= badge.requirements.rating ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{width: `${Math.min(100, (stats.avgRating / badge.requirements.rating) * 100)}%`}}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Designs Required</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-lg font-bold ${stats.designCount >= badge.requirements.designs ? 'text-green-600' : 'text-gray-900'}`}>
                        {stats.designCount}/{badge.requirements.designs}
                      </span>
                    </div>
                    <div className="mt-2 bg-gray-300 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${stats.designCount >= badge.requirements.designs ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{width: `${Math.min(100, (stats.designCount / badge.requirements.designs) * 100)}%`}}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">How badges work:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>✓ Badges are <strong>automatically awarded</strong> when you meet all requirements</li>
                <li>✓ RISING_STAR, TOP_SELLER badges are immediate</li>
                <li>✓ VERIFIED_PRO and ELITE badges require admin verification after you qualify</li>
                <li>✓ Badges appear on your profile, designs, and in search results</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
