'use client'

import { useState, useEffect, useCallback } from 'react'
import SafeImage from '@/components/ui/safe-image'
import Banner from '@/components/ui/banner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Heart, ShoppingCart, Star, Eye, Crown, TrendingUp, Flame } from 'lucide-react'

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
  const isAdmin = ((session?.user as { role?: string } | undefined)?.role === 'ADMIN')
  const router = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFrame, setTimeFrame] = useState('all')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const timeFrames = [
    { value: 'all', label: 'All Time' },
    { value: 'month', label: 'This Month' },
    { value: 'week', label: 'This Week' },
  ]

  const fetchTrendingDesigns = useCallback(async () => {
    try {
      setLoading(true)
      const controller = new AbortController()
      const params = new URLSearchParams({ featured: 'true', limit: '20' })
      if (timeFrame && timeFrame !== 'all') params.set('timeframe', timeFrame)
      // Get featured designs which are sorted by sales and revenue, optionally filtered by timeframe
      const response = await fetch(`/api/designs?${params.toString()}`, { signal: controller.signal })
      if (response.ok) {
        const data = await response.json()
        setDesigns(data.designs)
      } else if (response.status === 503) {
        // DB not configured or temporarily unavailable
        const data = await response.json().catch(() => ({}))
        setDesigns([])
        setErrorMessage(
          (data?.warning as string) || 'Service temporarily unavailable. Please try again later.'
        )
      }
    } catch (error) {
      console.error('Failed to fetch trending designs:', error)
      if ((error as { name?: string }).name !== 'AbortError') {
        setErrorMessage('Failed to load trending designs.')
      }
    } finally {
      setLoading(false)
    }
  }, [timeFrame])

  useEffect(() => {
    fetchTrendingDesigns()
    // No cleanup needed; fetch has internal abort protection
  }, [fetchTrendingDesigns])

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
        setSuccessMessage(`"${designTitle}" added to cart successfully!`)
        window.dispatchEvent(new CustomEvent('cartUpdated'))
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const error = await response.json()
        setErrorMessage(`Failed to add to cart: ${error.message}`)
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      setErrorMessage('Failed to add to cart. Please try again.')
    } finally {
      setAddingToCart(null)
    }
  }

  // Image sanitization handled by SafeImage

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-8 w-8 text-red-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Trending Designs</h1>
            <Flame className="h-6 w-6 text-orange-500 ml-2" />
          </div>
          <p className="text-gray-700 mb-6">
            Discover the most popular fashion designs based on sales, views, and community engagement
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {timeFrames.map((frame) => (
              <button
                key={frame.value}
                onClick={() => setTimeFrame(frame.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
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

        {/* Notices */}
        {successMessage && (
          <Banner type="success" onClose={() => setSuccessMessage(null)} className="p-3 text-sm sm:text-base">
            {successMessage}
          </Banner>
        )}
        {errorMessage && (
          <Banner type="error" onClose={() => setErrorMessage(null)} className="p-3 text-sm sm:text-base">
            {errorMessage}
          </Banner>
        )}

        {/* Trending Designs Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5 xl:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-300 rounded-t-lg" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-300 rounded" />
                  <div className="h-3 bg-gray-300 rounded w-2/3" />
                  <div className="h-4 bg-gray-300 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No trending designs yet</h2>
            <p className="text-gray-600 mb-6">
              Be the first to create trending content!
            </p>
            <Link 
              href="/upload" 
              className="inline-flex items-center px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 font-medium"
            >
              Upload Your Design
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5 xl:gap-6">
            {designs.map((design, index) => (
              <div key={design.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group relative transition-transform duration-200 ease-out hover:-translate-y-0.5">
                {/* Trending Badge */}
                {index < 3 && (
                  <div className="absolute top-2 left-2 z-10">
                    <div className={`inline-flex items-center px-2 py-1 text-white text-xs font-medium rounded-full shadow-sm ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                      'bg-gradient-to-r from-orange-400 to-orange-600'
                    }`}>
                      <Flame className="h-3 w-3 mr-1" />
                      #{index + 1}
                    </div>
                  </div>
                )}

                <Link href={`/designs/${design.id}`}>
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                    <SafeImage
                      src={design.thumbnailUrl || design.imageUrl}
                      alt={design.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Premium Badge */}
                    {design.mediaFiles?.some(file => file.accessType === 'PREMIUM') && (
                      <div className="absolute top-2 right-2">
                        <div className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-medium rounded-full shadow-sm">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" aria-label="Add to favorites">
                        <Heart className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </Link>
                
                <div className="p-4">
                  <Link href={`/designs/${design.id}`}>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-indigo-700">
                      {design.title}
                    </h3>
                  </Link>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    by {design.designer.name || 'Anonymous'}
                  </p>
                  
                  {/* Trending Stats */}
                  <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {design.totalSales} sales
                      </span>
                      {design._count?.favorites ? (
                        <span className="flex items-center">
                          <Heart className="h-3 w-3 mr-1" />
                          {design._count.favorites}
                        </span>
                      ) : null}
                    </div>
                    {isAdmin && (
                      <div className="text-green-600 font-medium">
                        {formatPrice(design.totalRevenue || 0)} earned
                      </div>
                    )}
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
                    className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs xs:text-sm md:px-4 md:py-2 md:text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 whitespace-nowrap"
                    title="View design details"
                    aria-label="View details"
                  >
                    <Eye className="h-3 w-3 md:h-4 md:w-4 mr-2" />
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
        <div className="mt-16 text-center bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-8">
          <TrendingUp className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Want to be trending?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Upload high-quality designs, engage with the community, and watch your creations climb the trending charts!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/upload"
              className="inline-flex items-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Upload Design
            </Link>
            <Link 
              href="/designs"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Browse All Designs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}