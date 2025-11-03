"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORY_LIST = [
  { name: 'Fashion Illustrations', image: '🎨' },
  { name: 'Sketches', image: '✏️' },
  { name: 'Digital Designs', image: '💻' },
  { name: 'Pattern Designs', image: '🎭' },
]

export function Categories() {
  const router = useRouter()

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchCounts = async () => {
      try {
        const results: Record<string, number> = {}
        await Promise.all(
          CATEGORY_LIST.map(async (c) => {
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
        console.error('Failed to fetch category counts', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

  fetchCounts()

    return () => {
      mounted = false
    }
  }, [])

  const handleClick = (categoryName: string) => {
    // Navigate to designs page filtered by category
    router.push(`/designs?category=${encodeURIComponent(categoryName)}`)
  }

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Browse by Categories</h2>
        <p className="text-white text-center mb-12">Explore different types of fashion designs and illustrations</p>
  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORY_LIST.map((category) => (
            <button
              key={category.name}
              onClick={() => handleClick(category.name)}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-4 xs:p-5 md:p-6 text-center hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{category.image}</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 group-hover:text-indigo-700">{category.name}</h3>
              <p className="text-gray-700 font-medium">
                {loading ? 'Loading...' : `${(counts[category.name] ?? 0).toLocaleString()} designs`}
              </p>
              <div className="mt-3 text-indigo-700 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                Explore →
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}