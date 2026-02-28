'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import _Image from 'next/image'
import Link from 'next/link'
import { 
  Package, Truck, Search, Filter, ChevronLeft, ChevronRight,
  Clock, CheckCircle, XCircle, AlertTriangle, Eye,
  User, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Seller {
  id: string
  name: string
  email: string
}

interface Product {
  id: string
  title: string
  thumbnailUrl: string | null
  basePrice: number
}

interface Shipment {
  id: string
  status: string
  courier: string
  trackingNumber: string
  estimatedArrival: string | null
  shippedAt: string | null
  receivedAt: string | null
  createdAt: string
  notes: string | null
  itemsExpected: number
  itemsReceived: number | null
  itemsMissing: number | null
  itemsDamaged: number | null
  hasDiscrepancy: boolean
  receiptPhotos: string[]
  seller: Seller
  products?: Product[]
  product?: Product
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  IN_TRANSIT: { label: 'In Transit', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-indigo-700', bgColor: 'bg-indigo-50', icon: Package },
  RECEIVED: { label: 'Received', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  DISCREPANCY: { label: 'Discrepancy', color: 'text-orange-700', bgColor: 'bg-orange-50', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
}

export default function AdminShipmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  
  // Receive form state
  const [receiveForm, setReceiveForm] = useState({
    itemsReceived: 1,
    itemsMissing: 0,
    itemsDamaged: 0,
    notes: '',
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as any).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchShipments()
  }, [session, status, page, statusFilter])

  const fetchShipments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/boutique/admin/shipments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setShipments(data.shipments || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchShipments()
  }

  const openReceiveModal = (shipment: Shipment) => {
    setSelectedShipment(shipment)
    setReceiveForm({
      itemsReceived: shipment.itemsExpected,
      itemsMissing: 0,
      itemsDamaged: 0,
      notes: '',
    })
    setShowReceiveModal(true)
  }

  const confirmReceipt = async () => {
    if (!selectedShipment) return

    try {
      const res = await fetch(`/api/boutique/admin/shipments/${selectedShipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive',
          ...receiveForm,
        }),
      })

      if (res.ok) {
        toast.success('Shipment received!')
        setShowReceiveModal(false)
        fetchShipments()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to confirm receipt')
      }
    } catch (_error) {
      toast.error('Failed to confirm receipt')
    }
  }

  const confirmReceiptWithDiscrepancy = async (shipmentId: string) => {
    try {
      const res = await fetch(`/api/boutique/admin/shipments/${shipmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirmReceiptWithDiscrepancy',
        }),
      })

      if (res.ok) {
        toast.success('Shipment received with noted discrepancy!')
        fetchShipments()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to confirm receipt')
      }
    } catch (_error) {
      toast.error('Failed to confirm receipt')
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

  // Count by status - include discrepancy shipments that still need confirmation
  const pendingCount = shipments.filter(s => 
    s.status === 'IN_TRANSIT' || 
    s.status === 'DELIVERED' || 
    (s.status === 'DISCREPANCY' && s.hasDiscrepancy)
  ).length

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
            <Truck className="w-5 h-5 sm:w-8 sm:h-8 text-purple-600" />
            <div>
              <h1 className="text-lg sm:text-3xl font-bold text-black">Incoming Shipments</h1>
              <p className="text-[10px] sm:text-base text-black">
                {pendingCount} awaiting receipt
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
                  placeholder="Search by Shipment ID, Tracking #, Seller, or Product ID..."
                  className="w-full pl-7 sm:pl-10 pr-2.5 sm:pr-4 py-1.5 sm:py-2 border rounded-lg text-black bg-white focus:ring-2 focus:ring-purple-500 text-[11px] sm:text-sm placeholder-gray-500"
                />
              </div>
            </form>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Filter className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-black bg-white focus:ring-2 focus:ring-purple-500 text-[11px] sm:text-sm"
                aria-label="Filter by shipment status"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Awaiting Receipt</option>
                <option value="RECEIVED">Received</option>
                <option value="DISCREPANCY">Discrepancy</option>
              </select>
            </div>
          </div>
        </div>

        {/* Shipments List */}
        {shipments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-12 text-center">
            <Truck className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-black mb-1 sm:mb-2">No shipments found</h3>
            <p className="text-[11px] sm:text-base text-black">
              {statusFilter || searchQuery
                ? 'Try adjusting your filters'
                : 'Shipments will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-4">
            {shipments.map((shipment) => {
              const statusConfig = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.PENDING
              const StatusIcon = statusConfig.icon
              const needsAction = shipment.status === 'DELIVERED' || shipment.status === 'IN_TRANSIT' || (shipment.status === 'DISCREPANCY' && shipment.hasDiscrepancy)
              const product = shipment.products?.[0] || shipment.product
              
              if (!product) return null
              
              return (
                <div
                  key={shipment.id}
                  className={`bg-white rounded-lg shadow-sm overflow-hidden ${needsAction ? 'ring-2 ring-purple-200' : ''}`}
                >
                  <div className="p-1.5 sm:p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-4">
                      {/* Product Image */}
                      <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
                        {product.thumbnailUrl && product.thumbnailUrl.trim() ? (
                          <img
                            src={product.thumbnailUrl}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                        )}
                      </div>

                      {/* Shipment Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 mb-0.5 sm:mb-2">
                          <div>
                            <h3 className="font-semibold text-black text-[10px] sm:text-base leading-tight">
                              {product.title}
                            </h3>
                            <p className="text-[9px] sm:text-sm text-black mt-0">
                              {formatCurrency(product.basePrice)}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} flex-shrink-0`}>
                            <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span className="hidden xs:inline">{statusConfig.label}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0.5 sm:gap-3 text-[8px] sm:text-sm">
                          <div>
                            <p className="text-black font-semibold text-[7px] sm:text-xs">Seller</p>
                            <p className="text-black flex items-center gap-0.5 truncate mt-0 text-[7.5px] sm:text-xs">
                              <User className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate text-[7.5px] sm:text-xs">{shipment.seller.name}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-black font-semibold text-[7px] sm:text-xs">Courier</p>
                            <p className="text-black text-[7.5px] sm:text-xs mt-0">{shipment.courier}</p>
                          </div>
                          <div>
                            <p className="text-black font-semibold text-[7px] sm:text-xs">Tracking</p>
                            <p className="font-mono text-black text-[7px] sm:text-xs mt-0">{shipment.trackingNumber}</p>
                          </div>
                          <div>
                            <p className="text-black font-semibold text-[7px] sm:text-xs">ETA</p>
                            <p className="text-black flex items-center gap-0.5 mt-0 text-[7.5px] sm:text-xs">
                              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {shipment.shippedAt ? formatDate(new Date(new Date(shipment.shippedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Discrepancy Info */}
                        {shipment.hasDiscrepancy && (
                          <div className="mt-0.5 sm:mt-2 p-0.5 sm:p-3 bg-orange-50 rounded-lg">
                            <p className="text-[7.5px] sm:text-sm text-black font-medium">
                              <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                              Discrepancy: {shipment.itemsMissing} missing, {shipment.itemsDamaged} damaged
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-1 sm:mt-3 flex gap-1 sm:gap-2 flex-wrap">
                          {(shipment.status === 'IN_TRANSIT' || shipment.status === 'DELIVERED') && !shipment.hasDiscrepancy && (
                            <button
                              onClick={() => openReceiveModal(shipment)}
                              className="flex items-center gap-1 sm:gap-2 bg-purple-600 text-white px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-lg text-[8px] sm:text-sm font-medium hover:bg-purple-700 transition"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                          )}
                          {shipment.hasDiscrepancy && shipment.status !== 'RECEIVED' && (
                            <button
                              onClick={() => confirmReceiptWithDiscrepancy(shipment.id)}
                              className="flex items-center gap-1 sm:gap-2 bg-green-600 text-white px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-lg text-[8px] sm:text-sm font-medium hover:bg-green-700 transition"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Confirm (with discrepancy)</span>
                            </button>
                          )}
                          <Link
                            href={`/admin/boutique/shipments/${shipment.id}`}
                            className="flex items-center gap-1 sm:gap-2 border border-gray-200 px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-lg text-[8px] sm:text-sm font-medium text-black hover:bg-gray-50 transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 sm:px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="text-xs sm:text-base text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 sm:px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Receive Modal */}
      {showReceiveModal && selectedShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-base sm:text-xl font-bold text-gray-900">Confirm Receipt</h2>
              <p className="text-xs sm:text-base text-gray-600 mt-0.5 sm:mt-1 truncate">
                {selectedShipment.product?.title || 'Product'}
              </p>
            </div>
            
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-[10px] sm:text-sm text-gray-600">Expected Items</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{selectedShipment.itemsExpected}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <label htmlFor="itemsReceived" className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                    Received
                  </label>
                  <input
                    id="itemsReceived"
                    type="number"
                    value={receiveForm.itemsReceived}
                    onChange={(e) => setReceiveForm({ ...receiveForm, itemsReceived: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-2 sm:px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="itemsMissing" className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                    Missing
                  </label>
                  <input
                    id="itemsMissing"
                    type="number"
                    value={receiveForm.itemsMissing}
                    onChange={(e) => setReceiveForm({ ...receiveForm, itemsMissing: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-2 sm:px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="itemsDamaged" className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                    Damaged
                  </label>
                  <input
                    id="itemsDamaged"
                    type="number"
                    value={receiveForm.itemsDamaged}
                    onChange={(e) => setReceiveForm({ ...receiveForm, itemsDamaged: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-2 sm:px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>

              {(receiveForm.itemsMissing > 0 || receiveForm.itemsDamaged > 0) && (
                <div className="p-2 sm:p-3 bg-orange-50 rounded-lg">
                  <p className="text-[10px] sm:text-sm text-orange-800 flex items-center gap-1 sm:gap-2">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                    This will flag as discrepancy
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Notes about condition..."
                  className="w-full px-2 sm:px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 px-3 sm:px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReceipt}
                  className="flex-1 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
