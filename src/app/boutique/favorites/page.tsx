'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Trash2, ShoppingCart, Star, ChevronLeft, ChevronRight, Package } from 'lucide-react'

interface Favorite {
  id: string
  createdAt: string
  product: {
    id: string
    title: string
    slug: string
    basePrice: number
    salePrice: number | null
    thumbnailUrl: string | null
    status: string
    avgRating: number | null
    seller: {
      id: string
      name: string
    }
  }
}

export default function BoutiqueFavoritesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin?callbackUrl=/boutique/favorites')
      return
    }
    fetchFavorites()
  }, [session, status, page])

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/boutique/favorites?page=${page}&limit=12`)
      if (res.ok) {
        const data = await res.json()
        setFavorites(data.favorites || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (productId: string) => {
    setRemovingId(productId)
    try {
      const res = await fetch(`/api/boutique/favorites?productId=${productId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setFavorites(favorites.filter(f => f.product.id !== productId))
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error)
    } finally {
      setRemovingId(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount).replace(/[\n\r\t\s]+/g, '')
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/boutique" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Boutique
          </Link>
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-purple-600 fill-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
              <p className="text-gray-600">{favorites.length} saved items</p>
            </div>
          </div>
        </div>

        {/* Favorites Grid */}
        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-500 mb-6">
              Start exploring and save items you love!
            </p>
            <Link
              href="/boutique"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
            >
              <Package className="w-5 h-5" />
              Browse Boutique
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-lg transition"
                >
                  {/* Product Image */}
                  <Link href={`/boutique/${favorite.product.slug}`}>
                    <div className="relative aspect-[3/4] bg-gray-100">
                      <Image
                        src={favorite.product.thumbnailUrl || '/images/placeholder.png'}
                        alt={favorite.product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                      {favorite.product.salePrice && (
                        <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          SALE
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
                    <Link href={`/boutique/${favorite.product.slug}`}>
                      <h3 className="font-medium text-gray-900 mb-1 truncate hover:text-purple-600">
                        {favorite.product.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 mb-2">
                      by {favorite.product.seller.name}
                    </p>

                    {/* Rating */}
                    {favorite.product.avgRating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-gray-600">
                          {favorite.product.avgRating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {favorite.product.salePrice ? (
                          <>
                            <span className="text-lg font-bold text-purple-600">
                              {formatCurrency(favorite.product.salePrice)}
                            </span>
                            <span className="text-sm text-gray-400 line-through ml-2">
                              {formatCurrency(favorite.product.basePrice)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(favorite.product.basePrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/boutique/${favorite.product.slug}`}
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium text-center hover:bg-purple-700 transition flex items-center justify-center gap-1"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        View
                      </Link>
                      <button
                        onClick={() => removeFavorite(favorite.product.id)}
                        disabled={removingId === favorite.product.id}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition disabled:opacity-50"
                        title="Remove from favorites"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
