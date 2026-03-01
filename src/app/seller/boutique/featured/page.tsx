'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useCurrency } from '@/components/CurrencyProvider'
import { SubscriptionRequiredModal } from '@/components/SubscriptionRequiredModal'
import { FeaturedItemsConfirmationModal } from '@/components/FeaturedItemsConfirmationModal'
import { 
  ArrowLeft,
  Search,
  Filter,
  Trash2,
  Star,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  GripVertical,
  Copy,
  Plus
} from 'lucide-react'

interface BoutiqueProduct {
  id: string
  title: string
  thumbnailUrl: string | null
  basePrice: number
  salePrice: number | null
  status: string
  currentStock: number
  totalSales: number
  totalRevenue: number
  createdAt: string
  seller: {
    name: string
  }
  _count?: {
    reviews: number
  }
  avgRating?: number
  featured?: boolean
  addedByAdmin?: boolean
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function SellerBoutiqueFeaturedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [products, setProducts] = useState<BoutiqueProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null)
  const [subscriptionModal, setSubscriptionModal] = useState<{
    isOpen: boolean
    currentTier?: string
    current?: number
    max?: number
    errorCode?: 'NO_FEATURED_ACCESS' | 'TIER_LIMIT_REACHED'
  }>({ isOpen: false })
  const [featuredConfirmation, setFeaturedConfirmation] = useState<{
    isOpen: boolean
    productId: string | null
    productTitle: string | null
    subscriptionTier: string | null
    maxFeatured: number
    currentFeatured: number
    remainingSlots: number
  }>({
    isOpen: false,
    productId: null,
    productTitle: null,
    subscriptionTier: null,
    maxFeatured: 0,
    currentFeatured: 0,
    remainingSlots: 0
  })
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [topProducts, setTopProducts] = useState<BoutiqueProduct[]>([])
  const [featuredAnalytics, setFeaturedAnalytics] = useState<{
    featuredTotal: number
    nonFeaturedTotal: number
    featuredPercentage: number
  }>({ featuredTotal: 0, nonFeaturedTotal: 0, featuredPercentage: 0 })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/boutique/seller/products')
      if (!response.ok) throw new Error('Failed to fetch products')
      
      const data = await response.json()
      if (!data.products) throw new Error('Invalid response format')
      
      // Separate LIVE featured and non-featured
      const allLive = (data.products as BoutiqueProduct[]).filter(p => p.status === 'LIVE')
      const featured = allLive.filter(p => p.featured)
      const nonFeatured = allLive.filter(p => !p.featured)
      
      // Calculate featured analytics
      const featuredRevenue = featured.reduce((sum, p) => sum + (p.totalRevenue || 0), 0)
      const nonFeaturedRevenue = nonFeatured.reduce((sum, p) => sum + (p.totalRevenue || 0), 0)
      const totalRevenue = featuredRevenue + nonFeaturedRevenue
      
      setFeaturedAnalytics({
        featuredTotal: Math.round((featuredRevenue / (totalRevenue || 1)) * 100),
        nonFeaturedTotal: Math.round((nonFeaturedRevenue / (totalRevenue || 1)) * 100),
        featuredPercentage: featured.length > 0 ? Math.round((featuredRevenue / featured.length) / (nonFeaturedRevenue / Math.max(nonFeatured.length, 1))) : 0
      })
      
      // Find top 3 selling products (non-featured)
      const topThree = nonFeatured
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 3)
      
      setTopProducts(topThree)
      
      let filtered = allLive
      
      if (showFeaturedOnly) {
        filtered = filtered.filter(p => p.featured)
      }
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        filtered = filtered.filter(p => 
          p.title.toLowerCase().includes(q)
        )
      }
      
      // Sort
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          case 'price-high':
            return (b.salePrice || b.basePrice) - (a.salePrice || a.basePrice)
          case 'price-low':
            return (a.salePrice || a.basePrice) - (b.salePrice || b.basePrice)
          case 'sales':
            return b.totalSales - a.totalSales
          default:
            return 0
        }
      })
      
      setProducts(filtered)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load products'
      toast.error(message)
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, sortBy, showFeaturedOnly])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleToggleFeatured = async (productId: string, productTitle: string) => {
    try {
      setTogglingFeatured(productId)
      const product = products.find(p => p.id === productId)
      
      if (product?.featured) {
        // Remove from featured
        const res = await fetch(`/api/seller/featured-boutique-products?productId=${productId}`, {
          method: 'DELETE'
        })
        
        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to remove from featured')
        }
        
        toast.success('Removed from featured')
        setProducts(products.map(p => 
          p.id === productId ? { ...p, featured: false } : p
        ))
      } else {
        // Add to featured - show confirmation
        const res = await fetch('/api/seller/featured-boutique-products')
        if (!res.ok) throw new Error('Failed to fetch featured info')
        
        const data = await res.json()
        setFeaturedConfirmation({
          isOpen: true,
          productId,
          productTitle,
          subscriptionTier: data.subscriptionTier,
          maxFeatured: data.maxFeatured,
          currentFeatured: data.currentFeatured,
          remainingSlots: data.remainingSlots
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update featured status'
      
      if (message.includes('TIER_LIMIT_REACHED')) {
        setSubscriptionModal({
          isOpen: true,
          errorCode: 'TIER_LIMIT_REACHED',
          current: (error as any)?.current,
          max: (error as any)?.max,
          currentTier: (error as any)?.currentTier
        })
      } else if (message.includes('NO_FEATURED_ACCESS')) {
        setSubscriptionModal({
          isOpen: true,
          errorCode: 'NO_FEATURED_ACCESS'
        })
      } else {
        toast.error(message)
      }
    } finally {
      setTogglingFeatured(null)
    }
  }

  const handleConfirmFeatured = async () => {
    const { productId } = featuredConfirmation
    if (!productId) return
    
    try {
      const res = await fetch('/api/seller/featured-boutique-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      
      if (!res.ok) {
        const error = await res.json()
        if (error.error?.includes('TIER_LIMIT_REACHED')) {
          setSubscriptionModal({
            isOpen: true,
            errorCode: 'TIER_LIMIT_REACHED',
            current: error.current,
            max: error.max,
            currentTier: error.currentTier
          })
        } else if (error.error?.includes('NO_FEATURED_ACCESS')) {
          setSubscriptionModal({
            isOpen: true,
            errorCode: 'NO_FEATURED_ACCESS'
          })
        } else {
          throw new Error(error.error || 'Failed to add to featured')
        }
      } else {
        toast.success('Product added to featured!')
        setProducts(products.map(p =>
          p.id === productId ? { ...p, featured: true } : p
        ))
        setFeaturedConfirmation({ isOpen: false, productId: null, productTitle: null, subscriptionTier: null, maxFeatured: 0, currentFeatured: 0, remainingSlots: 0 })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add to featured')
    }
  }

  const handleBulkToggleFeatured = async () => {
    const selectedArray = Array.from(selectedProducts)
    if (selectedArray.length === 0) return
    
    try {
      const featured = products.filter(p => selectedArray.includes(p.id) && p.featured)
      const notFeatured = products.filter(p => selectedArray.includes(p.id) && !p.featured)
      
      // Remove from featured
      for (const productId of featured.map(p => p.id)) {
        const res = await fetch(`/api/seller/featured-boutique-products?productId=${productId}`, {
          method: 'DELETE'
        })
        if (!res.ok) throw new Error('Failed to remove from featured')
      }
      
      // Add to featured
      for (const productId of notFeatured.map(p => p.id)) {
        const res = await fetch('/api/seller/featured-boutique-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        })
        if (!res.ok) throw new Error('Failed to add to featured')
      }
      
      toast.success(`Updated ${selectedArray.length} products`)
      setSelectedProducts(new Set())
      fetchProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update products')
    }
  }

  const handleDragStart = (productId: string) => {
    setDraggingId(productId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (dropProductId: string) => {
    if (!draggingId || draggingId === dropProductId) {
      setDraggingId(null)
      return
    }
    
    const draggedIndex = products.findIndex(p => p.id === draggingId)
    const targetIndex = products.findIndex(p => p.id === dropProductId)
    
    if (draggedIndex === -1 || targetIndex === -1) return
    
    // Reorder locally
    const newProducts = [...products]
    const [removed] = newProducts.splice(draggedIndex, 1)
    newProducts.splice(targetIndex, 0, removed)
    setProducts(newProducts)
    
    // Update position on backend
    try {
      const res = await fetch(`/api/seller/featured-boutique-products?id=${draggingId}&position=${targetIndex}`, {
        method: 'PATCH'
      })
      if (!res.ok) throw new Error('Failed to update position')
      toast.success('Product order updated')
    } catch (_error) {
      toast.error('Failed to save order')
      fetchProducts() // Revert
    }
    
    setDraggingId(null)
  }

  const addTopProductToFeatured = (productId: string) => {
    const product = topProducts.find(p => p.id === productId)
    if (!product) return
    
    setFeaturedConfirmation({
      isOpen: true,
      productId,
      productTitle: product.title,
      subscriptionTier: 'STANDARD',
      maxFeatured: 3,
      currentFeatured: products.filter(p => p.featured).length,
      remainingSlots: 3 - products.filter(p => p.featured).length
    })
  }

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const filteredProducts = showFeaturedOnly 
    ? products.filter(p => p.featured)
    : products

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/seller/boutique">
            <button className="p-2 hover:bg-white rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Featured Boutique Products</h1>
            <p className="text-gray-600 mt-1">Feature your best boutique products to increase visibility</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <Filter size={18} className="text-gray-400 mt-2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
                <option value="sales">Most Sales</option>
              </select>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showFeaturedOnly
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <Star size={18} className="inline mr-2" />
              {showFeaturedOnly ? 'Featured Only' : 'Show All'}
            </button>
          </div>
        </div>

        {/* Featured Analytics */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-600" />
              Featured Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="text-sm text-purple-700 font-medium mb-1">Featured Products Revenue</div>
                <div className="text-2xl font-bold text-purple-900">{featuredAnalytics.featuredTotal}%</div>
                <div className="text-xs text-purple-600 mt-2">of total revenue</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-700 font-medium mb-1">Non-Featured Products Revenue</div>
                <div className="text-2xl font-bold text-gray-900">{featuredAnalytics.nonFeaturedTotal}%</div>
                <div className="text-xs text-gray-600 mt-2">of total revenue</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="text-sm text-green-700 font-medium mb-1">Average Per Featured Product</div>
                <div className="text-2xl font-bold text-green-900">{featuredAnalytics.featuredPercentage}x</div>
                <div className="text-xs text-green-600 mt-2">vs non-featured</div>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Suggest Top Products */}
        {topProducts.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow-sm p-6 mb-8 border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              Your Top Selling Products
            </h2>
            <p className="text-sm text-gray-600 mb-4">These products are selling well. Feature them to boost visibility even further.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg p-4 border border-blue-100 hover:border-blue-300 transition-colors">
                  <div className="flex gap-3 mb-3">
                    {product.thumbnailUrl && (
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <Image
                          src={product.thumbnailUrl}
                          alt={product.title}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.title}</h3>
                      <div className="text-purple-600 font-bold text-sm mt-1">{product.totalSales} sales</div>
                    </div>
                  </div>
                  {!product.featured && (
                    <button
                      onClick={() => addTopProductToFeatured(product.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy size={14} />
                      Feature This
                    </button>
                  )}
                  {product.featured && (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <CheckCircle2 size={16} fill="currentColor" />
                      Already Featured
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {showFeaturedOnly ? 'No featured products yet' : 'No live products'}
            </h3>
            <p className="text-gray-600 mb-4">
              {showFeaturedOnly 
                ? 'Feature your best products to showcase them here.'
                : 'Make sure your products are approved and LIVE to feature them.'}
            </p>
            <Link href="/seller/boutique">
              <button className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                <Plus size={18} />
                Go to Boutique Products
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                draggable={product.featured}
                onDragStart={() => handleDragStart(product.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(product.id)}
                className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-move relative ${
                  draggingId === product.id ? 'opacity-50' : ''
                } ${
                  selectedProducts.has(product.id) ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                {/* Checkbox & Drag Handle */}
                <div className="absolute top-2 left-2 flex gap-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  {product.featured && (
                    <div className="bg-white/90 backdrop-blur p-1.5 rounded text-gray-600 hover:text-gray-900">
                      <GripVertical size={18} />
                    </div>
                  )}
                </div>

                {/* Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden group">
                  {product.thumbnailUrl && (
                    <Image
                      src={product.thumbnailUrl}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  {product.featured && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star size={14} fill="currentColor" />
                      Featured
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.title}</h3>
                  
                  {/* Price */}
                  <div className="text-lg font-bold text-purple-600 mb-3">
                    {formatPrice(product.salePrice || product.basePrice)}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-4 pb-4 border-b border-gray-100">
                    <div>
                      <div className="font-semibold text-gray-900">{product.totalSales || 0}</div>
                      <div>Sales</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{formatPrice(product.totalRevenue || 0)}</div>
                      <div>Revenue</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{product.avgRating?.toFixed(1) || 'N/A'}</div>
                      <div>Rating</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleToggleFeatured(product.id, product.title)}
                    disabled={togglingFeatured === product.id}
                    className={`w-full py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      product.featured
                        ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 disabled:bg-gray-100 disabled:text-gray-400'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50 disabled:text-gray-400'
                    }`}
                  >
                    <Star size={16} fill={product.featured ? 'currentColor' : 'none'} />
                    {togglingFeatured === product.id
                      ? 'Updating...'
                      : product.featured
                      ? 'Remove from Featured'
                      : 'Add to Featured'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedProducts.size > 0 && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 z-40 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">{selectedProducts.size} selected</span>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear
            </button>
            <button
              onClick={handleBulkToggleFeatured}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Star size={16} />
              Toggle Featured
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <SubscriptionRequiredModal
        isOpen={subscriptionModal.isOpen}
        onClose={() => setSubscriptionModal({ isOpen: false })}
        errorCode={subscriptionModal.errorCode}
        current={subscriptionModal.current}
        max={subscriptionModal.max}
        currentTier={subscriptionModal.currentTier}
        itemType="PRODUCT"
      />

      <FeaturedItemsConfirmationModal
        isOpen={featuredConfirmation.isOpen}
        onClose={() => setFeaturedConfirmation({ isOpen: false, productId: null, productTitle: null, subscriptionTier: null, maxFeatured: 0, currentFeatured: 0, remainingSlots: 0 })}
        onConfirm={handleConfirmFeatured}
        itemTitle={featuredConfirmation.productTitle || ''}
        itemType="PRODUCT"
        subscriptionTier={featuredConfirmation.subscriptionTier}
        maxFeatured={featuredConfirmation.maxFeatured}
        currentFeatured={featuredConfirmation.currentFeatured}
        remainingSlots={featuredConfirmation.remainingSlots}
      />
    </div>
  )
}



