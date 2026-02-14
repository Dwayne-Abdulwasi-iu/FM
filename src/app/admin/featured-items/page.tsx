'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Star,
  Trash2,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ShoppingBag,
  DollarSign,
} from 'lucide-react'

interface FeaturedItem {
  id: string
  itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT'
  itemId: string
  title: string
  imageUrl?: string
  price: number
  slug?: string
  seller: {
    id: string
    name?: string
    email: string
    subscriptionTier?: string
  }
  position: number
  addedAt: string
  addedByAdmin?: boolean
}

export default function AdminFeaturedItemsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [items, setItems] = useState<FeaturedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const [filters, setFilters] = useState({
    itemType: '',
    search: '',
    sort: 'addedAt',
    sortOrder: 'desc',
    priceSort: '',
    ownership: '',
    addedByAdmin: ''
  })
  const [showFilters, setShowFilters] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [status, session?.user?.role, router])

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort: filters.sort,
        sortOrder: filters.sortOrder,
        ...(filters.itemType && { itemType: filters.itemType }),
        ...(filters.search && { search: filters.search }),
        ...(filters.priceSort && { priceSort: filters.priceSort }),
        ...(filters.ownership && { ownership: filters.ownership }),
        ...(filters.addedByAdmin && { addedByAdmin: filters.addedByAdmin }),
      })

      const res = await fetch(`/api/admin/featured-items?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setItems(data.items)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching items:', error)
      toast.error('Failed to load featured items')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleDelete = async (itemId: string, itemType: 'DESIGN' | 'BOUTIQUE_PRODUCT') => {
    if (!window.confirm('Remove from featured? This cannot be undone.')) return

    try {
      setDeletingId(itemId)
      const res = await fetch(`/api/admin/featured-items?id=${itemId}&itemType=${itemType}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete')

      toast.success('Item removed from featured')
      fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to remove item')
    } finally {
      setDeletingId(null)
    }
  }

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'STARTER':
        return 'bg-blue-100 text-blue-800'
      case 'PRO':
        return 'bg-purple-100 text-purple-800'
      case 'VIP':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading') return <div className="p-8">Loading...</div>
  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') return null

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-1.5 sm:mb-2">
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900">Featured Items</h1>
              <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">Manage promoted items</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{pagination.total}</div>
              <div className="text-[9px] sm:text-xs text-gray-600">items</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-2 sm:mb-3 p-2 sm:p-3">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 sm:left-2.5 top-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value })
                  setPagination({ ...pagination, page: 1 })
                }}
                className="w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1 sm:py-1.5 text-[11px] sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1 sm:p-1.5 border rounded-lg flex-shrink-0 transition-colors ${
                showFilters
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              title="Toggle advanced filters"
            >
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-3 pt-1.5 sm:pt-2 border-t border-gray-200">
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Item Type</label>
                <select
                  value={filters.itemType}
                  onChange={(e) => {
                    setFilters({ ...filters, itemType: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Filter by item type"
                >
                  <option value="">All Items</option>
                  <option value="DESIGN">🎨 Designs</option>
                  <option value="BOUTIQUE_PRODUCT">👗 Products</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Added By</label>
                <select
                  value={filters.addedByAdmin}
                  onChange={(e) => {
                    setFilters({ ...filters, addedByAdmin: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Filter by who added to featured"
                >
                  <option value="">All Contributors</option>
                  <option value="admin">👨‍💼 Admin Only</option>
                  <option value="seller">👤 Seller Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Ownership</label>
                <select
                  value={filters.ownership}
                  onChange={(e) => {
                    setFilters({ ...filters, ownership: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Filter by ownership"
                >
                  <option value="">All Ownership</option>
                  <option value="DESIGN">Regular Designs</option>
                  <option value="BOUTIQUE_PRODUCT">Boutique Products</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Price Sort</label>
                <select
                  value={filters.priceSort}
                  onChange={(e) => {
                    setFilters({ ...filters, priceSort: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Sort by price"
                >
                  <option value="">No Price Sort</option>
                  <option value="highest">💰 Highest Price</option>
                  <option value="lowest">💵 Lowest Price</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Sort By</label>
                <select
                  value={filters.sort}
                  onChange={(e) => {
                    setFilters({ ...filters, sort: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Sort items"
                >
                  <option value="addedAt">📅 Date Published</option>
                  <option value="position">⭐ Position</option>
                  <option value="sales">📊 Sales</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-0.5">Order</label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setFilters({ ...filters, sortOrder: 'desc' })
                      setPagination({ ...pagination, page: 1 })
                    }}
                    className={`flex-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                      filters.sortOrder === 'desc'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⬇️ Desc
                  </button>
                  <button
                    onClick={() => {
                      setFilters({ ...filters, sortOrder: 'asc' })
                      setPagination({ ...pagination, page: 1 })
                    }}
                    className={`flex-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                      filters.sortOrder === 'asc'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⬆️ Asc
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-2 sm:p-4 text-center text-[11px] sm:text-sm text-gray-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-2 sm:p-4 text-center text-gray-500">
              <Star className="h-6 w-6 sm:h-10 sm:w-10 mx-auto mb-1.5 sm:mb-2 opacity-50" />
              <p className="text-[11px] sm:text-sm">No featured items</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-center text-[9px] sm:text-xs font-medium text-gray-700 uppercase">⭐</th>
                      <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-gray-700 uppercase">Item</th>
                      <th className="hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-gray-700 uppercase">Seller</th>
                      <th className="hidden lg:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-gray-700 uppercase">Tier</th>
                      <th className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-gray-700 uppercase">Price</th>
                      <th className="hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[9px] sm:text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-right text-[9px] sm:text-xs font-medium text-gray-700 uppercase">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-center">
                          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mx-auto" fill="currentColor" />
                        </td>
                        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2">
                          <div className="flex items-center gap-2">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.title}
                                width={32}
                                height={32}
                                className="h-6 w-6 sm:h-8 sm:w-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0 cursor-pointer hover:opacity-70">
                              <a
                                href={item.itemType === 'DESIGN' ? `/designs/${item.itemId}?admin=true` : `/boutique/${item.slug || item.itemId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block font-medium text-gray-900 truncate max-w-[100px] sm:max-w-xs text-[10px] sm:text-sm hover:text-blue-600 hover:underline"
                              >
                                {item.title}
                              </a>
                              <div className="text-[8px] sm:text-xs text-gray-600">{item.itemType === 'DESIGN' ? '🎨' : '👗'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] sm:text-xs font-medium">
                            {item.itemType === 'DESIGN' ? (
                              <>
                                <ImageIcon className="h-3 w-3" /> Design
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="h-3 w-3" /> Product
                              </>
                            )}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-[9px] sm:text-xs truncate">{item.seller.name || 'Unknown'}</div>
                            <div className="text-[8px] sm:text-[9px] text-gray-600 truncate">{item.seller.email}</div>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-3 py-1.5 sm:py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-medium ${getTierBadge(item.seller.subscriptionTier)}`}>
                            {item.seller.subscriptionTier || 'Free'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2">
                          <div className="flex items-center gap-0.5">
                            <DollarSign className="h-3 w-3 text-gray-400" />
                            <span className="font-medium text-[9px] sm:text-xs text-black">${item.price.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-xs text-gray-600">
                          {new Date(item.addedAt).toLocaleDateString()}
                        </td>
                        <td className="px-1.5 sm:px-2 py-1.5 sm:py-2 text-right">
                          <button
                            onClick={() => handleDelete(item.id, item.itemType)}
                            disabled={deletingId === item.id}
                            className="p-0.5 sm:p-1 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-50"
                            title="Remove from featured"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-1.5 sm:px-3 py-1.5 sm:py-2 border-t border-gray-200 flex items-center justify-between gap-1.5 flex-wrap">
                <div className="text-[9px] sm:text-xs text-gray-600">
                  {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
                </div>
                <div className="flex gap-0.5 sm:gap-1">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="p-0.5 sm:p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    aria-label="Previous page"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const pageNum = Math.max(1, pagination.page - 2) + i
                      if (pageNum > pagination.pages) return null
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination({ ...pagination, page: pageNum })}
                          className={`px-1.5 py-0.5 rounded-lg text-[9px] sm:text-xs ${
                            pageNum === pagination.page
                              ? 'bg-purple-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <span className="text-[9px] sm:text-xs text-gray-600 flex items-center px-0.5 sm:px-1.5">
                    {pagination.page}/{pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.pages}
                    className="p-0.5 sm:p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    aria-label="Next page"
                    title="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
