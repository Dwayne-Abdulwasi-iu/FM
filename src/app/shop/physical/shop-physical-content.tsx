'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, Star, Heart, Filter, Grid, List, ChevronDown } from 'lucide-react'
import { convertFromUSD, formatNGNPrice } from '@/lib/currency'

interface Product {
  id: string
  title: string
  slug?: string | null
  basePrice: number
  thumbnailUrl: string | null
  imageUrl: string
  category?: {
    name: string
  } | null
  seller?: {
    name: string
    displayName: string | null
    isVerified: boolean
  } | null
  _count?: {
    reviews: number
    favorites: number
  }
  averageRating?: number | null
}

export default function ShopPhysicalContent() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [filterCategory, setFilterCategory] = useState('all')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 })
  const [maxPrice, setMaxPrice] = useState(1000)
  const [categories, setCategories] = useState<string[]>([])
  const [preferredCurrency, setPreferredCurrency] = useState('USD')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1, NGN: 1372, EUR: 0.92, GBP: 0.79 })

  useEffect(() => {
    fetchCurrencySettings()
    fetchProducts()
  }, [])

  const fetchCurrencySettings = async () => {
    try {
      const [prefsRes, ratesRes] = await Promise.all([
        fetch('/api/preferences'),
        fetch('/api/currency/rates')
      ])

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json()
        setPreferredCurrency(prefsData.currency || 'USD')
      }

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json()
        setExchangeRates(ratesData.rates)
      }
    } catch (err) {
      console.error('Failed to fetch currency settings:', err)
    }
  }

  // Boutique prices are stored in NGN — use formatNGNPrice instead
  // Legacy formatPrice kept for non-boutique items if needed in future
  const _formatPrice = (priceUSD: number) => {
    let convertedAmount = priceUSD
    
    if (preferredCurrency !== 'USD' && exchangeRates[preferredCurrency]) {
      convertedAmount = convertFromUSD(priceUSD, preferredCurrency, exchangeRates)
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: preferredCurrency
    }).format(convertedAmount)
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/boutique/products?status=LIVE&limit=100')
      if (!response.ok) {
        throw new Error('Failed to load boutique products')
      }
      const data = await response.json()
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products)
        // Calculate max price from products
        const prices = data.products.map((p: any) => p.basePrice || 0)
        const calculatedMax = Math.max(...prices, 1000)
        setMaxPrice(Math.round(calculatedMax))
        setPriceRange({ min: 0, max: calculatedMax })
        
        // Extract unique categories
        const uniqueCats = [...new Set(data.products.map((p: any) => p.category?.name).filter(Boolean))]
        setCategories(uniqueCats as string[])
      } else {
        setProducts([])
        setCategories([])
        setMaxPrice(1000)
        setPriceRange({ min: 0, max: 1000 })
      }
    } catch (err) {
      console.error('Error fetching boutique products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load products')
      setProducts([])
      setCategories([])
      setMaxPrice(1000)
      setPriceRange({ min: 0, max: 1000 })
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    const categoryMatch = filterCategory === 'all' || p.category?.name === filterCategory
    const priceMatch = p.basePrice >= priceRange.min && p.basePrice <= priceRange.max
    return categoryMatch && priceMatch
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.basePrice - b.basePrice
      case 'price-high': return b.basePrice - a.basePrice
      case 'popular': return (b._count?.favorites ?? 0) - (a._count?.favorites ?? 0)
      case 'rating': return (b.averageRating ?? 0) - (a.averageRating ?? 0)
      default: return 0
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1.5 sm:mb-2">Shop Boutique</h1>
          <p className="text-xs sm:text-sm text-purple-100 max-w-2xl line-clamp-2">
            Discover unique, handmade fashion items from talented designers. Support independent creators and find one-of-a-kind pieces.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-2.5 sm:p-4 mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2.5">
            <div className="text-xs text-gray-600">
              Showing {sortedProducts.length} items
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs text-black bg-white"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price ↑</option>
                <option value="price-high">Price ↓</option>
                <option value="popular">Popular</option>
                <option value="rating">Rating</option>
              </select>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="Grid view"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="List view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] sm:text-xs text-black bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max={maxPrice}
                value={priceRange.max}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value, 10);
                  if (!isNaN(newMax)) {
                    setPriceRange({ ...priceRange, max: newMax });
                  }
                }}
                className="flex-1"
              />
              <span className="text-[11px] sm:text-xs text-gray-600 whitespace-nowrap">Max: ${priceRange.max}</span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3 text-red-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Products Grid/List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-500 mt-2 text-xs">Loading products...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg">
            <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-xs">{products.length === 0 ? 'No products available' : 'No products found'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {sortedProducts.map(product => (
              <Link
                key={product.id}
                href={`/boutique/${product.slug || product.id}`}
                className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition"
              >
                <div className="aspect-square relative overflow-hidden bg-gray-200">
                  <Image
                    src={product.thumbnailUrl || product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="absolute top-1 right-1 p-1.5 bg-white rounded-full shadow-sm hover:shadow-md transition opacity-0 group-hover:opacity-100"
                    title="Add to wishlist"
                  >
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
                  <div className="p-1.5 sm:p-2.5">
                  <h3 className="font-medium text-gray-900 truncate text-[10px] sm:text-xs">{product.title}</h3>
                  <p className="text-[9px] text-gray-600 mt-0.5 truncate">{product.category?.name ?? 'Uncategorized'}</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-2.5 h-2.5 ${i < Math.round(product.averageRating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                    <span className="text-[8px] text-gray-600 ml-0.5">({product._count?.reviews ?? 0})</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 sm:mt-2">
                    <span className="font-bold text-indigo-600 text-[10px] sm:text-xs">{formatNGNPrice(product.basePrice)}</span>
                    <span className="text-[8px] text-gray-600 truncate ml-1">{(product.seller?.displayName || product.seller?.name || 'Unknown').slice(0, 8)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-2.5">
            {sortedProducts.map(product => (
              <Link
                key={product.id}
                href={`/boutique/${product.slug || product.id}`}
                className="flex gap-2 sm:gap-3 bg-white rounded-lg shadow-sm p-2.5 sm:p-3 hover:shadow-md transition"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex-shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src={product.thumbnailUrl || product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[11px] sm:text-sm line-clamp-1">{product.title}</h3>
                    <p className="text-[9px] sm:text-xs text-gray-600 mt-0.5 line-clamp-1">{product.category?.name ?? 'Uncategorized'} · {(product.seller?.displayName || product.seller?.name || 'Unknown').slice(0, 12)}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2.5 h-2.5 ${i < Math.round(product.averageRating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[8px] text-gray-600">({product._count?.reviews ?? 0})</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm sm:text-base text-indigo-600">{formatNGNPrice(product.basePrice)}</span>
                    <button className="p-1 hover:bg-gray-100 rounded-lg transition" title="Add to wishlist">
                      <Heart className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


