'use client'

import { useState, useEffect, Suspense } from 'react'
import SafeImage from '@/components/ui/safe-image'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, ShoppingCart, Star, Eye, Crown, Search, ArrowLeft } from 'lucide-react'
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

interface SearchResults {
  designs: Design[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  searchTerm: string
  resultsCount: number
}

function SearchPageInner() {
  const searchParams = useSearchParams()
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  const query = searchParams?.get('q') || ''
  const page = parseInt(searchParams?.get('page') || '1')

  const categories = [
    'all',
    'Fashion Illustrations',
    'Digital Designs',
    'Pattern Designs',
    'Sketches',
    'Technical Drawings',
    'Concept Art'
  ]

  useEffect(() => {
    if (query) {
      performSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, selectedCategory])

  const performSearch = async () => {
    try {
      setLoading(true)
      const searchUrl = new URLSearchParams({
        q: query || '',
        page: page.toString(),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      })

      const response = await fetch(`/api/search?${searchUrl}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      }
    } catch (error) {
      console.error('Search failed:', error)
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

  // Image sanitization handled by SafeImage

  if (!query) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Designs</h1>
          <p className="text-gray-600">Enter a search term to find fashion designs</p>
          <Link 
            href="/designs" 
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 font-medium"
          >
            Browse All Designs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          href="/designs"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Designs
        </Link>

        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Results
          </h1>
          {searchResults && (
            <p className="text-gray-700">
              {searchResults.resultsCount} result{searchResults.resultsCount !== 1 ? 's' : ''} found for &quot;{searchResults.searchTerm}&quot;
              {searchResults.pagination.total > searchResults.resultsCount && (
                <span> ({searchResults.pagination.total} total)</span>
              )}
            </p>
          )}
        </div>

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

        {/* Search Results */}
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
        ) : searchResults?.designs.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No results found</h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your search terms or browse all designs
            </p>
            <Link 
              href="/designs" 
              className="inline-flex items-center px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 font-medium"
            >
              Browse All Designs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-5 xl:gap-6">
            {searchResults?.designs.map((design) => (
              <div key={design.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group transition-transform duration-200 ease-out hover:-translate-y-0.5">
                <Link href={`/designs/${design.id}`}>
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                    <SafeImage
                      src={design.thumbnailUrl || design.imageUrl}
                      alt={design.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                
                <div className="p-4">
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
                      
                      <button className="p-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition-colors" aria-label="Add to cart">
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* View Details Button */}
                  <Link 
                    href={`/designs/${design.id}`}
                    className="w-full inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
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

        {/* Pagination */}
        {searchResults && searchResults.pagination.pages > 1 && (
          <div className="mt-12 flex justify-center">
            <div className="flex space-x-2">
              {Array.from({ length: searchResults.pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                <Link
                  key={pageNum}
                  href={`/search?q=${encodeURIComponent(query)}&page=${pageNum}${selectedCategory !== 'all' ? `&category=${encodeURIComponent(selectedCategory)}` : ''}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === searchResults.pagination.page
                      ? 'bg-indigo-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {pageNum}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" /> }>
      <SearchPageInner />
    </Suspense>
  )
}