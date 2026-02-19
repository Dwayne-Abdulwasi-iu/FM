'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useCurrency } from '@/components/CurrencyProvider'
import { SubscriptionRequiredModal } from '@/components/SubscriptionRequiredModal'
import { FeaturedItemsConfirmationModal } from '@/components/FeaturedItemsConfirmationModal'
import { 
  ArrowLeft, 
  Plus, 
  Eye, 
  Heart, 
  ShoppingBag,
  Search,
  Filter,
  Trash2,
  Star
} from 'lucide-react'

interface Design {
  id: string
  title: string
  description: string
  price: number
  imageUrl: string
  thumbnailUrl: string | null
  category: string
  status: string
  viewCount: number
  totalSales: number
  totalRevenue: number
  createdAt: string
  _count: {
    favorites: number
    reviews: number
  }
  avgRating: number
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

export default function SellerDesignsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
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
    designId: string | null
    designTitle: string | null
    subscriptionTier: string | null
    maxFeatured: number
    currentFeatured: number
    remainingSlots: number
  }>({
    isOpen: false,
    designId: null,
    designTitle: null,
    subscriptionTier: null,
    maxFeatured: 0,
    currentFeatured: 0,
    remainingSlots: 0
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    async function fetchDesigns() {
      try {
        const [designsRes, featuredRes] = await Promise.all([
          fetch('/api/seller/designs'),
          fetch('/api/seller/featured-designs')
        ])
        
        if (designsRes.ok) {
          const designsData = await designsRes.json()
          let designs = designsData.designs || []
          
          // Load featured status from seller-featured designs
          if (featuredRes.ok) {
            const featuredData = await featuredRes.json()
            interface FeaturedDesignItem {
              itemId: string
              addedByAdmin?: boolean
            }
            const featuredMap = new Map<string, FeaturedDesignItem>(
              featuredData.items?.map((item: FeaturedDesignItem) => [item.itemId, item]) || []
            )
            
            designs = designs.map((design: Design) => ({
              ...design,
              featured: featuredMap.has(design.id),
              // If in seller featured list, use that addedByAdmin status
              // Otherwise use the addedByAdmin from designs API (admin-featured)
              addedByAdmin: featuredMap.has(design.id) 
                ? (featuredMap.get(design.id)?.addedByAdmin || false)
                : (design.addedByAdmin || false)
            }))
          } else {
            // If featured endpoint fails, just use addedByAdmin from designs
            designs = designs.map((design: Design) => ({
              ...design,
              featured: design.addedByAdmin || false,
              addedByAdmin: design.addedByAdmin || false
            }))
          }
          
          setDesigns(designs)
        }
      } catch (error) {
        console.error('Failed to fetch designs:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchDesigns()
    }
  }, [session])

  const handleDelete = async (designId: string) => {
    try {
      const res = await fetch(`/api/designs/${designId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDesigns(designs.filter(d => d.id !== designId))
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Failed to delete design:', error)
    }
  }

  const handleToggleFeatured = async (designId: string, isFeatured: boolean) => {
    try {
      setTogglingFeatured(designId)
      
      if (isFeatured) {
        // DELETE with query parameter
        const res = await fetch(`/api/seller/featured-designs?designId=${designId}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          setDesigns(designs.map(d => 
            d.id === designId ? { ...d, featured: false, addedByAdmin: false } : d
          ))
          toast.success('Removed from featured')
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to remove from featured')
        }
      } else {
        // ADDING to featured - first get current featured count
        const featuredRes = await fetch('/api/seller/featured-designs')
        if (!featuredRes.ok) {
          toast.error('Failed to load featured items')
          return
        }
        
        const featuredData = await featuredRes.json()
        const design = designs.find(d => d.id === designId)
        
        // Check if they have a subscription tier
        if (featuredData.maxFeatured === 0) {
          // No subscription
          setSubscriptionModal({
            isOpen: true,
            currentTier: 'FREE',
            max: 0,
            errorCode: 'NO_FEATURED_ACCESS'
          })
          return
        }
        
        // Show confirmation modal with current count
        setFeaturedConfirmation({
          isOpen: true,
          designId,
          designTitle: design?.title || 'Design',
          subscriptionTier: featuredData.subscriptionTier,
          maxFeatured: featuredData.maxFeatured,
          currentFeatured: featuredData.currentFeaturedCount,
          remainingSlots: featuredData.remainingSlots
        })
      }
    } catch (error) {
      console.error('Failed to toggle featured:', error)
      toast.error('Failed to update featured status')
    } finally {
      setTogglingFeatured(null)
    }
  }

  const handleConfirmAddToFeatured = async () => {
    const designId = featuredConfirmation.designId
    if (!designId) return
    
    try {
      const res = await fetch('/api/seller/featured-designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId }),
      })
      
      if (res.ok) {
        setDesigns(designs.map(d => 
          d.id === designId ? { ...d, featured: true, addedByAdmin: false } : d
        ))
        setFeaturedConfirmation({
          isOpen: false,
          designId: null,
          designTitle: null,
          subscriptionTier: null,
          maxFeatured: 0,
          currentFeatured: 0,
          remainingSlots: 0
        })
        toast.success('Added to featured')
      } else {
        const error = await res.json()
        
        // Handle errors
        if (res.status === 403 && error.errorCode === 'NO_FEATURED_ACCESS') {
          setFeaturedConfirmation({
            isOpen: false,
            designId: null,
            designTitle: null,
            subscriptionTier: null,
            maxFeatured: 0,
            currentFeatured: 0,
            remainingSlots: 0
          })
          setSubscriptionModal({
            isOpen: true,
            currentTier: error.currentTier || 'FREE',
            max: error.maxAllowed || 0,
            errorCode: 'NO_FEATURED_ACCESS'
          })
        } else if (res.status === 409 && error.errorCode === 'TIER_LIMIT_REACHED') {
          setFeaturedConfirmation({
            isOpen: false,
            designId: null,
            designTitle: null,
            subscriptionTier: null,
            maxFeatured: 0,
            currentFeatured: 0,
            remainingSlots: 0
          })
          setSubscriptionModal({
            isOpen: true,
            currentTier: error.currentTier,
            current: error.current,
            max: error.max,
            errorCode: 'TIER_LIMIT_REACHED'
          })
        } else if (res.status === 429) {
          toast.error('Too many requests. Please wait a moment and try again')
        } else {
          toast.error(error.error || 'Failed to add to featured')
        }
      }
    } catch (error) {
      console.error('Failed to confirm add to featured:', error)
      toast.error('Failed to add to featured')
    }
  }

  // Get unique categories
  const categories = [...new Set(designs.map(d => d.category))].filter(Boolean)

  // Filter and sort
  const filteredDesigns = designs
    .filter(design => {
      const matchesSearch = searchQuery === '' || 
        design.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        design.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = categoryFilter === 'all' || design.category === categoryFilter

      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'price-high':
          return b.price - a.price
        case 'price-low':
          return a.price - b.price
        case 'most-sales':
          return b.totalSales - a.totalSales
        case 'most-views':
          return b.viewCount - a.viewCount
        default:
          return 0
      }
    })

  // Calculate totals
  const totalViews = designs.reduce((sum, d) => sum + d.viewCount, 0)
  const totalSales = designs.reduce((sum, d) => sum + d.totalSales, 0)
  const totalRevenue = designs.reduce((sum, d) => sum + d.totalRevenue, 0)
  const totalFavorites = designs.reduce((sum, d) => sum + d._count.favorites, 0)

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/seller/dashboard"
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">My Designs</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Manage your design portfolio</p>
            </div>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Design
          </Link>
        </div>

        {/* Status Information Banner */}
        {designs.some(d => d.status === 'PENDING') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 mt-0.5">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Design Status Information</h3>
                <p className="text-sm text-blue-800">
                  <strong>⏳ Pending:</strong> Your design is awaiting admin review and will not be visible to buyers yet. This usually takes 1-2 business days.
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>✓ Live:</strong> Your design has been approved and is now visible on the marketplace for buyers to purchase.
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>✕ Rejected:</strong> Your design was not approved. Check your email for details on why and what changes are needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">{totalViews.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-gray-500">Total Views</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">{totalSales}</p>
                <p className="text-xs sm:text-sm text-gray-500">Total Sales</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 font-bold text-xs sm:text-base">$</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">{formatPrice(totalRevenue)}</p>
                <p className="text-xs sm:text-sm text-gray-500">Revenue</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-lg font-bold text-gray-900 truncate">{totalFavorites}</p>
                <p className="text-xs sm:text-sm text-gray-500">Favorites</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-2 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent flex-1 sm:flex-initial"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort designs by"
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent flex-1 sm:flex-initial"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price-high">Price: High</option>
                <option value="price-low">Price: Low</option>
                <option value="most-sales">Sales</option>
                <option value="most-views">Views</option>
              </select>
            </div>
          </div>
        </div>

        {/* Designs Grid */}
        {filteredDesigns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {designs.length === 0 ? "No designs yet" : "No designs match your filters"}
            </h3>
            <p className="text-gray-500 mb-6">
              {designs.length === 0 
                ? "Start by uploading your first design to the marketplace."
                : "Try adjusting your search or filter criteria."}
            </p>
            {designs.length === 0 && (
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                <Plus className="w-5 h-5" />
                Upload Design
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filteredDesigns.map((design) => (
              <div key={design.id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
                {/* Image */}
                <Link href={`/designs/${design.id}`} className="block relative aspect-square">
                  <Image
                    src={design.thumbnailUrl || design.imageUrl}
                    alt={design.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeleteConfirm(design.id)
                      }}
                      className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </Link>

                {/* Content */}
                <div className="p-2 sm:p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link href={`/designs/${design.id}`} className="flex-1">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate hover:text-indigo-600 transition-colors">
                        {design.title}
                      </h3>
                    </Link>
                    {/* Featured Star Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleToggleFeatured(design.id, !!design.featured)
                      }}
                      disabled={togglingFeatured === design.id}
                      className={`p-1.5 rounded-full transition-colors flex-shrink-0 relative ${
                        design.featured 
                          ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      } disabled:opacity-50`}
                      title={design.featured && design.addedByAdmin ? 'Featured by admin (admin-promoted design)' : design.featured ? 'Remove from featured' : 'Add to featured'}
                    >
                      <Star className="w-4 h-4 fill-current" />
                      {design.featured && design.addedByAdmin && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold" title="This design was featured by an admin">
                          +
                        </span>
                      )}
                    </button>
                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 ${
                      design.status === 'LIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : design.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : design.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {design.status === 'LIVE' ? '✓ Live' : design.status === 'PENDING' ? '⏳ Pending' : design.status === 'REJECTED' ? '✕ Rejected' : design.status}
                    </span>
                  </div>
                  <p className="text-sm sm:text-lg font-bold text-indigo-600 mt-1">
                    {formatPrice(design.price)}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      {design.viewCount}
                    </span>
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                      {design._count.favorites}
                    </span>
                    <span className="flex items-center gap-0.5 sm:gap-1">
                      <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                      {design.totalSales}
                    </span>
                    {design.avgRating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        {design.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Revenue */}
                  {design.totalRevenue > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Revenue: <span className="font-semibold text-green-600">{formatPrice(design.totalRevenue)}</span>
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-xs text-gray-400 mt-2">
                    Added {formatDate(design.createdAt)}
                  </p>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirm === design.id && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Design?</h3>
                      <p className="text-gray-500 mb-6">
                        Are you sure you want to delete "{design.title}"? This action cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(design.id)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {filteredDesigns.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredDesigns.length} of {designs.length} designs
          </div>
        )}
      </div>

      {/* Subscription Modal */}
      <SubscriptionRequiredModal
        isOpen={subscriptionModal.isOpen}
        onClose={() => setSubscriptionModal({ isOpen: false })}
        currentTier={subscriptionModal.currentTier}
        current={subscriptionModal.current}
        max={subscriptionModal.max}
        errorCode={subscriptionModal.errorCode}
        itemType="DESIGN"
      />

      {/* Featured Items Confirmation Modal */}
      <FeaturedItemsConfirmationModal
        isOpen={featuredConfirmation.isOpen}
        onClose={() => setFeaturedConfirmation({
          isOpen: false,
          designId: null,
          designTitle: null,
          subscriptionTier: null,
          maxFeatured: 0,
          currentFeatured: 0,
          remainingSlots: 0
        })}
        onConfirm={handleConfirmAddToFeatured}
        itemTitle={featuredConfirmation.designTitle || ''}
        itemType="DESIGN"
        subscriptionTier={featuredConfirmation.subscriptionTier}
        maxFeatured={featuredConfirmation.maxFeatured}
        currentFeatured={featuredConfirmation.currentFeatured}
        remainingSlots={featuredConfirmation.remainingSlots}
      />
    </div>
  )
}
