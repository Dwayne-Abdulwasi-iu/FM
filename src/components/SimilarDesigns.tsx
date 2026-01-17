'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ArrowRight, Sparkles } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyProvider'

interface Designer {
  id: string
  name: string | null
  image: string | null
}

interface SimilarDesign {
  id: string
  title: string
  price: number
  imageUrl: string
  thumbnailUrl: string | null
  category: string
  avgRating?: number
  designer: Designer
  _count?: {
    reviews: number
    favorites: number
  }
  // Recommendation data
  recommendationScore?: number
  recommendationReasons?: string[]
  similarity?: number
}

interface SimilarDesignsProps {
  designId: string
  category?: string
  designerId?: string
  limit?: number
}

export default function SimilarDesigns({ 
  designId, 
  category,
  designerId,
  limit = 4 
}: SimilarDesignsProps) {
  const [designs, setDesigns] = useState<SimilarDesign[]>([])
  const [loading, setLoading] = useState(true)
  const { formatPrice } = useCurrency()

  useEffect(() => {
    const fetchSimilarDesigns = async () => {
      try {
        setLoading(true)
        
        // Try the recommendations API first
        const recRes = await fetch(`/api/designs/similar?designId=${designId}&limit=${limit}&type=similar`)
        
        if (recRes.ok) {
          const recData = await recRes.json()
          if (recData.designs && recData.designs.length > 0) {
            setDesigns(recData.designs)
            setLoading(false)
            return
          }
        }

        // Fallback: fetch designs from same category
        const categoryParam = category ? `&category=${encodeURIComponent(category)}` : ''
        const res = await fetch(
          `/api/designs?limit=${limit + 1}&exclude=${designId}${categoryParam}`
        )
        
        if (res.ok) {
          const data = await res.json()
          // Filter out the current design and limit results
          const filteredDesigns = (data.designs || [])
            .filter((d: SimilarDesign) => d.id !== designId)
            .slice(0, limit)
          setDesigns(filteredDesigns)
        }
      } catch (error) {
        console.error('Error fetching similar designs:', error)
      } finally {
        setLoading(false)
      }
    }

    if (designId) {
      fetchSimilarDesigns()
    }
  }, [designId, category, limit])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Similar Designs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg aspect-square mb-2" />
              <div className="bg-gray-200 h-4 rounded w-3/4 mb-1" />
              <div className="bg-gray-200 h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (designs.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Similar Designs
        </h2>
        {category && (
          <Link
            href={`/categories/${category.toLowerCase().replace(/\s+/g, '-')}`}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View more
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {designs.map((design) => (
          <Link
            key={design.id}
            href={`/designs/${design.id}`}
            className="group block"
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
              <Image
                src={design.thumbnailUrl || design.imageUrl}
                alt={design.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {design.recommendationScore && design.recommendationScore > 0.8 && (
                <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Top Match
                </div>
              )}
            </div>
            <h3 className="font-medium text-gray-900 text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">
              {design.title}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <p className="text-primary-600 font-semibold text-sm">
                {formatPrice(design.price)}
              </p>
              {design.avgRating && design.avgRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-gray-600">
                    {design.avgRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            {design.designer?.name && (
              <p className="text-xs text-gray-500 mt-1">
                by {design.designer.name}
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* Show recommendation reasons if available */}
      {designs.some(d => d.recommendationReasons && d.recommendationReasons.length > 0) && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Recommended based on: style similarity, category match, and designer portfolio
          </p>
        </div>
      )}
    </div>
  )
}
