'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'

interface BoutiqueProduct {
  id: string
  slug?: string
  title: string
  basePrice: number
  imageUrl: string
  category?: {
    name: string
  }
  seller?: {
    name: string
    displayName: string | null
  }
  _count?: {
    reviews: number
  }
  averageRating?: number
}

export function FeaturedBoutiqueProducts() {
  const [products, setProducts] = useState<BoutiqueProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedProducts()
  }, [])

  const fetchFeaturedProducts = async () => {
    try {
      // Fetch from admin featured items API for boutique products only
      const response = await fetch('/api/admin/featured-items?itemType=BOUTIQUE_PRODUCT&limit=6')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.items?.slice(0, 6) || [])
      } else {
        // Fallback to regular boutique products if no featured available
        const fallbackResponse = await fetch('/api/boutique/products?status=LIVE&limit=6')
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          setProducts(data.products?.slice(0, 6) || [])
        }
      }
    } catch (error) {
      console.error('Error fetching featured products:', error)
      // Fallback to regular live products
      try {
        const response = await fetch('/api/boutique/products?status=LIVE&limit=6')
        if (response.ok) {
          const data = await response.json()
          setProducts(data.products?.slice(0, 6) || [])
        }
      } catch (err) {
        console.error('Error fetching fallback products:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-5 sm:py-8 lg:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 text-center mb-1 sm:mb-2">Featured Boutique</h2>
          <p className="text-[9px] sm:text-xs text-gray-700 text-center mb-3 sm:mb-4 lg:mb-6">Discover curated physical products from our sellers</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-gray-50 rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-2 sm:p-3">
                  <div className="h-3 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded mb-1.5 w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return (
      <section className="py-5 sm:py-8 lg:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 text-center mb-1 sm:mb-2">Featured Boutique</h2>
          <p className="text-[9px] sm:text-xs text-gray-700 text-center mb-3 sm:mb-4 lg:mb-6">Discover curated physical products from our sellers</p>
          <div className="text-center py-4 sm:py-6">
            <div className="text-gray-500 mb-2">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-[9px] sm:text-xs font-medium text-gray-900 mb-0.5">No featured products yet</h3>
            <p className="text-[8px] sm:text-[9px] text-gray-600 mb-2 sm:mb-3">Check back soon for curated boutique items!</p>
            <Link href="/shop/physical" className="inline-block bg-indigo-700 hover:bg-indigo-800 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors font-medium text-[8px] sm:text-xs">
              Browse Boutique
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-5 sm:py-8 lg:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 text-center mb-1 sm:mb-2">Featured Boutique</h2>
        <p className="text-[9px] sm:text-xs text-gray-700 text-center mb-3 sm:mb-4 lg:mb-6">Discover curated physical products from our sellers</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {products.map((product) => (
            <Link key={product.id} href={`/boutique/${product.slug || product.id}`} className="bg-white rounded-lg shadow-md overflow-hidden group hover:shadow-lg transition-shadow border border-gray-100">
              <div className="aspect-square relative overflow-hidden bg-gray-100">
                {product.imageUrl && product.imageUrl.trim() ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-1.5 sm:p-2.5">
                <h3 className="text-[9px] sm:text-xs font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                  {product.title}
                </h3>
                <p className="text-[8px] sm:text-[9px] text-gray-500 mt-0.5 sm:mt-1">
                  {product.category?.name || 'Product'}
                </p>
                
                {/* Rating */}
                {product.averageRating && product.averageRating > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${
                            i < Math.round(product.averageRating!) 
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[7px] sm:text-[8px] text-gray-500">
                      ({product._count?.reviews || 0})
                    </span>
                  </div>
                )}

                <p className="text-[9px] sm:text-xs font-bold text-indigo-600 mt-1 sm:mt-1.5">
                  ${typeof product.basePrice === 'number' ? product.basePrice.toFixed(2) : '0.00'}
                </p>
                
                {product.seller && (
                  <p className="text-[7px] sm:text-[8px] text-gray-500 mt-0.5 sm:mt-1 truncate">
                    {product.seller.displayName || product.seller.name}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-4 sm:mt-6">
          <Link href="/shop/physical" className="inline-block text-indigo-600 hover:text-indigo-700 font-medium text-[9px] sm:text-sm">
            Browse all boutique products →
          </Link>
        </div>
      </div>
    </section>
  )
}
