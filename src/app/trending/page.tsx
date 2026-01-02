'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Heart, ShoppingCart, Star, Eye, Crown, TrendingUp, Flame } from 'lucide-react'
import Image from 'next/image'

interface Design {
  id: string
  title: string
  description: string | null
  price: number
  imageUrl: string
  thumbnailUrl: string | null
  category: string
  tags: string | null
  createdAt: string
  totalSales: number
  totalRevenue: number
  designer: {
    id: string
    name: string | null
  }
  _count?: {
    reviews: number
    favorites: number
  }
  mediaFiles?: {
    accessType: string
  }[]
}

export default function TrendingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFrame, setTimeFrame] = useState('all')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  const timeFrames = [
    { value: 'all', label: 'All Time' },
    { value: 'month', label: 'This Month' },
    { value: 'week', label: 'This Week' },
  ]

  useEffect(() => {
    fetchTrendingDesigns()
  }, [timeFrame])

  const fetchTrendingDesigns = async () => {
    try {
      setLoading(true)
      // Get featured designs which are sorted by sales and revenue
      const response = await fetch('/api/designs?featured=true&limit=20')
      if (response.ok) {
        const data = await response.json()
        setDesigns(data.designs)
      }
    } catch (error) {
      console.error('Failed to fetch trending designs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleAddToCart = async (designId: string, designTitle: string) => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setAddingToCart(designId)
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designId,
          quantity: 1,
          purchaseType: 'REGULAR'
        }),
      })

      if (response.ok) {
        alert(`"${designTitle}" added to cart successfully!`)
        window.dispatchEvent(new CustomEvent('cartUpdated'))
      } else {
        const error = await response.json()
        alert(`Failed to add to cart: ${error.message}`)
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      alert('Failed to add to cart. Please try again.')
    } finally {
      setAddingToCart(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center mb-2 sm:mb-3">
            <TrendingUp className="h-5 w-5 sm:h-8 sm:w-8 text-red-500 mr-2 sm:mr-3" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Trending Designs</h1>
            <Flame className="h-4 w-4 sm:h-6 sm:w-6 text-orange-500 ml-1 sm:ml-2" />
          </div>
          <p className="text-xs sm:text-sm text-gray-700">
            Discover the most popular fashion designs based on sales, views, and community engagement
          </p>
        </div>

        {/* Time Frame Filter */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {timeFrames.map((frame) => (
              <button
                key={frame.value}
                onClick={() => setTimeFrame(frame.value)}
                className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  timeFrame === frame.value
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 hover:border-red-300'
                }`}
              >
                {frame.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trending Designs Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-300 rounded-t-lg" />
                <div className="p-2 sm:p-3 space-y-1 sm:space-y-1.5">
                  <div className="h-3 bg-gray-300 rounded" />
                  <div className="h-2 bg-gray-300 rounded w-2/3" />
                  <div className="h-3 bg-gray-300 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <TrendingUp className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-2 sm:mb-4" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">No trending designs yet</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
              Be the first to create trending content!
            </p>
            <Link 
              href="/upload" 
              className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 font-medium text-xs sm:text-sm"
            >
              Upload Your Design
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {designs.map((design, index) => (
              <div key={design.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group relative">
                {/* Trending Badge */}
                {index < 3 && (
                  <div className="absolute top-1 left-1 z-10">
                    <div className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-white text-[8px] sm:text-xs font-medium rounded-full shadow-sm ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                      'bg-gradient-to-r from-orange-400 to-orange-600'
                    }`}>
                      <Flame className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5" />
                      #{index + 1}
                    </div>
                  </div>
                )}

                <Link href={`/designs/${design.id}`}>
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                    <Image
                      src={design.thumbnailUrl || design.imageUrl}
                      alt={design.title}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      placeholder="blur"
                      blurDataURL={'/api/placeholder/400/400'}
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/api/placeholder/400/400'
                      }}
                    />
                    {/* Premium Badge */}
                    {design.mediaFiles?.some(file => file.accessType === 'PREMIUM') && (
                      <div className="absolute top-1 right-1">
                        <div className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-[8px] sm:text-xs font-medium rounded-full shadow-sm">
                          <Crown className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5" />
                          Premium
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 sm:p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" aria-label="Add to favorites">
                        <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </Link>
                
                <div className="p-2 sm:p-3">
                  <Link href={`/designs/${design.id}`}>
                    <h3 className="font-semibold text-gray-900 mb-0.5 line-clamp-2 hover:text-indigo-700 text-xs sm:text-sm">
                      {design.title}
                    </h3>
                  </Link>
                  
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2 truncate">
                    by {design.designer.name || 'Anonymous'}
                  </p>
                  
                  {/* Trending Stats */}
                  <div className="flex items-center justify-between mb-2 sm:mb-3 text-[9px] sm:text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center">
                        <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                        {design.totalSales}
                      </span>
                      {design._count?.favorites ? (
                        <span className="flex items-center">
                          <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                          {design._count.favorites}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-green-600 font-medium truncate">
                      {formatPrice(design.totalRevenue || 0)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-lg text-gray-900">
                      {formatPrice(design.price)}
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      {design._count?.reviews ? (
                        <div className="flex items-center text-sm text-gray-500">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          {design._count.reviews}
                        </div>
                      ) : null}
                      
                      <button 
                        onClick={() => handleAddToCart(design.id, design.title)}
                        disabled={addingToCart === design.id}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                        aria-label="Add to cart"
                      >
                        {addingToCart === design.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* View Details Button */}
                  <Link 
                    href={`/designs/${design.id}`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium mb-2"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                  
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded font-medium">
                      {design.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-8 sm:mt-12 text-center bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 sm:p-6 lg:p-8">
          <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-red-500 mx-auto mb-2 sm:mb-4" />
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Want to be trending?</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 max-w-2xl mx-auto">
            Upload high-quality designs, engage with the community, and watch your creations climb the trending charts!
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
            <Link 
              href="/upload"
              className="inline-flex items-center justify-center px-4 sm:px-6 py-1.5 sm:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors text-xs sm:text-base"
            >
              <TrendingUp className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              Upload Design
            </Link>
            <Link 
              href="/designs"
              className="inline-flex items-center justify-center px-4 sm:px-6 py-1.5 sm:py-3 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-xs sm:text-base"
            >
              Browse All Designs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}