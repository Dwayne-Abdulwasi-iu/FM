'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatNGNPrice } from '@/lib/currency'
import { Package, Truck, Clock, CheckCircle, AlertTriangle, ChevronRight, Plus, Search } from 'lucide-react'

interface Product {
  id: string
  title: string
  thumbnailUrl: string | null
  status: string
  submittedAt: string | null
  basePrice: number
}

interface Shipment {
  id: string
  status: string
  courier: string
  trackingNumber: string
  estimatedArrival: string | null
  createdAt: string
  receivedAt: string | null
}

interface ProductWithShipment extends Product {
  shipment?: Shipment | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: Clock },
  PENDING_CONTENT_REVIEW: { label: 'Awaiting Review', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  CONTENT_APPROVED: { label: 'Ship to Warehouse', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: Truck },
  SHIPPED_TO_ADMIN: { label: 'In Transit', color: 'text-purple-700', bgColor: 'bg-purple-50', icon: Truck },
  RECEIVED_BY_ADMIN: { label: 'At Warehouse', color: 'text-indigo-700', bgColor: 'bg-indigo-50', icon: Package },
  VERIFICATION_PASSED: { label: 'Verified', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  LIVE: { label: 'Live', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: AlertTriangle },
}

export default function SellerShipmentIndexPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Boutique prices are stored in NGN — no conversion needed
  const [products, setProducts] = useState<ProductWithShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('CONTENT_APPROVED')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchProducts()
  }, [session, status, statusFilter])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Fetch products that need shipping or are in transit
      const res = await fetch(`/api/boutique/seller/products?status=${statusFilter}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Count products by status that need shipping action
  const needsShipping = products.filter(p => p.status === 'CONTENT_APPROVED').length
  const inTransit = products.filter(p => p.status === 'SHIPPED_TO_ADMIN').length

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <Link href="/seller/boutique" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-2 sm:mb-4 text-xs sm:text-sm">
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 rotate-180" />
            Back to Products
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Ship to Warehouse</h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-base">
                Manage shipments of your approved products
              </p>
            </div>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div 
            onClick={() => setStatusFilter('CONTENT_APPROVED')}
            className={`p-3 sm:p-4 rounded-lg sm:rounded-xl cursor-pointer transition ${
              statusFilter === 'CONTENT_APPROVED' 
                ? 'bg-blue-100 border-2 border-blue-500' 
                : 'bg-white border-2 border-transparent hover:border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-500 rounded-lg">
                <Truck className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{needsShipping}</p>
                <p className="text-[10px] sm:text-sm text-gray-600">Ready to Ship</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('SHIPPED_TO_ADMIN')}
            className={`p-3 sm:p-4 rounded-lg sm:rounded-xl cursor-pointer transition ${
              statusFilter === 'SHIPPED_TO_ADMIN' 
                ? 'bg-purple-100 border-2 border-purple-500' 
                : 'bg-white border-2 border-transparent hover:border-purple-200'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-500 rounded-lg">
                <Package className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{inTransit}</p>
                <p className="text-[10px] sm:text-sm text-gray-600">In Transit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-6 sm:p-12 text-center">
            <Package className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-semibold text-gray-900 mb-2">
              {statusFilter === 'CONTENT_APPROVED' 
                ? 'No products ready to ship' 
                : 'No products in transit'}
            </h3>
            <p className="text-xs sm:text-base text-gray-500 mb-4 sm:mb-6">
              {statusFilter === 'CONTENT_APPROVED'
                ? 'Products will appear here after admin content approval'
                : 'Products you ship will appear here until received'}
            </p>
            <Link
              href="/seller/boutique/upload"
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-purple-700 transition text-sm"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Upload New</span> Product
            </Link>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredProducts.map((product) => {
              const statusConfig = STATUS_CONFIG[product.status] || STATUS_CONFIG.DRAFT
              const StatusIcon = statusConfig.icon
              
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
                >
                  <div className="p-3 sm:p-4 flex gap-3 sm:gap-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={product.thumbnailUrl || '/images/placeholder.png'}
                        alt={product.title}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                            {product.title}
                          </h3>
                          <p className="text-purple-600 font-medium text-xs sm:text-sm">
                            {formatNGNPrice(product.basePrice)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span className="hidden xs:inline">{statusConfig.label}</span>
                        </span>
                      </div>

                      {/* Shipment Info */}
                      {product.shipment && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs sm:text-sm">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-600">
                            <span><strong>Courier:</strong> {product.shipment.courier}</span>
                            <span className="hidden sm:inline"><strong>Tracking:</strong> {product.shipment.trackingNumber}</span>
                            {product.shipment.estimatedArrival && (
                              <span className="hidden md:inline"><strong>ETA:</strong> {formatDate(product.shipment.estimatedArrival)}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action */}
                      <div className="mt-2 sm:mt-3">
                        {product.status === 'CONTENT_APPROVED' ? (
                          <Link
                            href={`/seller/boutique/ship/${product.id}`}
                            className="inline-flex items-center gap-1.5 sm:gap-2 bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition"
                          >
                            <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Enter</span> Shipping<span className="hidden sm:inline"> Details</span>
                          </Link>
                        ) : product.status === 'SHIPPED_TO_ADMIN' ? (
                          <Link
                            href={`/seller/boutique/ship/${product.id}`}
                            className="inline-flex items-center gap-1 sm:gap-2 text-purple-600 hover:text-purple-700 text-xs sm:text-sm font-medium"
                          >
                            View<span className="hidden xs:inline"> Shipment</span> Details
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 sm:mt-8 bg-purple-50 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <h3 className="font-semibold text-purple-900 mb-2 sm:mb-3 text-sm sm:text-base">Shipping Guidelines</h3>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-purple-700">
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="w-4 h-4 sm:w-5 sm:h-5 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-bold text-purple-800">1</span>
              <span>Package your item securely to prevent damage</span>
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="w-4 h-4 sm:w-5 sm:h-5 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-bold text-purple-800">2</span>
              <span>Use a reliable courier with tracking</span>
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="w-4 h-4 sm:w-5 sm:h-5 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-bold text-purple-800">3</span>
              <span>Ship within 7 days to avoid cancellation</span>
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="w-4 h-4 sm:w-5 sm:h-5 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-bold text-purple-800">4</span>
              <span>Enter tracking details once shipped</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
