'use client'

import { useEffect, useState } from 'react'

interface Stat {
  number: string
  label: string
}

const DEFAULT_STATS: Stat[] = [
  { number: "10,000+", label: "Active Designers" },
  { number: "50,000+", label: "Designs Sold" },
  { number: "150+", label: "Countries" },
  { number: "$2M+", label: "Earned by Designers" },
]

export function Stats() {
  const [stats, setStats] = useState<Stat[] | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats-settings')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats || DEFAULT_STATS)
        } else {
          setStats(DEFAULT_STATS)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setStats(DEFAULT_STATS)
      }
    }

    fetchStats()
  }, [])

  // Don't render until stats are loaded from API
  if (stats === null) {
    return null
  }

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-center mb-6 sm:mb-8">Our Community</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-600 mb-1 sm:mb-2">{stat.number}</div>
              <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}