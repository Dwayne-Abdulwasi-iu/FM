"use client"
import React from 'react'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function Categories() {
  const router = useRouter()
  const categoryList = React.useMemo(() => ([
    { name: 'Fashion Illustrations', image: '🎨' },
    { name: 'Sketches', image: '✏️' },
    { name: 'Digital Designs', image: '💻' },
    { name: 'Pattern Designs', image: '🎭' },
  ]), [])

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchCounts = async () => {
      try {
        const results: Record<string, number> = {}
        await Promise.all(
          categoryList.map(async (c) => {
            // Request with limit=1 to get pagination.total which contains exact count
            const url = `/api/designs?category=${encodeURIComponent(c.name)}&limit=1`
            const res = await fetch(url)
            if (res.ok) {
              const data = await res.json()
              results[c.name] = data.pagination?.total ?? 0
            } else {
              results[c.name] = 0
            }
          })
        )

        if (mounted) {
          setCounts(results)
        }
      } catch (error) {
          void error
          console.error('Failed to fetch category counts', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchCounts()

    return () => {
      mounted = false
    }
  }, [categoryList])

  const handleClick = (categoryName: string) => {
    // Navigate to designs page filtered by category
    router.push(`/designs?category=${encodeURIComponent(categoryName)}`)
  }

  return (
    <section className="py-5 sm:py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm sm:text-lg lg:text-2xl font-bold text-white text-center mb-1 sm:mb-2">Browse by Categories</h2>
        <p className="text-[9px] sm:text-xs text-white text-center mb-3 sm:mb-4 lg:mb-6">Explore different types of designs</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {categoryList.map((category) => (
            <button
              key={category.name}
              onClick={() => handleClick(category.name)}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-2 sm:p-3 text-center hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="text-lg sm:text-2xl mb-1 sm:mb-1.5 group-hover:scale-110 transition-transform">{category.image}</div>
              <h3 className="font-semibold text-[8px] sm:text-xs mb-0.5 text-gray-900 group-hover:text-indigo-700 line-clamp-2">{category.name}</h3>
              <p className="text-gray-700 font-medium text-[7px] sm:text-[8px]">
                {loading ? 'Loading...' : `${(counts[category.name] ?? 0).toLocaleString()} designs`}
              </p>
              <div className="mt-1 text-indigo-700 font-medium text-[7px] sm:text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                Explore →
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}