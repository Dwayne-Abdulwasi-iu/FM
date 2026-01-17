'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Users, Globe, DollarSign } from 'lucide-react'

interface Stat {
  number: string
  label: string
  raw?: number
}

interface LiveStats {
  stats: Stat[]
  details?: {
    totalDesigns: number
    activeDesigners: number
    designsSold: number
    totalEarnings: number
    countriesReached: number
  }
  updatedAt?: string
  fallback?: boolean
}

const STAT_ICONS = [
  <Users key="users" className="w-6 h-6 sm:w-8 sm:h-8 text-primary-500" />,
  <TrendingUp key="trending" className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />,
  <Globe key="globe" className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />,
  <DollarSign key="dollar" className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
]

export function Stats() {
  const [data, setData] = useState<LiveStats | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Try live stats first
        const liveResponse = await fetch('/api/stats/live')
        if (liveResponse.ok) {
          const liveData = await liveResponse.json()
          setData(liveData)
          setIsAnimating(true)
          return
        }
        
        // Fallback to admin stats
        const response = await fetch('/api/admin/stats-settings')
        if (response.ok) {
          const settingsData = await response.json()
          setData({ stats: settingsData.stats })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        // Use default fallback
        setData({
          stats: [
            { number: '1,000+', label: 'Active Designers' },
            { number: '5,000+', label: 'Designs Sold' },
            { number: '50+', label: 'Countries' },
            { number: '$100K+', label: 'Earned by Designers' }
          ]
        })
      }
    }

    fetchStats()
  }, [])

  if (!data) {
    return (
      <section className="py-8 sm:py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse text-center p-4">
                <div className="h-8 bg-gray-200 rounded w-24 mx-auto mb-2" />
                <div className="h-4 bg-gray-100 rounded w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Trusted by Designers Worldwide
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Join our growing community of fashion creators
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {data.stats.map((stat, index) => (
            <div 
              key={stat.label} 
              className={`
                text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100
                hover:shadow-md hover:border-primary-200 transition-all duration-300
                ${isAnimating ? 'animate-fade-in' : ''}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-center mb-3">
                {STAT_ICONS[index] || STAT_ICONS[0]}
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
                {stat.number}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Real-time indicator */}
        {data.details && !data.fallback && (
          <div className="mt-6 text-center">
            <span className="inline-flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live data
            </span>
          </div>
        )}
      </div>
    </section>
  )
}