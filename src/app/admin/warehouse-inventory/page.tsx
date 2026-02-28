'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Search,
  Package,
  _TrendingDown,
  Filter,
  Calendar,
  Loader,
  Eye,
  ArrowLeft,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface Product {
  id: string
  title: string
  slug: string
  basePrice: number
  salePrice: number | null
  displayPrice: number
  currency: string
  currentStock: number
  originalStock: number | null
  thumbnailUrl: string | null
  status: string
  warehouseReceivedAt: string | null
  warehouseLocation: string | null
  warehouseExpiresAt: string | null
  shipmentWarehouseAddress: any
  daysInWarehouse: number
  daysInCurrentCycle: number
  storageCycle: number
  daysUntilExpiry: number
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
  seller: {
    id: string
    name: string | null
    email: string
    displayName: string | null
  }
}

export default function AdminWarehouseInventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [salesHistoryPage, setSalesHistoryPage] = useState(0)
  const SALES_HISTORY_PAGE_SIZE = 10

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [productStatus, setProductStatus] = useState<'all' | 'LIVE' | 'OUT_OF_STOCK' | 'IN_RETURN' | 'RETURN_REQUESTED' | 'RETURN_SHIPPED' | 'RETURNED_TO_SELLER'>('all')
  const [stockStatus, setStockStatus] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (productStatus !== 'all') params.append('status', productStatus)
      if (stockStatus !== 'all') params.append('stockStatus', stockStatus)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const response = await fetch(`/api/admin/warehouse-inventory?${params}`)

      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to load warehouse inventory')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, productStatus, stockStatus, dateFrom, dateTo])

  useEffect(() => {
    if (status === 'loading') {
      return
    }
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (session?.user?.role !== 'ADMIN') {
      router.push('/admin')
      return
    }
    if (status === 'authenticated') {
      fetchProducts()
    }
  }, [status, router, session, fetchProducts])

  // Apply client-side filtering
  useEffect(() => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id.includes(searchTerm) ||
          p.seller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.seller.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      )
    }

    setFilteredProducts(filtered)
  }, [products, searchTerm])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return null
  }

  const lowStockCount = products.filter((p) => p.isLowStock).length
  const inMonth5Count = products.filter((p) => p.isInMonth5).length
  const outOfStockCount = products.filter((p) => p.currentStock === 0).length
  const totalValue = products.reduce(
    (sum, p) => sum + p.displayPrice * (p.currentStock || 0),
    0
  )

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Inventory</h1>
          <p className="text-gray-800 mt-2">
            Monitor all products in warehouse across all sellers
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-gray-800 text-sm">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {products.length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-gray-800 text-sm">Inventory Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ₦{(totalValue / 1000000).toFixed(1)}M
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-gray-800 text-sm">Low Stock (&le;5)</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {lowStockCount}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
            <p className="text-gray-800 text-sm">In Month 5</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {inMonth5Count}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <p className="text-gray-800 text-sm">Out of Stock</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {outOfStockCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Filter size={18} />
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

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search product, seller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Product Status */}
            <select
              value={productStatus}
              onChange={(e) =>
                setProductStatus(
                  e.target.value as 'all' | 'LIVE' | 'OUT_OF_STOCK' | 'IN_RETURN' | 'RETURN_REQUESTED' | 'RETURN_SHIPPED' | 'RETURNED_TO_SELLER'
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="LIVE">Live</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="IN_RETURN">In Return</option>
              <option value="RETURN_REQUESTED">Return Requested</option>
              <option value="RETURN_SHIPPED">Return Shipped</option>
              <option value="RETURNED_TO_SELLER">Returned to Seller</option>
            </select>

            {/* Stock Status */}
            <select
              value={stockStatus}
              onChange={(e) =>
                setStockStatus(
                  e.target.value as 'all' | 'in_stock' | 'out_of_stock'
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            {/* Date From */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-800 text-lg">
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
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-800 uppercase">
                      Product
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-800 uppercase hidden sm:table-cell">
                      Seller
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-800 uppercase">
                      Stock
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-800 uppercase">
                      Days In
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-800 uppercase">
                      Until
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-800 uppercase hidden md:table-cell">
                      Bin
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-800 uppercase">
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
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-[9px] sm:text-xs truncate">
                              {product.title}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 hidden sm:table-cell">
                        <div>
                          <p className="font-medium text-gray-900 text-[9px] sm:text-xs">
                            {product.seller.displayName || product.seller.name || 'Unknown'}
                          </p>
                          <p className="text-[8px] text-gray-700 hidden md:block">{product.seller.email.split('@')[0]}</p>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          {product.currentStock === 0 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-[9px] rounded font-medium">
                              Out
                            </span>
                          ) : product.isLowStock ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[9px] rounded font-medium">
                              {product.currentStock}
                            </span>
                          ) : (
                            <span className="text-gray-900 font-medium text-[9px] sm:text-xs">
                              {product.currentStock}/{product.originalStock || '?'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <span className="text-[9px] sm:text-xs text-gray-700">
                          {product.warehouseReceivedAt ? (
                            <>
                              {product.daysInCurrentCycle}/{181}
                              {product.storageCycle > 1 && <span className="ml-1 text-gray-700">(C{product.storageCycle})</span>}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <span
                          className={`font-medium text-[9px] sm:text-xs ${
                            product.warehouseExpiresAt && product.daysUntilExpiry <= 30
                              ? 'text-red-600'
                              : product.warehouseExpiresAt && product.daysUntilExpiry <= 60
                              ? 'text-orange-600'
                              : 'text-green-600'
                          }`}
                        >
                          {product.warehouseExpiresAt ? `${product.daysUntilExpiry}d` : '—'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 hidden md:table-cell">
                        <p className="text-[9px] sm:text-xs text-gray-600">
                          {product.warehouseLocation ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium text-[9px]">
                              {product.warehouseLocation}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[9px]">N/A</span>
                          )}
                        </p>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3">
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === product.id ? null : product.id)
                            setSalesHistoryPage(0)
                          }}
                          className="text-[9px] sm:text-xs text-primary hover:text-primary-dark font-medium"
                        >
                          {expandedId === product.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Details Modal */}
            {expandedId && filteredProducts.find((p) => p.id === expandedId) && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 md:p-6 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg">
                      Details for {filteredProducts.find((p) => p.id === expandedId)?.title}
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
                          {filteredProducts.find((p) => p.id === expandedId)?.condition || 'Not specified'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Location
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm break-words">
                          {filteredProducts.find((p) => p.id === expandedId)?.shipmentWarehouseAddress
                            ? (() => {
                                const addr = (filteredProducts.find((p) => p.id === expandedId)?.shipmentWarehouseAddress as any);
                                return `${addr.city || ''} ${addr.state || ''}`.trim() || 'N/A';
                              })()
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Received
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm break-words">
                          {filteredProducts.find((p) => p.id === expandedId)?.warehouseReceivedAt
                            ? new Date(
                                filteredProducts.find((p) => p.id === expandedId)?.warehouseReceivedAt || ''
                              ).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Status
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm">
                          {(() => {
                            const expandedProduct = filteredProducts.find((p) => p.id === expandedId);
                            if (!expandedProduct || !expandedProduct.status) return 'N/A';
                            const status = expandedProduct.status;
                            if (status === 'LIVE') return <span className="text-green-600 font-medium">Live</span>;
                            if (status === 'OUT_OF_STOCK') return <span className="text-red-600 font-medium">Out of Stock</span>;
                            if (status === 'IN_RETURN') return <span className="text-orange-600 font-medium">In Return</span>;
                            if (status === 'SHIPPED_BACK') return <span className="text-purple-600 font-medium">Shipped Back</span>;
                            if (status === 'RETURNED') return <span className="text-gray-600 font-medium">Returned</span>;
                            return status;
                          })()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Stock
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm break-words">
                          {(() => {
                            const expandedProduct = filteredProducts.find((p) => p.id === expandedId);
                            if (!expandedProduct) return 'N/A';
                            const current = expandedProduct.currentStock ?? 0;
                            const original = expandedProduct.originalStock || '?';
                            return `${current}/${original}`;
                          })()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Days In
                        </p>
                        <p className="text-gray-900 mt-1 text-xs sm:text-sm break-words">
                          {(() => {
                            const expandedProduct = filteredProducts.find((p) => p.id === expandedId);
                            if (!expandedProduct) return 'N/A';
                            return expandedProduct.warehouseReceivedAt
                              ? `${expandedProduct.daysInCurrentCycle}/181${expandedProduct.storageCycle > 1 ? ` (C${expandedProduct.storageCycle})` : ''}`
                              : 'N/A';
                          })()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Until Expiry
                        </p>
                        <p className={`mt-1 text-xs sm:text-sm break-words font-medium ${
                          (() => {
                            const expandedProduct = filteredProducts.find((p) => p.id === expandedId);
                            if (!expandedProduct || !expandedProduct.warehouseExpiresAt) return 'text-gray-600';
                            if (expandedProduct.daysUntilExpiry <= 30) return 'text-red-600';
                            if (expandedProduct.daysUntilExpiry <= 60) return 'text-orange-600';
                            return 'text-green-600';
                          })()
                        }`}>
                          {(() => {
                            const expandedProduct = filteredProducts.find((p) => p.id === expandedId);
                            if (!expandedProduct) return 'N/A';
                            if (!expandedProduct.warehouseExpiresAt) return 'N/A';
                            if (expandedProduct.daysUntilExpiry < 0) return 'Expired';
                            return `${expandedProduct.daysUntilExpiry}d`;
                          })()}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={(() => {
                        const expandedProduct = filteredProducts.find((p) => p.id === expandedId);
                        if (!expandedProduct) return '/admin/warehouse-inventory';
                        // All warehouse products go to admin detail page for unified view
                        if (expandedProduct.status === 'OUT_OF_STOCK') {
                          return `/admin/boutique/product-details/out-of-stock/${expandedId}`;
                        }
                        return `/admin/boutique/product-details/${expandedId}`;
                      })()}
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
                          ({filteredProducts.find((p) => p.id === expandedId)?.totalSold || 0} unit{(filteredProducts.find((p) => p.id === expandedId)?.totalSold || 0) !== 1 ? 's' : ''} sold)
                        </span>
                      </h4>
                      
                      {(filteredProducts.find((p) => p.id === expandedId)?.salesHistory?.length || 0) > 0 ? (
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
                              {(filteredProducts.find((p) => p.id === expandedId)?.salesHistory || [])
                                .slice(salesHistoryPage * SALES_HISTORY_PAGE_SIZE, (salesHistoryPage + 1) * SALES_HISTORY_PAGE_SIZE)
                                .map((sale: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-gray-900 text-xs">
                                    {new Date(sale.soldAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                                  </td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 font-medium text-gray-900 text-xs sm:text-sm">{sale.quantity}</td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-gray-700 text-xs hidden sm:table-cell">{sale.variantInfo || 'Std'}</td>
                                  <td className="px-2 py-1 sm:px-3 sm:py-2 text-gray-900 text-xs sm:text-sm">₦{(sale.price || 0).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {(filteredProducts.find((p) => p.id === expandedId)?.salesHistory || []).length > SALES_HISTORY_PAGE_SIZE && (
                            <div className="flex items-center justify-between p-2 border-t text-xs">
                              <span className="text-gray-600">
                                Page {salesHistoryPage + 1} of {Math.ceil((filteredProducts.find((p) => p.id === expandedId)?.salesHistory || []).length / SALES_HISTORY_PAGE_SIZE)}
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
                                  disabled={(salesHistoryPage + 1) * SALES_HISTORY_PAGE_SIZE >= (filteredProducts.find((p) => p.id === expandedId)?.salesHistory || []).length}
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
