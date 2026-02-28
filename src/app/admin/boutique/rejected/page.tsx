'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  _Package, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Mail,
  User,
  Play,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ProductImage } from '@/components/ProductImage'

interface Seller {
  id: string
  name: string
  email: string
  boutique_returnAddress?: {
    name: string
    phone: string
    address: string
    city: string
    state: string
    country: string
    postalCode: string
  } | null
}

interface RejectedProduct {
  id: string
  title: string
  status: string
  thumbnailUrl: string | null
  basePrice: number
  rejectionReason: string | null
  createdAt: string
  description?: string
  originalStock: number | null
  currentStock: number | null
  totalRejectedQty?: number
  variants?: Array<{
    id: string
    quantity: number
    size?: string | null
    color?: string | null
  }>
  media?: Array<{
    id: string
    url: string
    type: string
    sortOrder: number
  }>
  seller: Seller
  shipment?: {
    id: string
    itemsMissing: number | null
    itemsDamaged: number | null
    disputeNotes: string | null
    status?: string
  }
  returnStatus?: 'none' | 'in_progress' | 'completed'
}

export default function RejectedProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<RejectedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<RejectedProduct | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [returnDate, setReturnDate] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as { role?: string }).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchRejectedProducts()
  }, [session, status, router, page, searchQuery])

  const fetchRejectedProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/boutique/admin/rejected?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1)
      } else {
        toast.error('Failed to load rejected products')
      }
    } catch (error) {
      console.error('Failed to fetch rejected products:', error)
      toast.error('Failed to load rejected products')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchRejectedProducts()
  }

  const sendReturnEmail = async () => {
    if (!selectedProduct) return
    if (!returnDate) {
      toast.error('Please select a return date')
      return
    }

    setEmailLoading(true)
    try {
      const res = await fetch(`/api/boutique/admin/rejected/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          sellerId: selectedProduct.seller.id,
          sellerEmail: selectedProduct.seller.email,
          returnDate,
          rejectionReason: selectedProduct.rejectionReason,
        }),
      })

      if (res.ok) {
        toast.success('Email sent to seller!')
        setShowEmailModal(false)
        setReturnDate('')
        fetchRejectedProducts()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleReturnItem = async (product: RejectedProduct) => {
    try {
      const res = await fetch(`/api/boutique/admin/rejected/${product.id}/create-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Return shipment created! Seller will be notified.')
        fetchRejectedProducts()
      } else if (res.status === 409) {
        // Conflict: Return shipment already exists
        toast.error(data.message || 'Return shipment already exists')
        // Update product status immediately to disable button
        setProducts(prevProducts =>
          prevProducts.map(p =>
            p.id === product.id
              ? { ...p, returnStatus: 'in_progress' }
              : p
          )
        )
      } else {
        toast.error(data.message || 'Failed to create return shipment')
      }
    } catch (error) {
      console.error('Error creating return:', error)
      toast.error('Failed to create return shipment')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getMinReturnDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getMaxReturnDate = () => {
    const today = new Date()
    today.setDate(today.getDate() + 7)
    return today.toISOString().split('T')[0]
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-3 sm:mb-8">
          <Link href="/admin/boutique" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-2 sm:mb-4 text-[10px] sm:text-sm">
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            Back to Admin
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertTriangle className="w-5 h-5 sm:w-8 sm:h-8 text-red-600" />
            <div>
              <h1 className="text-lg sm:text-3xl font-bold text-black">Rejected Products</h1>
              <p className="text-[10px] sm:text-base text-black">
                {products.length} rejected products awaiting pickup
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-2.5 sm:p-4 mb-3 sm:mb-6">
          <div className="flex flex-col gap-2 sm:gap-3">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product title, seller name, or ID..."
                  className="w-full pl-7 sm:pl-10 pr-2.5 sm:pr-4 py-1.5 sm:py-2 border rounded-lg text-black bg-white focus:ring-2 focus:ring-red-500 text-[11px] sm:text-sm placeholder-gray-500"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Products List */}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-12 text-center">
            <AlertTriangle className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-black mb-1 sm:mb-2">No Rejected Products</h3>
            <p className="text-[11px] sm:text-base text-black">
              {searchQuery ? 'Try adjusting your filters' : 'No products have been rejected'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Collapsible Header */}
                <button
                  onClick={() => {
                    if (expandedProductId === product.id) {
                      // Collapse and reset media
                      setExpandedProductId(null)
                      setSelectedMediaUrl(null)
                    } else {
                      // Expand and initialize first media
                      setExpandedProductId(product.id)
                      if (product.media && product.media.length > 0) {
                        setSelectedMediaUrl(product.media[0].url)
                      } else if (product.thumbnailUrl) {
                        setSelectedMediaUrl(product.thumbnailUrl)
                      }
                    }
                  }}
                  className="w-full p-1.5 sm:p-4 md:p-6 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-1.5 sm:gap-4 flex-1 min-w-0">
                    {/* Product Image */}
                    <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
                      <ProductImage
                        src={product.thumbnailUrl}
                        alt={product.title}
                        containerClassName="w-full h-full rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center"
                        className="w-full h-full object-cover"
                        fallbackClassName="w-7 h-7 sm:w-8 sm:h-8 text-gray-400"
                      />
                    </div>

                    {/* Product Summary */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-start justify-between gap-1 mb-0.5 sm:mb-1">
                        <h3 className="font-semibold text-black text-[10px] sm:text-base leading-tight truncate">
                          {product.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium bg-red-100 text-red-700 flex-shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          Rejected
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-sm text-black">
                        {formatCurrency(product.basePrice)} • {product.seller.name}
                      </p>
                    </div>
                  </div>

                  {/* Expand/Collapse Chevron */}
                  <ChevronDown
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 ml-2 transition-transform ${
                      expandedProductId === product.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Expanded Details */}
                {expandedProductId === product.id && (
                  <div className="border-t px-1.5 sm:px-4 md:px-6 py-2 sm:py-4 bg-gray-50 space-y-2 sm:space-y-3">
                    {/* Media Gallery */}
                    {product.media && product.media.length > 0 && (
                      <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
                        <p className="text-black font-semibold text-[7px] sm:text-xs mb-2">Product Media</p>
                        
                        {/* Main Display */}
                        <div className="mb-2 relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          {selectedMediaUrl ? (
                            product.media.find(m => m.url === selectedMediaUrl)?.type === 'VIDEO' ? (
                              <video
                                src={selectedMediaUrl}
                                controls
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={selectedMediaUrl}
                                alt="Product"
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : product.thumbnailUrl ? (
                            <img
                              src={product.thumbnailUrl}
                              alt="Product"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No image
                            </div>
                          )}
                        </div>

                        {/* Thumbnails */}
                        {product.media.length > 1 && (
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                            {product.media.map((media) => (
                              <button
                                key={media.id}
                                onClick={() => setSelectedMediaUrl(media.url)}
                                className={`relative aspect-square rounded border-2 overflow-hidden transition ${
                                  selectedMediaUrl === media.url
                                    ? 'border-blue-500'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                <img
                                  src={media.url}
                                  alt="Thumbnail"
                                  className="w-full h-full object-cover"
                                />
                                {media.type === 'VIDEO' && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Play className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {product.description && (
                      <div className="p-0.5 sm:p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-[7.5px] sm:text-sm text-gray-800 font-medium mb-1">Description</p>
                        <p className="text-[7.5px] sm:text-sm text-gray-700 line-clamp-3">{product.description}</p>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-[8px] sm:text-sm">
                      <div>
                        <p className="text-black font-semibold text-[7px] sm:text-xs">Rejected Qty</p>
                        <p className="text-black text-[7.5px] sm:text-xs mt-1 font-medium text-red-600">
                          {product.totalRejectedQty || 0} units
                        </p>
                      </div>
                      <div>
                        <p className="text-black font-semibold text-[7px] sm:text-xs">Seller</p>
                        <p className="text-black flex items-center gap-0.5 truncate mt-1 text-[7.5px] sm:text-xs">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{product.seller.name}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-black font-semibold text-[7px] sm:text-xs">Email</p>
                        <p className="text-black text-[7.5px] sm:text-xs mt-1 truncate">{product.seller.email}</p>
                      </div>
                      <div>
                        <p className="text-black font-semibold text-[7px] sm:text-xs">Rejected Date</p>
                        <p className="text-black text-[7.5px] sm:text-xs mt-1">{formatDate(product.createdAt)}</p>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {product.rejectionReason && (
                      <div className="p-0.5 sm:p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-[7.5px] sm:text-sm text-red-800 font-medium">
                          Rejection Reason:
                        </p>
                        <p className="text-[7.5px] sm:text-sm text-red-700 mt-1">{product.rejectionReason}</p>
                      </div>
                    )}

                    {/* Return Address */}
                    {false && product.seller.boutique_returnAddress ? (
                      <div className="p-0.5 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-[7.5px] sm:text-sm text-blue-800 font-medium">
                          Return Address (Seller):
                        </p>
                        <p className="text-[7.5px] sm:text-sm text-blue-700 mt-1">
                          {product.seller.boutique_returnAddress?.name}<br />
                          {product.seller.boutique_returnAddress?.address}<br />
                          {product.seller.boutique_returnAddress?.city}, {product.seller.boutique_returnAddress?.state} {product.seller.boutique_returnAddress?.postalCode}<br />
                          {product.seller.boutique_returnAddress?.country}<br />
                          Phone: {product.seller.boutique_returnAddress?.phone}
                        </p>
                      </div>
                    ) : (
                      <div className="p-0.5 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-[7.5px] sm:text-sm text-yellow-800 font-medium">
                          ⚠️ Return Address Feature
                        </p>
                        <p className="text-[7.5px] sm:text-sm text-yellow-700 mt-1">
                          Return address system requires database migration. Run: npx prisma db push
                        </p>
                      </div>
                    )}

                    {/* Discrepancy Info */}
                    {product.shipment && (product.shipment.itemsMissing || product.shipment.itemsDamaged) && (
                      <div className="p-0.5 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-[7.5px] sm:text-sm text-orange-800 font-medium">
                          Discrepancies Reported:
                        </p>
                        <p className="text-[7.5px] sm:text-sm text-orange-700 mt-1">
                          Missing: {product.shipment.itemsMissing || 0}, 
                          Damaged: {product.shipment.itemsDamaged || 0}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1 sm:gap-2 flex-wrap pt-2 sm:pt-3 border-t border-gray-200">
                      {/* Send Email Button */}
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
                          setShowEmailModal(true)
                        }}
                        className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-lg text-[8px] sm:text-sm font-medium hover:bg-blue-700 transition"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Send Email</span>
                      </button>

                      {/* Return Item Button */}
                      <button
                        onClick={() => handleReturnItem(product)}
                        disabled={product.returnStatus !== 'none'}
                        title={
                          product.returnStatus === 'in_progress'
                            ? 'Return already in progress'
                            : product.returnStatus === 'completed'
                            ? 'Return completed'
                            : 'Create return shipment'
                        }
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-lg text-[8px] sm:text-sm font-medium transition ${
                          product.returnStatus === 'completed'
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : product.returnStatus === 'in_progress'
                            ? 'bg-yellow-500 text-white cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <span>
                          {product.returnStatus === 'completed'
                            ? 'Return Complete'
                            : product.returnStatus === 'in_progress'
                            ? 'Return Already in Progress'
                            : 'Return Item'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 sm:mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-[10px] sm:text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-[10px] sm:text-sm text-black">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-[10px] sm:text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-black">Send Return Email</h3>
                <p className="text-[10px] sm:text-sm text-black mt-1">
                  Notify {selectedProduct.seller.name} about the return and schedule a pickup date
                </p>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <label className="block text-[10px] sm:text-sm font-medium text-black mb-2">
                Pickup Date (within 7 days)
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={getMinReturnDate()}
                max={getMaxReturnDate()}
                aria-label="Pickup Date"
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-black text-[10px] sm:text-sm focus:ring-2 focus:ring-red-500"
              />
              <p className="text-[9px] sm:text-xs text-gray-500 mt-1">
                Seller must pick up within 7 days from today
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={sendReturnEmail}
                disabled={emailLoading || !returnDate}
                className="flex-1 bg-red-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Send Email
              </button>
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  setReturnDate('')
                }}
                className="flex-1 border border-gray-200 text-black px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
