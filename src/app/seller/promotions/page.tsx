'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrency } from '@/components/CurrencyProvider'
import {
  Tag,
  Plus,
  Loader2,
  ArrowLeft,
  Calendar,
  Percent,
  DollarSign,
  Package,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

interface Promotion {
  id: string
  type: 'DISCOUNT' | 'BUNDLE' | 'FLASH_SALE'
  name: string
  description: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  bundlePrice: number | null
  designIds: string[]
  productIds?: string[]
  startDate: string
  endDate: string
  maxUsage: number | null
  usageCount: number
  isActive: boolean
  createdAt: string
  designs?: Array<{ id: string; title: string; thumbnailUrl?: string; price: number }>
  products?: Array<{ id: string; title: string; thumbnailUrl?: string; basePrice: number }>
}

export default function SellerPromotionsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [designs, setDesigns] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [expandedPromotionId, setExpandedPromotionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [promotedDesignIds, setPromotedDesignIds] = useState<string[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [designPromotionMap, setDesignPromotionMap] = useState<Record<string, {
    promotionId: string
    promotionName: string
    promotionType: string
  }> | null>(null)
  const [conflictingPromotions, setConflictingPromotions] = useState<Array<{
    id: string
    name: string
    type: string
  }> | null>(null)

  const [newPromotion, setNewPromotion] = useState<{
    type: 'DISCOUNT' | 'BUNDLE' | 'FLASH_SALE'
    name: string
    description: string
    discountType: 'PERCENTAGE' | 'FIXED'
    discountValue: number
    bundlePrice: number | null
    designIds: string[]
    productIds: string[]
    startDate: string
    endDate: string
    maxUsage: number | null
  }>({
    type: 'DISCOUNT',
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    bundlePrice: null,
    designIds: [],
    productIds: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxUsage: null as number | null,
  })

  const [itemType, setItemType] = useState<'designs' | 'products'>('designs')

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchPromotions()
    fetchDesigns()
  }, [session, authStatus, router, filter])

  const fetchDesigns = async () => {
    try {
      const response = await fetch('/api/seller/designs')
      if (response.ok) {
        const data = await response.json()
        setDesigns(data.designs || [])
      }
    } catch (error) {
      console.error('Failed to fetch designs:', error)
    }

    // Fetch designs that already have active promotions
    try {
      const response = await fetch('/api/seller/promotions/active-designs')
      if (response.ok) {
        const data = await response.json()
        setDesignPromotionMap(data.designPromos || {})
        setPromotedDesignIds(Object.keys(data.designPromos || {}))
      }
    } catch (error) {
      console.error('Failed to fetch promoted designs:', error)
    }
  }

  const fetchPromotions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/seller/promotions?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setPromotions(data.promotions || [])
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (!newPromotion.name.trim()) {
      setError('Promotion name is required')
      return
    }

    if (newPromotion.discountValue <= 0) {
      setError('Discount value must be greater than 0')
      return
    }

    if (newPromotion.discountType === 'PERCENTAGE' && newPromotion.discountValue > 100) {
      setError('Percentage discount cannot exceed 100%')
      return
    }

    if (newPromotion.type === 'BUNDLE') {
      const hasItems = (itemType === 'designs' && newPromotion.designIds.length > 0) ||
                       (itemType === 'products' && newPromotion.productIds.length > 0);
      if (!hasItems) {
        const itemName = itemType === 'designs' ? 'design' : 'product';
        setError(`Bundle promotion must include at least one ${itemName}`)
        return
      }

      if (!newPromotion.bundlePrice || newPromotion.bundlePrice <= 0) {
        setError('Bundle price must be greater than 0')
        return
      }
    }

    const startDate = new Date(newPromotion.startDate)
    const endDate = new Date(newPromotion.endDate)

    if (endDate <= startDate) {
      setError('End date must be after start date')
      return
    }

    if (newPromotion.maxUsage !== null && newPromotion.maxUsage < 1) {
      setError('Maximum usage must be at least 1')
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/seller/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPromotion),
      })

      if (response.ok) {
        setSuccess('Promotion created successfully!')
        setShowCreateModal(false)
        setItemType('designs')
        setNewPromotion({
          type: 'DISCOUNT',
          name: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          bundlePrice: null,
          designIds: [],
          productIds: [],
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          maxUsage: null,
        })
        fetchPromotions()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        
        // Format conflict error with details
        if (response.status === 409 && data.conflictingDesigns) {
          setConflictingPromotions(data.existingPromotions || [])
          const conflictDetails = Object.entries(data.conflictingDesigns)
            .map(([_, promo]) => `• ${promo}`)
            .join('\n')
          setError(`${data.error}\n\n${conflictDetails}`)
        } else {
          setConflictingPromotions(null)
          setError(data.error || 'Failed to create promotion')
        }
      }
    } catch (error) {
      console.error('Failed to create promotion:', error)
      setError('An error occurred')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (promotionId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/seller/promotions/${promotionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        fetchPromotions()
      }
    } catch (error) {
      console.error('Failed to toggle promotion:', error)
    }
  }

  const handleDeletePromotion = async (promotionId: string) => {
    try {
      const response = await fetch(`/api/seller/promotions/${promotionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('Promotion deleted')
        setDeleteConfirmId(null)
        fetchPromotions()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      console.error('Failed to delete promotion:', error)
    }
  }

  const getStatusBadge = (promotion: Promotion) => {
    const now = new Date()
    const endDate = new Date(promotion.endDate)
    const startDate = new Date(promotion.startDate)

    if (!promotion.isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <EyeOff className="w-3 h-3 mr-1" />
          Inactive
        </span>
      )
    }

    if (now < startDate) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Clock className="w-3 h-3 mr-1" />
          Scheduled
        </span>
      )
    }

    if (now > endDate) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div>
            <Link
              href="/seller/dashboard"
              className="inline-flex items-center text-xs sm:text-sm text-gray-500 hover:text-gray-700 mb-1 sm:mb-2"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Promotions</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Create and manage discounts for your designs</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            Create Promotion
          </button>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-xs sm:text-sm text-green-700">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-700">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium whitespace-pre-wrap">{error}</p>
                {conflictingPromotions && conflictingPromotions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="font-medium text-red-800">To resolve this, deactivate:</p>
                    {conflictingPromotions.map(promo => (
                      <button
                        key={promo.id}
                        onClick={() => {
                          setError('')
                          setConflictingPromotions(null)
                          // Scroll to the promotion in the list
                          const element = document.getElementById(`promotion-${promo.id}`)
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            element.classList.add('ring-2', 'ring-yellow-400')
                            setTimeout(() => element.classList.remove('ring-2', 'ring-yellow-400'), 2000)
                          }
                        }}
                        className="block w-full text-left px-2 py-1 bg-red-100 hover:bg-red-200 rounded transition-colors font-medium"
                      >
                        → {promo.name} ({promo.type})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {promotions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{promotions.length}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Total Promotions</p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{promotions.filter(p => p.isActive && new Date(p.endDate) > new Date()).length}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Active Now</p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">{promotions.filter(p => new Date(p.startDate) > new Date()).length}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Scheduled</p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-400">{promotions.filter(p => new Date(p.endDate) <= new Date()).length}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Expired</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-5 md:mb-6">
          {(['all', 'active', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Promotions List */}
        {promotions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-12 text-center">
            <Tag className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-2 sm:mb-3 md:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No Promotions Yet</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 md:mb-6">
              Create your first promotion to attract more buyers
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              Create Promotion
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {promotions.map((promotion) => (
              <div
                id={`promotion-${promotion.id}`}
                key={promotion.id}
                className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4 min-w-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      promotion.type === 'DISCOUNT'
                        ? 'bg-green-100'
                        : promotion.type === 'BUNDLE'
                        ? 'bg-purple-100'
                        : 'bg-orange-100'
                    }`}>
                      {promotion.type === 'DISCOUNT' ? (
                        <Percent className={`w-5 h-5 sm:w-6 sm:h-6 ${
                          promotion.type === 'DISCOUNT' ? 'text-green-600' : ''
                        }`} />
                      ) : promotion.type === 'BUNDLE' ? (
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                      ) : (
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-xs sm:text-sm md:text-base text-gray-900">{promotion.name}</h3>
                        <div className="flex-shrink-0">{getStatusBadge(promotion)}</div>
                      </div>
                      {promotion.description && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-1">{promotion.description}</p>
                      )}
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1 flex-shrink-0">
                          {promotion.discountType === 'PERCENTAGE' ? (
                            <Percent className="w-3 h-3 sm:w-4 sm:h-4" />
                          ) : (
                            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                          {promotion.discountType === 'PERCENTAGE'
                            ? `${promotion.discountValue}% off`
                            : `$${promotion.discountValue} off`}
                        </span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">{formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</span>
                          <span className="sm:hidden text-xs">{new Date(promotion.startDate).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span>
                        </span>
                        {promotion.maxUsage && (
                          <span className="text-xs">
                            {promotion.usageCount}/{promotion.maxUsage} used
                          </span>
                        )}
                      </div>
                      {(promotion.type === 'BUNDLE' || promotion.type === 'FLASH_SALE' || promotion.type === 'DISCOUNT') && promotion.designIds.length > 0 && (
                        <button
                          onClick={() => setExpandedPromotionId(expandedPromotionId === promotion.id ? null : promotion.id)}
                          className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2 transition-colors"
                        >
                          {expandedPromotionId === promotion.id
                            ? '▼ Hide designs'
                            : `▶ View ${promotion.designIds.length} design${promotion.designIds.length !== 1 ? 's' : ''}`}
                        </button>
                      )}
                      {promotion.type === 'DISCOUNT' && promotion.designIds.length === 0 && (
                        <p className="text-xs text-gray-500 mt-2">Applies to all designs</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(promotion.id, promotion.isActive)}
                      className={`p-1 sm:p-2 rounded-lg transition-colors ${
                        promotion.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={promotion.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {promotion.isActive ? <Eye className="w-4 h-4 sm:w-5 sm:h-5" /> : <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(promotion.id)}
                      className="p-1 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
                {expandedPromotionId === promotion.id && (promotion.type === 'BUNDLE' || promotion.type === 'FLASH_SALE' || promotion.type === 'DISCOUNT') && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {promotion.designIds && promotion.designIds.length > 0 && (
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-3">Designs included in this promotion:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                          {(promotion.designs || [])
                            .map(design => (
                              <Link
                                key={design.id}
                                href={`/seller/designs/${design.id}`}
                                className="group relative bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                              >
                                <div className="aspect-square bg-gray-200 flex items-center justify-center overflow-hidden relative">
                                  {design.thumbnailUrl ? (
                                    <img
                                      src={design.thumbnailUrl}
                                      alt={design.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center w-full h-full text-gray-400 text-xs text-center px-2">
                                      No image
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">View Design</span>
                                  </div>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-gray-900 mt-1 line-clamp-2">{design.title}</p>
                                <p className="text-xs text-gray-500">{formatPrice(design.price)}</p>
                              </Link>
                            ))}
                        </div>
                      </div>
                    )}
                    {promotion.productIds && promotion.productIds.length > 0 && (
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-3">Products included in this promotion:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                          {(promotion.products || [])
                            .map(product => (
                              <Link
                                key={product.id}
                                href={`/seller/boutique/${product.id}`}
                                className="group relative bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                              >
                                <div className="aspect-square bg-gray-200 flex items-center justify-center overflow-hidden relative">
                                  {product.thumbnailUrl ? (
                                    <img
                                      src={product.thumbnailUrl}
                                      alt={product.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center w-full h-full text-gray-400 text-xs text-center px-2">
                                      No image
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">View Product</span>
                                  </div>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-gray-900 mt-1 line-clamp-2">{product.title}</p>
                                <p className="text-xs text-gray-500">{formatPrice(product.basePrice)}</p>
                              </Link>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Create Promotion</h2>
              </div>
              <form onSubmit={handleCreatePromotion} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="promotionType" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Promotion Type
                  </label>
                  <select
                    id="promotionType"
                    value={newPromotion.type}
                    onChange={(e) =>
                      setNewPromotion({ ...newPromotion, type: e.target.value as 'DISCOUNT' | 'BUNDLE' | 'FLASH_SALE' })
                    }
                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="DISCOUNT">Discount</option>
                    <option value="BUNDLE">Bundle</option>
                    <option value="FLASH_SALE">Flash Sale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Apply To *</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={itemType === 'designs'}
                        onChange={() => {
                          setItemType('designs')
                          setNewPromotion({ ...newPromotion, designIds: [], productIds: [] })
                        }}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-xs sm:text-sm text-gray-700">Designs</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={itemType === 'products'}
                        onChange={() => {
                          setItemType('products')
                          setNewPromotion({ ...newPromotion, designIds: [], productIds: [] })
                        }}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-xs sm:text-sm text-gray-700">Boutique Products</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newPromotion.name}
                    onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
                    required
                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Summer Sale"
                  />
                </div>

                {itemType === 'designs' && (newPromotion.type === 'BUNDLE' || newPromotion.type === 'DISCOUNT' || newPromotion.type === 'FLASH_SALE') && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Select Designs {newPromotion.type === 'BUNDLE' ? '*' : '(Optional - leave empty to apply to all)'}
                    </label>
                    {promotedDesignIds.length > 0 && (
                      <p className="text-xs text-amber-600 mb-2 p-2 bg-amber-50 rounded">
                        ℹ️ Some designs already have active promotions and cannot be added
                      </p>
                    )}
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {designs.length === 0 ? (
                        <p className="text-xs text-gray-500">No designs available</p>
                      ) : (
                        designs.map((design) => {
                          const isPromoted = promotedDesignIds.includes(design.id)
                          const promotionInfo = isPromoted ? designPromotionMap?.[design.id] : null
                          return (
                            <label 
                              key={design.id} 
                              className={`flex items-center gap-2 py-1 text-xs sm:text-sm cursor-pointer hover:bg-gray-50 ${
                                isPromoted ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title={promotionInfo ? `Promotion: ${promotionInfo.promotionName}` : ''}
                            >
                              <input
                                type="checkbox"
                                checked={newPromotion.designIds.includes(design.id)}
                                disabled={isPromoted}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewPromotion({
                                      ...newPromotion,
                                      designIds: [...newPromotion.designIds, design.id],
                                    })
                                  } else {
                                    setNewPromotion({
                                      ...newPromotion,
                                      designIds: newPromotion.designIds.filter((id) => id !== design.id),
                                    })
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 disabled:opacity-50"
                              />
                              <div className="flex-1">
                                <span className={`${isPromoted ? 'text-gray-500' : 'text-gray-700'}`}>
                                  {design.title}
                                </span>
                                {isPromoted && promotionInfo && (
                                  <div className="text-xs text-amber-600 font-medium ml-1">
                                    {promotionInfo.promotionName} ({promotionInfo.promotionType})
                                  </div>
                                )}
                              </div>
                            </label>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}

                {itemType === 'products' && (newPromotion.type === 'BUNDLE' || newPromotion.type === 'DISCOUNT' || newPromotion.type === 'FLASH_SALE') && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Select Boutique Products {newPromotion.type === 'BUNDLE' ? '*' : '(Optional - leave empty to apply to all)'}
                    </label>
                    <p className="text-xs text-blue-600 mb-2 p-2 bg-blue-50 rounded">
                      ℹ️ Products will be fetched from your available boutique inventory
                    </p>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 text-gray-500 text-xs">
                      <p>Products list will be populated when you save the promotion</p>
                      <p className="mt-2">For now, enter product IDs directly or manage them after creation.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newPromotion.description}
                    onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                    rows={2}
                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label htmlFor="discountType" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Discount Type
                    </label>
                    <select
                      id="discountType"
                      value={newPromotion.discountType}
                      onChange={(e) =>
                        setNewPromotion({
                          ...newPromotion,
                          discountType: e.target.value as 'PERCENTAGE' | 'FIXED',
                        })
                      }
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="discountValue" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {newPromotion.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount $'}
                    </label>
                    <input
                      id="discountValue"
                      type="number"
                      min="1"
                      max={newPromotion.discountType === 'PERCENTAGE' ? 100 : undefined}
                      value={newPromotion.discountValue}
                      onChange={(e) =>
                        setNewPromotion({ ...newPromotion, discountValue: parseInt(e.target.value) || 0 })
                      }
                      required
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {newPromotion.type === 'BUNDLE' && (
                  <div>
                    <label htmlFor="bundlePrice" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Bundle Price ($) *
                    </label>
                    <input
                      id="bundlePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newPromotion.bundlePrice || 0}
                      onChange={(e) =>
                        setNewPromotion({
                          ...newPromotion,
                          bundlePrice: e.target.value ? parseFloat(e.target.value) : 0,
                        })
                      }
                      required={newPromotion.type === 'BUNDLE'}
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="29.99"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      id="startDate"
                      type="date"
                      value={newPromotion.startDate}
                      onChange={(e) => setNewPromotion({ ...newPromotion, startDate: e.target.value })}
                      required
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      id="endDate"
                      type="date"
                      value={newPromotion.endDate}
                      onChange={(e) => setNewPromotion({ ...newPromotion, endDate: e.target.value })}
                      required
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="maxUsage" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Max Usage (Optional)
                  </label>
                  <input
                    id="maxUsage"
                    type="number"
                    min="1"
                    value={newPromotion.maxUsage || ''}
                    onChange={(e) =>
                      setNewPromotion({
                        ...newPromotion,
                        maxUsage: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-black border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Unlimited"
                  />
                </div>

                <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        <span className="hidden sm:inline">Creating...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Create Promotion</span>
                        <span className="sm:hidden">Create</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl max-w-sm w-full">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Delete Promotion?
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete this promotion? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirmId) {
                        handleDeletePromotion(deleteConfirmId);
                      }
                    }}
                    className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
