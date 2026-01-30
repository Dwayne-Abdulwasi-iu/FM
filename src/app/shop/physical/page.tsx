'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, Star, Heart, Filter, Grid, List, ChevronDown } from 'lucide-react'

interface Product {
  id: string
  title: string
  basePrice: number
  thumbnailUrl: string | null
  imageUrl: string
  category: {
    name: string
  }
  seller: {
    name: string
    displayName: string | null
    isVerified: boolean
  }
  _count: {
    reviews: number
    favorites: number
  }
  averageRating: number
}

export default function ShopPhysicalPage() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [filterCategory, setFilterCategory] = useState('all')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 })
  const [categories, setCategories] = useState<string[]>([])

  // Mock data for demonstration
  const mockProducts: Product[] = [
    {
      id: '1',
      title: 'Handmade Leather Tote Bag',
      basePrice: 85.00,
      thumbnailUrl: 'https://images.unsplash.com/photo-1584917865886-f3971c772206?w=300',
      imageUrl: 'https://images.unsplash.com/photo-1584917865886-f3971c772206?w=500',
      category: { name: 'Bags' },
      seller: { name: 'Creative Artisan', displayName: 'Creative Artisan', isVerified: true },
      _count: { reviews: 12, favorites: 8 },
      averageRating: 4.8,
    },
    {
      id: '2',
      title: 'Vintage Denim Jacket',
      basePrice: 120.00,
      thumbnailUrl: 'https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=300',
      imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500',
      category: { name: 'Clothing' },
      seller: { name: 'Style Maven', displayName: 'Style Maven', isVerified: true },
      _count: { reviews: 24, favorites: 15 },
      averageRating: 4.9,
    },
    {
      id: '3',
      title: 'Silk Scarves Collection',
      basePrice: 45.00,
      thumbnailUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300',
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500',
      category: { name: 'Accessories' },
      seller: { name: 'Fashion Forward', displayName: 'Fashion Forward', isVerified: false },
      _count: { reviews: 8, favorites: 12 },
      averageRating: 4.6,
    },
  ]

  useEffect(() => {
    setProducts(mockProducts)
    setCategories(['Bags', 'Clothing', 'Accessories', 'Shoes', 'Jewelry'])
    setLoading(false)
  }, [])

  const filteredProducts = products.filter(p => {
    const categoryMatch = filterCategory === 'all' || p.category.name === filterCategory
    const priceMatch = p.basePrice >= priceRange.min && p.basePrice <= priceRange.max
    return categoryMatch && priceMatch
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.basePrice - b.basePrice
      case 'price-high': return b.basePrice - a.basePrice
      case 'popular': return b._count.favorites - a._count.favorites
      case 'rating': return b.averageRating - a.averageRating
      default: return 0
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Shop Boutique</h1>
          <p className="text-lg sm:text-xl text-purple-100 max-w-2xl">
            Discover unique, handmade fashion items from talented designers. Support independent creators and find one-of-a-kind pieces.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="text-sm text-gray-600">
              Showing {sortedProducts.length} products
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
              </select>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-black bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1000"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Max: ${priceRange.max}</span>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {loading ? (
          <div className="text-center py-12">Loading products...</div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products found matching your filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {sortedProducts.map(product => (
              <Link
                key={product.id}
                href={`/boutique/${product.id}`}
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
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm hover:shadow-md transition opacity-0 group-hover:opacity-100"
                  >
                    <Heart className="w-5 h-5 text-red-500" />
                  </button>
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="font-medium text-gray-900 truncate text-xs sm:text-sm">{product.title}</h3>
                  <p className="text-xs text-gray-600 mt-1">{product.category.name}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < Math.floor(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                    <span className="text-xs text-gray-600 ml-1">({product._count.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 sm:mt-4">
                    <span className="font-bold text-indigo-600 text-sm sm:text-base">${product.basePrice.toFixed(2)}</span>
                    <span className="text-xs text-gray-600">{product.seller.displayName || product.seller.name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sortedProducts.map(product => (
              <Link
                key={product.id}
                href={`/boutique/${product.id}`}
                className="flex gap-3 sm:gap-4 bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition"
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 relative flex-shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src={product.thumbnailUrl || product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{product.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{product.category.name} · By {product.seller.displayName || product.seller.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < Math.floor(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600">({product._count.reviews} reviews)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-indigo-600">${product.basePrice.toFixed(2)}</span>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <Heart className="w-5 h-5 text-gray-400" />
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
