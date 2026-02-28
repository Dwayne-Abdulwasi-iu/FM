'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Search,
  _AlertCircle,
  Package,
  _TrendingDown,
  Filter,
  Calendar,
  Eye,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { WarehouseReturnModal } from '@/components/boutique/warehouse-return-modal'
import { _getDaysInWarehouse } from '@/lib/boutique/warehouse'

interface Product {
  id: string
  title: string
  slug: string
  basePrice: number | null
  salePrice: number | null
  displayPrice: number | null
  currency: string
  currentStock: number | null
  originalStock: number | null
  thumbnailUrl: string | null
  status: string
  fullReturnEnabled: boolean
  returnStatus: string | null
  warehouseReceivedAt: string | null
  warehouseExpiresAt: string | null
  shipmentWarehouseAddress: any
  daysInWarehouse: number
  daysInCurrentCycle: number
  storageCycle: number
  daysUntilExpiry: number | null
  condition: string
  isLowStock: boolean
  isInMonth5: boolean
  totalSold: number
  salesHistory: Array<{
    quantity: number
    variantInfo: string
    soldAt: string
    price: number
  }>
}

export default function SellerWarehouseInventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [salesHistoryPage, setSalesHistoryPage] = useState(0)
  const SALES_HISTORY_PAGE_SIZE = 10
  
  // Debounce timer for search
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [stockStatus, setStockStatus] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
  const [productStatus, setProductStatus] = useState<'all' | 'LIVE' | 'OUT_OF_STOCK' | 'RETURNED'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (stockStatus !== 'all') params.append('stockStatus', stockStatus)
      if (productStatus !== 'all') params.append('status', productStatus)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      // Cancel previous request if pending
      if (abortController.current) {
        abortController.current.abort()
      }
      abortController.current = new AbortController()

      const response = await fetch(`/api/boutique/seller/warehouse-inventory?${params}`, {
        signal: abortController.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch (${response.status})`)
      }

      const data = await response.json().catch((err) => {
        console.error('Failed to parse response JSON:', err)
        return {}
      })
      if (!data.products || !Array.isArray(data.products)) {
        console.warn('Invalid response format, expected array of products')
        setProducts([])
      } else {
        setProducts(data.products)
      }
    } catch (error) {
      // Don't show error if request was aborted (user changed filters)
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Error fetching products:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load warehouse inventory'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, stockStatus, productStatus, dateFrom, dateTo])

  const handleProductRefresh = useCallback(() => {
    fetchProducts()
  }, [fetchProducts])

  // Memoize expanded product to avoid repeated finds
  const expandedProduct = useMemo(
    () => expandedId ? filteredProducts.find((p) => p.id === expandedId) : null,
    [expandedId, filteredProducts]
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      setSalesHistoryPage(0)
      
      // Debounce search requests - wait 300ms before fetching
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current)
      }
      
      searchDebounceTimer.current = setTimeout(() => {
        fetchProducts()
      }, searchTerm ? 300 : 0)  // Only debounce if searching
      
      return () => {
        if (searchDebounceTimer.current) {
          clearTimeout(searchDebounceTimer.current)
        }
      }
    }
  }, [status, router, fetchProducts, searchTerm, stockStatus, productStatus, dateFrom, dateTo])

  // Apply client-side filtering
  useEffect(() => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase())
          // Don't search by ID - UUID search is inefficient and not user-friendly
      )
    }

    setFilteredProducts(filtered)
    
    // Reset expanded product if it's not in filtered list anymore
    if (expandedId && !filtered.some(p => p.id === expandedId)) {
      setExpandedId(null)
      setSalesHistoryPage(0)
    }
  }, [products, searchTerm, expandedId])

  // Memoize stats to avoid recalculation on every render
  const stats = useMemo(
    () => ({
      lowStockCount: products.filter((p) => p.isLowStock).length,
      inMonth5Count: products.filter((p) => p.isInMonth5).length,
      outOfStockCount: products.filter((p) => p.status === 'OUT_OF_STOCK' || p.currentStock === 0 || p.currentStock === null).length,
    }),
    [products]
  )

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Warehouse Inventory</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Complete audit trail of all products in the warehouse, including live, out of stock, and returned items
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border-l-4 border-blue-500">
            <p className="text-gray-600 text-xs sm:text-sm">Total Products</p>
            <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1">
              {products.length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-xs sm:text-sm">Low Stock (&le;5 units)</p>
            <p className="text-xl sm:text-3xl font-bold text-yellow-600 mt-1">
              {stats.lowStockCount}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border-l-4 border-orange-500">
            <p className="text-gray-600 text-xs sm:text-sm">In Month 5</p>
            <p className="text-xl sm:text-3xl font-bold text-orange-600 mt-1">
              {stats.inMonth5Count}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border-l-4 border-red-500">
            <p className="text-gray-600 text-xs sm:text-sm">Out of Stock</p>
            <p className="text-xl sm:text-3xl font-bold text-red-600 mt-1">
              {stats.outOfStockCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <h2 className="font-bold text-sm sm:text-base text-gray-900 mb-3 sm:mb-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Filter size={16} />
              Filters
            </span>
            {(searchTerm || productStatus !== 'all' || stockStatus !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setProductStatus('all')
                  setStockStatus('all')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="text-xs text-primary hover:text-primary-dark font-medium"
              >
                Reset
              </button>
            )}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Product Status */}
            <select
              value={productStatus}
              onChange={(e) =>
                setProductStatus(
                  e.target.value as 'all' | 'LIVE' | 'OUT_OF_STOCK' | 'RETURNED'
                )
              }
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="LIVE">Live</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="RETURNED">Returned</option>
            </select>

            {/* Stock Status */}
            <select
              value={stockStatus}
              onChange={(e) =>
                setStockStatus(
                  e.target.value as 'all' | 'in_stock' | 'out_of_stock'
                )
              }
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            {/* Date From */}
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-12 text-center">
            <Package className="mx-auto text-gray-400 mb-3 sm:mb-4" size={36} />
            <p className="text-gray-600 text-sm sm:text-base">
              {products.length === 0
                ? 'No products in warehouse yet'
                : 'No products match your filters'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase">
                      Product
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase">
                      Stock
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase">
                      Price
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase">
                      Days In
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase">
                      Until
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase hidden md:table-cell">
                      Location
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className={`hover:bg-gray-50 transition text-[9px] sm:text-xs ${
                        product.isInMonth5 ? 'bg-orange-50' : ''
                      }`}
                    >
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          {product.thumbnailUrl && (
                            <div className="relative w-8 h-8 flex-shrink-0">
                              <Image
                                src={product.thumbnailUrl}
                                alt={product.title}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">
                              {product.title}
                            </p>
                            <p className="text-xs text-gray-500">{product.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        {product.returnStatus ? (
                          <>
                            {product.returnStatus === 'AWAITING_ADMIN_APPROVAL' && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[9px] rounded font-medium">
                                Awaiting Admin Approval for Return
                              </span>
                            )}
                            {product.returnStatus === 'RETURN_APPROVED' && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] rounded font-medium">
                                Return Approved
                              </span>
                            )}
                            {product.returnStatus === 'RETURN_IN_TRANSIT' && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[9px] rounded font-medium">
                                Return in Transit
                              </span>
                            )}
                            {product.returnStatus === 'RETURN_RECEIVED' && (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[9px] rounded font-medium">
                                Return Received
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {product.status === 'LIVE' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-[9px] rounded font-medium">
                                Live
                              </span>
                            )}
                            {product.status === 'IN_RETURN' && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[9px] rounded font-medium">
                                In Return
                              </span>
                            )}
                            {product.status === 'SHIPPED_BACK' && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[9px] rounded font-medium">
                                Shipped Back
                              </span>
                            )}
                            {product.status === 'OUT_OF_STOCK' && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-[9px] rounded font-medium">
                                Out of Stock
                              </span>
                            )}
                            {product.status === 'RETURNED' && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[9px] rounded font-medium">
                                Returned
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          {product.currentStock === 0 || product.currentStock === null ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-[9px] rounded font-medium">
                              Out
                            </span>
                          ) : product.isLowStock ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[9px] rounded font-medium">
                              {product.currentStock}
                            </span>
                          ) : (
                            <span className="text-gray-900 font-medium text-[9px] sm:text-xs">
                              {product.currentStock}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <p className="font-medium text-gray-900 text-[9px] sm:text-xs">
                          {product.displayPrice !== null ? `${product.displayPrice.toLocaleString()} ${product.currency}` : 'N/A'}
                        </p>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <span className="text-[9px] sm:text-xs text-gray-600">
                          {product.warehouseReceivedAt ? (
                            <>
                              {product.daysInCurrentCycle}/{181}
                              {product.storageCycle > 1 && <span className="ml-1 text-gray-500">(C{product.storageCycle})</span>}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <span
                          className={`font-medium text-[9px] sm:text-xs ${
                            product.warehouseExpiresAt && product.daysUntilExpiry !== null && product.daysUntilExpiry <= 30
                              ? 'text-red-600'
                              : product.warehouseExpiresAt && product.daysUntilExpiry !== null && product.daysUntilExpiry <= 60
                              ? 'text-orange-600'
                              : product.warehouseExpiresAt && product.daysUntilExpiry !== null && product.daysUntilExpiry < 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {product.warehouseExpiresAt && product.daysUntilExpiry !== null 
                            ? product.daysUntilExpiry < 0 
                              ? 'Expired'
                              : `${product.daysUntilExpiry}d`
                            : '—'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <p className="text-[9px] sm:text-xs text-gray-600">
                          {product.shipmentWarehouseAddress && typeof product.shipmentWarehouseAddress === 'object'
                            ? (() => {
                                const addr = product.shipmentWarehouseAddress as Record<string, any>
                                return `${addr.city || ''}, ${addr.state || ''}`.trim() || 'N/A'
                              })()
                            : 'N/A'}
                        </p>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <button
                          onClick={() => {
                            setExpandedId(product.id)
                            setSalesHistoryPage(0)
                          }}
                          className="text-[9px] sm:text-xs text-primary hover:text-primary-dark font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Details Modal */}
            {expandedId && expandedProduct && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 md:p-6 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg">
                      Details for {expandedProduct.title}
                    </h3>
                    <button
                      onClick={() => {
                        setExpandedId(null)
                        setSalesHistoryPage(0)
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                      aria-label="Close details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-3 sm:p-4 md:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Condition
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm break-words">
                          {expandedProduct.condition || 'Not specified'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Location
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm break-words">
                          {expandedProduct.shipmentWarehouseAddress && typeof expandedProduct.shipmentWarehouseAddress === 'object'
                            ? (() => {
                                const addr = expandedProduct.shipmentWarehouseAddress as Record<string, any>
                                return `${addr.city || ''} ${addr.state || ''}`.trim() || 'N/A'
                              })()
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Received
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm break-words">
                          {expandedProduct.warehouseReceivedAt
                            ? (() => {
                                const date = new Date(expandedProduct.warehouseReceivedAt)
                                return !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'Invalid date'
                              })()
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Status
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm">
                          {expandedProduct.returnStatus ? (
                            (() => {
                              if (expandedProduct.returnStatus === 'AWAITING_ADMIN_APPROVAL') return <span className="text-orange-600 font-medium">Awaiting Admin Approval</span>;
                              if (expandedProduct.returnStatus === 'RETURN_APPROVED') return <span className="text-blue-600 font-medium">Return Approved</span>;
                              if (expandedProduct.returnStatus === 'RETURN_IN_TRANSIT') return <span className="text-purple-600 font-medium">Return in Transit</span>;
                              if (expandedProduct.returnStatus === 'RETURN_RECEIVED') return <span className="text-indigo-600 font-medium">Return Received</span>;
                              return 'Unknown';
                            })()
                          ) : (
                            (() => {
                              if (expandedProduct.status === 'LIVE') return <span className="text-green-600 font-medium">Live</span>;
                              if (expandedProduct.status === 'IN_RETURN') return <span className="text-orange-600 font-medium">In Return</span>;
                              if (expandedProduct.status === 'SHIPPED_BACK') return <span className="text-purple-600 font-medium">Shipped Back</span>;
                              if (expandedProduct.status === 'OUT_OF_STOCK') return <span className="text-red-600 font-medium">Out of Stock</span>;
                              if (expandedProduct.status === 'RETURNED') return <span className="text-gray-600 font-medium">Returned</span>;
                              return 'Unknown';
                            })()
                          )}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={
                        // Internal seller product details for:
                        // - Return-related statuses (IN_RETURN, RETURNED, SHIPPED_BACK)
                        // - Out of stock products
                        // - Products in warehouse but not yet LIVE (RECEIVED_BY_ADMIN, VERIFICATION_PASSED, etc.)
                        ['IN_RETURN', 'RETURNED', 'SHIPPED_BACK', 'RETURN_REQUESTED', 'RETURN_SHIPPED', 'RETURNED_TO_SELLER', 'RECEIVED_BY_ADMIN', 'VERIFICATION_PASSED', 'CONTENT_APPROVED', 'SHIPPED_TO_ADMIN', 'PENDING_CONTENT_REVIEW', 'DRAFT'].includes(expandedProduct.status)
                          ? `/seller/boutique/product-details/${expandedProduct.id}`
                          : expandedProduct.status === 'OUT_OF_STOCK'
                          ? `/seller/boutique/product-details/out-of-stock/${expandedProduct.id}`
                          : // Only go to public boutique for LIVE products (use slug if available, fallback to ID)
                            `/boutique/${expandedProduct.slug || expandedProduct.id}`
                      }
                      className="text-primary-600 hover:text-primary-700 font-medium text-xs sm:text-sm flex items-center gap-1 mb-3"
                    >
                      <Eye size={14} />
                      View Product
                    </Link>

                    {/* Sales History */}
                    <div className="mt-3 border-t pt-3">
                      <h4 className="font-bold text-gray-900 mb-2 text-xs sm:text-sm">
                        Sales History
                        <span className="ml-2 text-xs font-normal text-gray-600">
                          ({expandedProduct.totalSold || 0} unit{(expandedProduct.totalSold || 0) !== 1 ? 's' : ''} sold)
                        </span>
                      </h4>
                      
                      {(expandedProduct.salesHistory && Array.isArray(expandedProduct.salesHistory) && expandedProduct.salesHistory.length > 0) ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-gray-300">
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-gray-600 uppercase">Qty</th>
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-gray-600 uppercase hidden sm:table-cell">Variant</th>
                                <th className="px-2 py-1 sm:px-3 sm:py-2 text-left text-xs font-medium text-gray-600 uppercase">Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(expandedProduct.salesHistory || [])
                                .slice(salesHistoryPage * SALES_HISTORY_PAGE_SIZE, (salesHistoryPage + 1) * SALES_HISTORY_PAGE_SIZE)
                                .map((sale: any, idx: number) => {
                                  const saleDate = sale?.soldAt ? new Date(sale.soldAt) : null
                                  const isValidDate = saleDate && !isNaN(saleDate.getTime())
                                  return (
                                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="px-2 py-1 sm:px-3 sm:py-2 text-gray-900 text-xs">
                          {isValidDate ? saleDate!.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'N/A'}
                        </td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 font-medium text-gray-900 text-xs sm:text-sm">{sale?.quantity || 0}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 text-gray-700 text-xs hidden sm:table-cell">{sale?.variantInfo || 'Std'}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 text-gray-900 text-xs sm:text-sm">₦{((sale?.price || 0)).toLocaleString()}</td>
                                </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                          {(expandedProduct.salesHistory || []).length > SALES_HISTORY_PAGE_SIZE && (
                            <div className="flex items-center justify-between p-2 border-t text-xs">
                              <span className="text-gray-600">
                                Page {salesHistoryPage + 1} of {Math.ceil((expandedProduct.salesHistory || []).length / SALES_HISTORY_PAGE_SIZE)}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setSalesHistoryPage(Math.max(0, salesHistoryPage - 1))}
                                  disabled={salesHistoryPage === 0}
                                  className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Prev
                                </button>
                                <button
                                  onClick={() => setSalesHistoryPage(salesHistoryPage + 1)}
                                  disabled={(salesHistoryPage + 1) * SALES_HISTORY_PAGE_SIZE >= (expandedProduct.salesHistory || []).length}
                                  className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs sm:text-sm py-2">No sales yet</p>
                      )}
                    </div>

                    {/* Return from Warehouse Button */}
                    {expandedProduct.warehouseReceivedAt && expandedProduct.status !== 'OUT_OF_STOCK' && (
                      <div className="mt-4 pt-4 border-t">
                        {expandedProduct.fullReturnEnabled || ['AWAITING_ADMIN_APPROVAL', 'RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED'].includes(expandedProduct.returnStatus || '') ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="text-xl">✓</div>
                              <div>
                                <p className="text-sm font-semibold text-blue-900">
                                  {expandedProduct.returnStatus === 'AWAITING_ADMIN_APPROVAL'
                                    ? 'Return Pending Admin Review'
                                    : expandedProduct.returnStatus === 'RETURN_APPROVED'
                                    ? 'Return Approved'
                                    : expandedProduct.returnStatus === 'RETURN_IN_TRANSIT'
                                    ? 'Return in Transit'
                                    : expandedProduct.returnStatus === 'RETURN_RECEIVED'
                                    ? 'Return Received'
                                    : 'Return in Progress'}
                                </p>
                                <p className="text-xs text-blue-700 mt-1.5">
                                  {expandedProduct.returnStatus === 'AWAITING_ADMIN_APPROVAL'
                                    ? 'Your return request is pending admin review. You will be notified when a decision is made.'
                                    : expandedProduct.returnStatus === 'RETURN_APPROVED'
                                    ? 'Your return has been approved by admin. Please prepare the product for shipment.'
                                    : expandedProduct.returnStatus === 'RETURN_IN_TRANSIT'
                                    ? 'Your return is in transit. We will confirm receipt shortly.'
                                    : expandedProduct.returnStatus === 'RETURN_RECEIVED'
                                    ? 'Your return has been received and is being processed.'
                                    : 'Your return request is being processed. You cannot submit another return request at this time.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <WarehouseReturnModal
                              productId={expandedProduct?.id || ''}
                              productTitle={expandedProduct?.title || ''}
                              daysInWarehouse={expandedProduct?.daysInWarehouse || 0}
                              onSuccess={handleProductRefresh}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Request to return this product from the warehouse. Admin fee applies based on storage duration.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
