'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCurrency } from '@/components/CurrencyProvider'
import {
  Star,
  Trash2,
  Image as ImageIcon,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Lock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface FeaturedItem {
  id: string
  itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT'
  itemId: string
  title: string
  imageUrl?: string
  price: number
  totalSales?: number
  position: number
  addedAt: string
}

export default function SellerFeaturedItemsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { formatPrice } = useCurrency()

  const [designs, setDesigns] = useState<FeaturedItem[]>([])
  const [products, setProducts] = useState<FeaturedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [maxFeatured, setMaxFeatured] = useState(0)
  const [remainingSlots, setRemainingSlots] = useState(0)
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingPositionId, setUpdatingPositionId] = useState<string | null>(null)
  const [editingPositions, setEditingPositions] = useState<Record<string, number>>({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchFeaturedItems()
    }
  }, [status, router])

  const fetchFeaturedItems = async () => {
    try {
      setLoading(true)
      let designsData = null
      let productsData = null
      let hasError = false

      // Get featured designs
      const designRes = await fetch('/api/seller/featured-designs')
      if (designRes.ok) {
        const json = await designRes.json()
        if (json.items && Array.isArray(json.items)) {
          designsData = json
          setDesigns(json.items)
          setMaxFeatured(json.maxFeatured || 0)
          setSubscriptionTier(json.subscriptionTier || null)
        }
      } else {
        toast.error('Failed to load featured designs')
        hasError = true
      }

      // Get featured boutique products
      const productRes = await fetch('/api/seller/featured-boutique-products')
      if (productRes.ok) {
        const json = await productRes.json()
        if (json.items && Array.isArray(json.items)) {
          productsData = json
          setProducts(json.items)
        }
      } else {
        toast.error('Failed to load featured products')
        hasError = true
      }

      // Calculate total remaining slots only if we have both data
      if (designsData && designsData.maxFeatured !== undefined && productsData && Array.isArray(productsData.items)) {
        const designCount = designsData.currentFeaturedCount ?? designsData.items?.length ?? 0
        const productCount = productsData.currentFeaturedCount ?? productsData.items?.length ?? 0
        const totalCurrently = designCount + productCount
        const maxAllowed = designsData.maxFeatured ?? 0
        setRemainingSlots(Math.max(0, maxAllowed - totalCurrently))
      }
    } catch (error) {
      console.error('Error fetching featured items:', error)
      toast.error('Failed to load featured items')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id: string, itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT') => {
    if (!window.confirm('Remove from featured?')) return

    try {
      setDeletingId(id)
      const endpoint = itemType === 'DESIGN' ? '/api/seller/featured-designs' : '/api/seller/featured-boutique-products'
      const res = await fetch(`${endpoint}?id=${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to remove')

      toast.success('Item removed from featured')
      fetchFeaturedItems()
    } catch (error) {
      console.error('Error removing item:', error)
      toast.error('Failed to remove item')
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpdatePosition = async (id: string, itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT', newPosition: number) => {
    // Validate position
    if (newPosition < 1 || !Number.isInteger(newPosition)) {
      toast.error('Position must be a positive number')
      return
    }

    if (newPosition > maxFeatured) {
      toast.error(`Position cannot exceed ${maxFeatured}`)
      return
    }
    
    try {
      setUpdatingPositionId(id)
      const endpoint = itemType === 'DESIGN' ? '/api/seller/featured-designs' : '/api/seller/featured-boutique-products'
      const res = await fetch(`${endpoint}?id=${id}&position=${newPosition}`, {
        method: 'PATCH'
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to update position')
      }

      toast.success('Position updated')
      setEditingPositions(prev => {
        const newEditing = { ...prev }
        delete newEditing[id]
        return newEditing
      })
      fetchFeaturedItems()
    } catch (error) {
      console.error('Error updating position:', error)
      const message = error instanceof Error ? error.message : 'Failed to update position'
      toast.error(message)
    } finally {
      setUpdatingPositionId(null)
    }
  }

  const getTierInfo = () => {
    switch (subscriptionTier) {
      case 'STARTER':
        return { name: 'Starter', color: 'bg-blue-100 text-blue-900', max: 2 }
      case 'PRO':
        return { name: 'Pro', color: 'bg-purple-100 text-purple-900', max: 6 }
      case 'VIP':
        return { name: 'VIP', color: 'bg-amber-100 text-amber-900', max: 10 }
      default:
        return { name: 'Free', color: 'bg-gray-100 text-gray-900', max: 0 }
    }
  }

  const tierInfo = getTierInfo()
  const totalFeatured = designs.length + products.length
  const canAddMore = totalFeatured < maxFeatured

  if (status === 'loading') return <div className="p-4 sm:p-8 text-center"><div className="inline-block">Loading...</div></div>
  if (status === 'unauthenticated') return null

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-1 sm:gap-2">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-500" />
                Featured Items
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Manage your featured designs and products</p>
            </div>
            <div className={`rounded-lg p-2.5 sm:p-3 md:p-4 whitespace-nowrap ${tierInfo.color}`}>
              <div className="text-xs sm:text-sm font-medium">Your Plan: {tierInfo.name}</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold">{totalFeatured}/{maxFeatured}</div>
              <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">Featured Items</div>
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        {maxFeatured === 0 && (
          <div className="mb-3 sm:mb-6 bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-4 flex items-start gap-2 sm:gap-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-medium text-blue-900">No Featured Items Available</h3>
              <p className="text-xs sm:text-sm text-blue-800 mt-1">
                Your current plan doesn't include featured items. Upgrade to Pro or VIP to feature up to 10 items on your storefront.
              </p>
              <button
                onClick={() => router.push('/seller/upgrade')}
                className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                View upgrade plans →
              </button>
            </div>
          </div>
        )}

        {/* Featured Designs */}
        <div className="bg-white rounded-lg shadow mb-3 sm:mb-6">
          <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2">
                <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                Featured Designs
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">{designs.length} designs featured</p>
            </div>
          </div>

          {designs.length === 0 ? (
            <div className="p-4 sm:p-8 md:p-12 text-center">
              <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 mx-auto mb-2 sm:mb-4 opacity-20" />
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">No Featured Designs Yet</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-6">Start featuring your designs to boost visibility on your storefront</p>
              {canAddMore && (
                <button
                  onClick={() => router.push('/seller/designs/featured')}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-purple-700 transition"
                >
                  Manage Featured Designs →
                </button>
              )}
              {!canAddMore && (
                <button
                  onClick={() => router.push('/seller/upgrade')}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-2 bg-gray-400 text-white rounded-lg text-xs sm:text-sm font-medium cursor-not-allowed opacity-60"
                  disabled
                >
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Upgrade to Feature
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {designs.map((design) => (
                <div key={design.id} className="p-2 sm:p-3 md:p-4 hover:bg-gray-50 flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Position Badge */}
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-xs sm:text-sm flex-shrink-0">
                      {design.position}
                    </div>
                    {design.imageUrl ? (
                      <img
                        src={design.imageUrl}
                        alt={design.title}
                        className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{design.title}</div>
                      <div className="text-xs text-gray-600">
                        {formatPrice(typeof design.price === 'number' ? design.price : 0)} • {typeof design.totalSales === 'number' ? design.totalSales : 0} sales
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    {editingPositions[design.id] !== undefined ? (
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <input
                          type="number"
                          min="1"
                          max={maxFeatured}
                          placeholder="Pos"
                          aria-label="Edit position"
                          value={editingPositions[design.id]}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            if (!isNaN(val)) {
                              setEditingPositions(prev => ({ ...prev, [design.id]: val }))
                            }
                          }}
                          className="w-10 px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                        />
                        <button
                          onClick={() => handleUpdatePosition(design.id, 'DESIGN', editingPositions[design.id])}
                          disabled={updatingPositionId === design.id}
                          className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPositions(prev => { const newEditing = { ...prev }; delete newEditing[design.id]; return newEditing })}
                          className="px-1.5 py-0.5 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingPositions(prev => ({ ...prev, [design.id]: design.position }))}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600 text-xs"
                          title="Edit position"
                        >
                          Reorder
                        </button>
                        <button
                          onClick={() => handleRemove(design.id, 'DESIGN')}
                          disabled={deletingId === design.id}
                          title="Remove from featured"
                          aria-label="Remove from featured"
                          className="p-1 hover:bg-red-50 rounded text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Featured Boutique Products */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-1.5 sm:gap-2">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                Featured Products
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">{products.length} products featured</p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="p-4 sm:p-8 md:p-12 text-center">
              <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 mx-auto mb-2 sm:mb-4 opacity-20" />
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">No Featured Products Yet</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-6">Start featuring your products to increase sales and visibility</p>
              {canAddMore && (
                <button
                  onClick={() => router.push('/seller/boutique/featured')}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 transition"
                >
                  Manage Featured Products →
                </button>
              )}
              {!canAddMore && (
                <button
                  onClick={() => router.push('/seller/upgrade')}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-6 py-1.5 sm:py-2 bg-gray-400 text-white rounded-lg text-xs sm:text-sm font-medium cursor-not-allowed opacity-60"
                  disabled
                >
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Upgrade to Feature
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {products.map((product) => (
                <div key={product.id} className="p-2 sm:p-3 md:p-4 hover:bg-gray-50 flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Position Badge */}
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-xs sm:text-sm flex-shrink-0">
                      {product.position}
                    </div>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{product.title}</div>
                      <div className="text-xs text-gray-600 flex items-center gap-0.5">
                        <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {(typeof product.price === 'number' ? product.price : 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    {editingPositions[product.id] !== undefined ? (
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <input
                          type="number"
                          min="1"
                          max={maxFeatured}
                          placeholder="Pos"
                          aria-label="Edit position"
                          value={editingPositions[product.id]}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            if (!isNaN(val)) {
                              setEditingPositions(prev => ({ ...prev, [product.id]: val }))
                            }
                          }}
                          className="w-10 px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                        />
                        <button
                          onClick={() => handleUpdatePosition(product.id, 'BOUTIQUE_PRODUCT', editingPositions[product.id])}
                          disabled={updatingPositionId === product.id}
                          className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPositions(prev => { const newEditing = { ...prev }; delete newEditing[product.id]; return newEditing })}
                          className="px-1.5 py-0.5 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingPositions(prev => ({ ...prev, [product.id]: product.position }))}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600 text-xs"
                          title="Edit position"
                        >
                          Reorder
                        </button>
                        <button
                          onClick={() => handleRemove(product.id, 'BOUTIQUE_PRODUCT')}
                          disabled={deletingId === product.id}
                          title="Remove from featured"
                          aria-label="Remove from featured"
                          className="p-1 hover:bg-red-50 rounded text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tier Comparison */}
        {maxFeatured > 0 && (
          <div className="mt-4 sm:mt-6 md:mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 sm:p-4 md:p-6 border border-purple-200">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2.5 sm:mb-4">Featured Items Limit by Plan</h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              <div className="bg-white rounded p-2 sm:p-3">
                <div className="text-xs sm:text-sm font-medium text-gray-700">Starter</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">0</div>
                <div className="text-xs text-gray-600 mt-0.5 sm:mt-1">items</div>
              </div>
              <div className="bg-white rounded p-2 sm:p-3 border-2 border-purple-600">
                <div className="text-xs sm:text-sm font-medium text-gray-700">Pro</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 mt-0.5 sm:mt-1">6</div>
                <div className="text-xs text-gray-600 mt-0.5 sm:mt-1">items</div>
              </div>
              <div className="bg-white rounded p-2 sm:p-3">
                <div className="text-xs sm:text-sm font-medium text-gray-700">VIP</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600 mt-0.5 sm:mt-1">10</div>
                <div className="text-xs text-gray-600 mt-0.5 sm:mt-1">items</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

