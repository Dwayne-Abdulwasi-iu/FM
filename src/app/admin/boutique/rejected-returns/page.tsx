'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ProductImage } from '@/components/ProductImage'

interface Seller {
  id: string
  name: string
  email: string
}

interface ReturnProduct {
  id: string
  title: string
  status: string
  thumbnailUrl: string | null
  basePrice: number
  rejectionReason: string | null
  createdAt: string
  seller: Seller
  shipment?: {
    id: string
    status: string
    createdAt: string
    itemsExpected?: number
    itemsReceived?: number
    disputeNotes?: string | null
  }
}

export default function AdminRejectedReturnsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<ReturnProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as { role?: string }).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchReturnsInProgress()
  }, [session, status, router])

  const fetchReturnsInProgress = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/boutique/admin/rejected-returns?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
        setTotalPages(data.totalPages || 1)
      } else if (res.status === 404) {
        // Endpoint not yet implemented - will show empty state
        setProducts([])
        setTotalPages(1)
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
      toast.error('Failed to load returns')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchReturnsInProgress()
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      'RETURN_IN_PROGRESS': {
        color: 'bg-yellow-100 text-yellow-700',
        icon: Clock,
        label: 'In Progress',
      },
      'SELLER_RECEIVED': {
        color: 'bg-blue-100 text-blue-700',
        icon: Package,
        label: 'Seller Received',
      },
      'ADMIN_CONFIRMED': {
        color: 'bg-purple-100 text-purple-700',
        icon: CheckCircle,
        label: 'Verified',
      },
      'RETURNED_SUCCESSFUL': {
        color: 'bg-green-100 text-green-700',
        icon: CheckCircle,
        label: 'Completed',
      },
    }
    return configs[status] || configs['RETURN_IN_PROGRESS']
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
            <Package className="w-5 h-5 sm:w-8 sm:h-8 text-purple-600" />
            <div>
              <h1 className="text-lg sm:text-3xl font-bold text-black">Rejected Products - Return Tracking</h1>
              <p className="text-[10px] sm:text-base text-black">
                {products.length} products in return workflow
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-2.5 sm:p-4 mb-3 sm:mb-6">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product title, seller name, or ID..."
                className="w-full pl-7 sm:pl-10 pr-2.5 sm:pr-4 py-1.5 sm:py-2 border rounded-lg text-black bg-white focus:ring-2 focus:ring-purple-500 text-[11px] sm:text-sm placeholder-gray-500"
              />
            </div>
          </form>
        </div>

        {/* Products List */}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-12 text-center">
            <Package className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-black mb-1 sm:mb-2">No Returns In Progress</h3>
            <p className="text-[11px] sm:text-base text-black">
              {searchQuery ? 'Try adjusting your filters' : 'No rejected products are being returned'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-4">
            {products.map((product) => {
              const statusConfig = getStatusConfig(product.status)
              const StatusIcon = statusConfig.icon
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Collapsible Header */}
                  <button
                    onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
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
                          <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${statusConfig.color} flex-shrink-0`}>
                            <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {statusConfig.label}
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
                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-[8px] sm:text-sm">
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
                        <div>
                          <p className="text-black font-semibold text-[7px] sm:text-xs">Status</p>
                          <p className="text-black text-[7.5px] sm:text-xs mt-1">{statusConfig.label}</p>
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

                      {/* Shipment Info */}
                      {product.shipment && (
                        <div className="p-0.5 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-[7.5px] sm:text-sm text-blue-800 font-medium">
                            Shipment Status
                          </p>
                          <div className="mt-2 space-y-1 text-[7.5px] sm:text-sm text-blue-700">
                            <p><strong>ID:</strong> {product.shipment.id.substring(0, 12)}...</p>
                            <p><strong>Status:</strong> {product.shipment.status}</p>
                            <p><strong>Created:</strong> {formatDate(product.shipment.createdAt)}</p>
                            {product.shipment.itemsExpected && (
                              <p><strong>Items Expected:</strong> {product.shipment.itemsExpected}</p>
                            )}
                            {product.shipment.itemsReceived !== undefined && (
                              <p><strong>Items Received:</strong> {product.shipment.itemsReceived}</p>
                            )}
                            {product.shipment.disputeNotes && (
                              <p><strong>Notes:</strong> {product.shipment.disputeNotes}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Status Flow Indicator */}
                      <div className="p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-[7.5px] sm:text-sm text-purple-800 font-medium mb-2">
                          Return Flow
                        </p>
                        <div className="flex items-center gap-1 sm:gap-2 text-[7px] sm:text-xs">
                          <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${product.status === 'RETURN_IN_PROGRESS' || ['SELLER_RECEIVED', 'ADMIN_CONFIRMED', 'RETURNED_SUCCESSFUL'].includes(product.status) ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                            1
                          </div>
                          <span className="text-gray-400">→</span>
                          <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${['SELLER_RECEIVED', 'ADMIN_CONFIRMED', 'RETURNED_SUCCESSFUL'].includes(product.status) ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                            2
                          </div>
                          <span className="text-gray-400">→</span>
                          <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${['ADMIN_CONFIRMED', 'RETURNED_SUCCESSFUL'].includes(product.status) ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                            3
                          </div>
                          <span className="text-gray-400">→</span>
                          <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${product.status === 'RETURNED_SUCCESSFUL' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                            4
                          </div>
                        </div>
                        <p className="text-[7px] sm:text-xs text-gray-600 mt-2">
                          1: In Progress → 2: Seller Received → 3: Verified → 4: Complete
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
    </div>
  )
}

