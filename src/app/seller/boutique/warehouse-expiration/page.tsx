'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ChevronDown, Search, AlertCircle, Clock, TrendingDown } from 'lucide-react'
import Image from 'next/image'

interface Product {
  id: string
  title: string
  basePrice: number
  currentStock?: number
  thumbnailUrl?: string
  receivedByAdminAt: string | null
  daysInWarehouse: number
  inMonth5: boolean
  canRepost: boolean
  cycleInfo: {
    daysInCurrentCycle: number
    displayDays: string
    daysRemaining: number
  }
  pendingRepost?: {
    id: string
    units: number
    reason: string
    originalStock: number
    notes?: string
    createdAt: string
  } | null
}

export default function WarehouseExpirationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [repostingId, setRepostingId] = useState<string | null>(null)
  const [showRepostModal, setShowRepostModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [repostReason, setRepostReason] = useState('')
  const [repostNotes, setRepostNotes] = useState('')

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching warehouse products...')
      const response = await fetch('/api/boutique/seller/warehouse-expiration', {
        credentials: 'include'
      })
      console.log(`📊 API Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || `Failed to fetch (${response.status})`)
      }
      
      const data = await response.json()
      console.log(`✅ Got ${data.products?.length || 0} products`, data)
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to load products'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log(`📍 Session status changed: ${status}`)
    if (status === 'unauthenticated') {
      console.log('🚪 Redirecting to login (unauthenticated)')
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      console.log('✅ User authenticated, fetching products')
      fetchProducts()
    } else {
      console.log(`⏳ Waiting for auth... status=${status}`)
    }
  }, [status, fetchProducts, router])

  // Search & filter
  useEffect(() => {
    let filtered = products
    
    if (searchTerm) {
      filtered = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.includes(searchTerm)
      )
    }
    
    // Sort: Month 5 products first, then by days in warehouse
    filtered.sort((a, b) => {
      if (a.inMonth5 && !b.inMonth5) return -1
      if (!a.inMonth5 && b.inMonth5) return 1
      return b.daysInWarehouse - a.daysInWarehouse
    })
    
    setFilteredProducts(filtered)
  }, [searchTerm, products])

  const handleRepostClick = (product: Product) => {
    if (!product.canRepost) {
      toast.error('Product is not eligible for reposting yet')
      return
    }
    setSelectedProduct(product)
    setShowRepostModal(true)
  }

  const handleSubmitRepost = async () => {
    if (!selectedProduct || !repostReason) {
      toast.error('Please select a reason for reposting')
      return
    }

    try {
      setRepostingId(selectedProduct.id)
      const response = await fetch(`/api/boutique/seller/warehouse-expiration/${selectedProduct.id}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason: repostReason,
          notes: repostNotes,
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit repost request')

      toast.success('Repost request submitted! Admin will review it shortly.')
      setShowRepostModal(false)
      setRepostReason('')
      setRepostNotes('')
      setSelectedProduct(null)
      await fetchProducts()
    } catch (error) {
      console.error('Error submitting repost:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit repost request')
    } finally {
      setRepostingId(null)
    }
  }

  const notificationCount = products.filter(p => p.inMonth5).length

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Warehouse Inventory
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Manage products in storage. Products entering Month 5 (120+ days) need attention.
          </p>
        </div>

        {/* Alert if products need attention */}
        {notificationCount > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-orange-900">
                {notificationCount} product{notificationCount !== 1 ? 's' : ''} need attention
              </p>
              <p className="text-xs text-orange-700 mt-1">
                These products have been in the warehouse for 120+ days. You can reduce the price or repost them to reset the countdown.
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No products in warehouse</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  product.inMonth5
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Card Header */}
                <button
                  onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                  className="w-full p-2.5 sm:p-3 md:p-4 flex items-start gap-2 sm:gap-3 md:gap-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Thumbnail */}
                  {product.thumbnailUrl && (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-gray-200 rounded">
                      <Image
                        src={product.thumbnailUrl}
                        alt={product.title}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-start justify-between gap-2 sm:gap-3 md:gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2">
                          {product.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-1">
                          ₦{product.basePrice.toLocaleString()} • {product.currentStock || 0} units
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform`}
                        style={{ transform: expandedId === product.id ? 'rotate(180deg)' : '' }}
                      />
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {product.cycleInfo.displayDays} days
                      </span>
                      {product.inMonth5 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded font-semibold whitespace-nowrap">
                          <AlertCircle className="w-3 h-3" />
                          Month 5
                        </span>
                      )}
                      {product.daysInWarehouse >= 173 && !product.inMonth5 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-semibold whitespace-nowrap">
                          <TrendingDown className="w-3 h-3" />
                          Expiring Soon
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedId === product.id && (
                  <div className="border-t border-gray-200 p-3 sm:p-4 bg-white space-y-3 sm:space-y-4">
                    {/* Timeline */}
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm text-gray-900 mb-2 sm:mb-3">Storage Timeline</h4>
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Days in warehouse:</span>
                          <span className="font-semibold text-gray-900">{product.daysInWarehouse}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Current cycle progress:</span>
                          <span className="font-semibold text-gray-900">{product.cycleInfo.daysInCurrentCycle}/180</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-600">Days remaining:</span>
                          <span className="font-semibold text-orange-600">{product.cycleInfo.daysRemaining}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2 sm:mt-3">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (product.cycleInfo.daysInCurrentCycle / 180) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stock Info */}
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 sm:mb-2">Current Stock</h4>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {product.currentStock || 0} units in warehouse
                      </p>
                      {product.inMonth5 && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ Each repost costs 1 unit (recurring every 180 days if not sold)
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {product.inMonth5 && (
                      <div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-2.5 sm:space-y-3">
                        {product.pendingRepost ? (
                          <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                            <p className="text-xs sm:text-sm font-semibold text-blue-900">
                              ✓ Repost request pending approval
                            </p>
                            <p className="text-xs text-blue-700">
                              Submitted: {new Date(product.pendingRepost.createdAt).toLocaleDateString()} at {new Date(product.pendingRepost.createdAt).toLocaleTimeString()}
                            </p>
                            {product.pendingRepost.notes && (
                              <p className="text-xs text-blue-700">
                                Reason: {product.pendingRepost.reason}
                              </p>
                            )}
                            <p className="text-xs text-blue-600 pt-2 border-t border-blue-200">
                              Admin will review and approve your repost request shortly.
                            </p>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRepostClick(product)}
                              disabled={repostingId === product.id}
                              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-xs sm:text-sm font-semibold"
                            >
                              {repostingId === product.id ? 'Submitting...' : 'Repost to Keep Selling'}
                            </button>
                            <p className="text-xs text-gray-500">
                              Reposting will deduct 1 unit from stock and reset the 180-day countdown.
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {product.daysInWarehouse >= 173 && !product.inMonth5 && (
                      <div className="pt-3 sm:pt-4 border-t border-gray-200 p-2.5 sm:p-3 md:p-4 bg-red-50 rounded">
                        <p className="text-xs sm:text-sm font-semibold text-red-900">
                          ⚠️ Stock deduction in {product.cycleInfo.daysRemaining} days
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          If not sold by then, 1 unit will be deducted from your stock.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Repost Modal */}
      {showRepostModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              Repost: {selectedProduct.title}
            </h3>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {/* Reason Dropdown */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Why are you reposting? *
                </label>
                <select
                  value={repostReason}
                  onChange={(e) => setRepostReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs sm:text-sm"
                >
                  <option value="">Select a reason...</option>
                  <option value="Price adjustment">Price adjustment</option>
                  <option value="Seasonal promotion">Seasonal promotion</option>
                  <option value="Inventory management">Inventory management</option>
                  <option value="Product improvement">Product improvement</option>
                  <option value="Market response">Market response</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Additional notes (optional)
                </label>
                <textarea
                  value={repostNotes}
                  onChange={(e) => setRepostNotes(e.target.value)}
                  placeholder="Let admin know if there's anything special..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs sm:text-sm"
                />
              </div>

              {/* Info Box */}
              <div className="p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-900">
                  <strong>What happens:</strong> Reposting will reduce your stock by 1 unit and reset the 180-day countdown. Your product will stay LIVE.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowRepostModal(false)
                  setRepostReason('')
                  setRepostNotes('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRepost}
                disabled={!repostReason || repostingId === selectedProduct.id}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-xs sm:text-sm font-medium"
              >
                {repostingId === selectedProduct.id ? 'Submitting...' : 'Submit Repost'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
