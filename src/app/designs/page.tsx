'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import SafeImage from '@/components/ui/safe-image'
import Banner from '@/components/ui/banner'
import { Heart, ShoppingCart, Star, Eye, Crown } from 'lucide-react'
import { toast } from 'react-hot-toast'
// Removed unused placeholder import

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
  designer: {
    id: string
    name: string | null
  }
  totalSales: number
  _count?: {
    reviews: number
  }
  mediaFiles?: {
    accessType: string
  }[]
}

function DesignsPageInner() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const categories = [
    'all',
    'Fashion Illustrations',
    'Digital Designs',
    'Pattern Designs',
    'Sketches',
    'Technical Drawings',
    'Concept Art'
  ]

  // Set category from URL parameter on initial load
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    if (categoryParam && categories.includes(categoryParam)) {
      setSelectedCategory(categoryParam)
    }
    // categories is a static array; safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    fetchDesigns()
    // categories is a static array; safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory])

  const fetchDesigns = async () => {
    try {
      setLoading(true)
      const url = selectedCategory === 'all' 
        ? '/api/designs'
        : `/api/designs?category=${encodeURIComponent(selectedCategory)}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDesigns(data.designs)
      }
    } catch (error) {
      console.error('Failed to fetch designs:', error)
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
        const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
        if (isMobile) {
          toast.success(`Added "${designTitle}" to cart`, {
            duration: 1500,
            position: 'top-center',
            style: { fontSize: '0.875rem', padding: '6px 10px' }
          })
        } else {
          setSuccessMessage(`"${designTitle}" added to cart successfully!`)
          setTimeout(() => setSuccessMessage(null), 3000)
        }
        window.dispatchEvent(new CustomEvent('cartUpdated'))
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

  // Image sanitization is centralized in SafeImage

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Fashion Designs</h1>
          <p className="text-gray-700">Discover unique fashion illustrations and designs from talented creators</p>
        </div>

        {/* Notices */}
        {successMessage && (
          <Banner type="success" onClose={() => setSuccessMessage(null)} className="hidden sm:block p-3 text-sm sm:text-base">
            {successMessage}
          </Banner>
        )}
        {errorMessage && (
          <Banner type="error" onClose={() => setErrorMessage(null)} className="p-2 sm:p-3 text-sm sm:text-base">
            {errorMessage}
          </Banner>
        )}

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-indigo-700 text-white shadow-md'
                    : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 hover:border-indigo-300'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
          {selectedCategory !== 'all' && (
            <div className="mt-4 text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                {selectedCategory}
              </span>
            </div>
          )}
        </div>

        {/* Designs Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5 xl:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-300 rounded-t-lg" />
                <div className="p-3 sm:p-4 space-y-2">
                  <div className="h-4 bg-gray-300 rounded" />
                  <div className="h-3 bg-gray-300 rounded w-2/3" />
                  <div className="h-4 bg-gray-300 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
  ) : designs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No designs found in this category.</p>
            <Link 
              href="/upload" 
              className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 font-medium"
            >
              Upload Your First Design
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5 xl:gap-6">
            {designs.map((design) => (
              <div key={design.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group transition-transform duration-200 ease-out hover:-translate-y-0.5">
                <Link href={`/designs/${design.id}`}>
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                    <SafeImage
                      src={design.thumbnailUrl || design.imageUrl}
                      alt={design.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Premium Badge */}
                    {design.mediaFiles?.some(file => file.accessType === 'PREMIUM') && (
                      <div className="absolute top-2 left-2">
                        <div className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-medium rounded-full shadow-sm">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" aria-label="Add to favorites">
                        <Heart className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </Link>
                
                <div className="p-3 sm:p-4">
                  <Link href={`/designs/${design.id}`}>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-indigo-700">
                      {design.title}
                    </h3>
                  </Link>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    by {design.designer.name || 'Anonymous'}
                  </p>
                  
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
                        className="p-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
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
                    className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs xs:text-sm md:px-4 md:py-2 md:text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                  
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded font-medium">
                      {design.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
export default function DesignsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" /> }>
      <DesignsPageInner />
    </Suspense>
  )
}