'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Package,
  _Truck,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  _ImageIcon,
  _Trash2,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Product {
  id: string
  title: string
  thumbnailUrl: string | null
  basePrice: number
  variants?: Array<{
    id: string
    size: string | null
    color: string | null
    colorHex: string | null
    quantity: number
    priceAdjustment: number
    sku: string | null
  }>
}

interface VariantDiscrepancy {
  id: string
  shipmentId: string
  variantId: string
  quantityExpected: number
  quantityReceived: number | null
  quantityDamaged: number | null
  quantityMissing: number | null
  condition: string | null
  notes: string | null
  acceptanceStatus: string
  unitsAccepted: number | null
  unitsReturning: number | null
  createdAt: string
  updatedAt: string
  variant: {
    id: string
    size: string | null
    color: string | null
    colorHex: string | null
    quantity: number
    priceAdjustment: number
    sku: string | null
    product: {
      id: string
      title: string
      thumbnailUrl: string | null
    }
  }
}

interface Shipment {
  id: string
  status: string
  carrier: string
  trackingNumber: string
  estimatedArrival: string | null
  shippedAt: string | null
  receiptVerifiedAt: string | null
  createdAt: string
  notes: string | null
  itemsExpected: number
  itemsReceived: number | null
  itemsMissing: number | null
  itemsDamaged: number | null
  hasDiscrepancy: boolean
  disputeStatus: string | null
  disputeNotes: string | null
  receiptPhotos: string[]
  productIds: string[]
  seller: {
    id: string
    name: string
    email: string
  }
  products?: Product[]
  product?: Product
  variantDiscrepancies?: VariantDiscrepancy[]
}

function formatCurrency(price: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(price)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ShipmentDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const shipmentId = params.id as string

  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false)
  const [discrepancyType, setDiscrepancyType] = useState<'damaged' | 'incomplete' | 'wrong'>('damaged')
  const [discrepancyForm, setDiscrepancyForm] = useState({
    itemsReceived: 0,
    itemsDamaged: 0,
    damagedItemName: '',
    damagedItemLocation: '',
    damagedItemNotes: '',
    damagedItems: [] as Array<{ name: string; location: string; notes: string }>,
    photos: [] as string[],
    video: '',
    otherNotes: '',
  })
  
  // Confirmation modals
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Variant discrepancy decision states
  const [variantDecisions, setVariantDecisions] = useState<Record<string, {
    status: 'ACCEPTED' | 'RETURNING' | 'PARTIAL' | null
    unitsAccepted?: number
    unitsReturning?: number
    notes?: string
    rejectionCategory?: string
    loading?: boolean
  }>>({})
  const [showPartialModal, setShowPartialModal] = useState<string | null>(null)
  const [partialForm, setPartialForm] = useState({ unitsAccepted: 0, unitsReturning: 0, notes: '', rejectionCategory: '' })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as any).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchShipment()
  }, [session, status, shipmentId])

  const fetchShipment = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/boutique/admin/shipments/${shipmentId}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched shipment:', data.shipment)
        setShipment(data.shipment)
      } else {
        toast.error('Failed to load shipment')
        router.back()
      }
    } catch (error) {
      console.error('Error fetching shipment:', error)
      toast.error('Error loading shipment')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string, data: any = {}) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/boutique/admin/shipments/${shipmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      })

      const result = await res.json()
      if (res.ok) {
        toast.success(result.message || 'Action completed')
        fetchShipment()
      } else {
        toast.error(result.message || 'Action failed')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVariantDecision = async (variantId: string, acceptanceStatus: 'ACCEPTED' | 'RETURNING' | 'PARTIAL') => {
    const decision = variantDecisions[variantId]
    if (!decision) return

    setVariantDecisions(prev => ({
      ...prev,
      [variantId]: { ...decision, loading: true }
    }))

    try {
      const payload: any = { 
        acceptanceStatus,
        notes: decision.notes || undefined,
        rejectionCategory: decision.rejectionCategory || undefined
      }
      
      if (acceptanceStatus === 'PARTIAL') {
        if (!decision.unitsAccepted || !decision.unitsReturning) {
          toast.error('Please specify accepted and returning units')
          setVariantDecisions(prev => ({
            ...prev,
            [variantId]: { ...decision, loading: false }
          }))
          return
        }
        payload.unitsAccepted = decision.unitsAccepted
        payload.unitsReturning = decision.unitsReturning
      }

      const res = await fetch(`/api/boutique/admin/shipments/${shipmentId}/variant-discrepancies/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (res.ok) {
        toast.success(`Variant marked as ${acceptanceStatus}`)
        setVariantDecisions(prev => ({
          ...prev,
          [variantId]: { status: null, loading: false }
        }))
        setShowPartialModal(null)
        fetchShipment()
      } else {
        toast.error(result.message || 'Failed to update variant')
        setVariantDecisions(prev => ({
          ...prev,
          [variantId]: { ...decision, loading: false }
        }))
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred')
      setVariantDecisions(prev => ({
        ...prev,
        [variantId]: { ...decision, loading: false }
      }))
    }
  }


  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          <Link href="/admin/boutique/shipments" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-[10px] sm:text-sm mb-4">
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            Back to Shipments
          </Link>
          <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
            <h2 className="text-lg sm:text-2xl font-bold text-black mb-2">Shipment Not Found</h2>
            <p className="text-[10px] sm:text-base text-black">The shipment you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  const products = shipment.products || (shipment.product ? [shipment.product] : [])

  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-6">
        {/* Header */}
        <Link href="/admin/boutique/shipments" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-3 sm:mb-4 text-[10px] sm:text-sm">
          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          Back to Shipments
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-black">Shipment Details</h1>
              <p className="text-[10px] sm:text-sm text-black mt-1">ID: {shipmentId}</p>
            </div>
            <span className={`px-2 sm:px-3 py-1 sm:py-2 rounded-full text-[9px] sm:text-xs font-medium ${
              shipment.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
              shipment.status === 'DISCREPANCY' ? 'bg-orange-100 text-orange-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {shipment.status}
            </span>
          </div>

          {/* Seller Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b">
            <div>
              <p className="text-[10px] sm:text-sm text-black font-medium mb-0.5 sm:mb-1">Seller</p>
              <p className="text-[11px] sm:text-base text-black flex items-center gap-1">
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                {shipment.seller.name}
              </p>
              <p className="text-[10px] sm:text-sm text-black mt-0.5">{shipment.seller.email}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-black font-medium mb-0.5 sm:mb-1">Shipped Date</p>
              <p className="text-[11px] sm:text-base text-black flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                {shipment.shippedAt ? formatDate(shipment.shippedAt) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b">
            <div>
              <p className="text-[10px] sm:text-sm text-black font-medium mb-0.5 sm:mb-1">Courier</p>
              <p className="text-[11px] sm:text-base text-black">{shipment.carrier}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-black font-medium mb-0.5 sm:mb-1">Tracking Number</p>
              <p className="text-[11px] sm:text-base font-mono text-black">{shipment.trackingNumber}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-black font-medium mb-0.5 sm:mb-1">Estimated Arrival</p>
              <p className="text-[11px] sm:text-base text-black">
                {shipment.shippedAt ? formatDate(new Date(new Date(shipment.shippedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-black font-medium mb-0.5 sm:mb-1">Received Date</p>
              <p className="text-[11px] sm:text-base text-black">{shipment.receiptVerifiedAt ? formatDate(shipment.receiptVerifiedAt) : 'Pending'}</p>
            </div>
          </div>

          {/* Items Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b">
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <p className="text-[9px] sm:text-xs text-black font-medium">Expected</p>
              <p className="text-sm sm:text-lg font-bold text-black">{shipment.itemsExpected || products.length}</p>
            </div>
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <p className="text-[9px] sm:text-xs text-black font-medium">Received</p>
              <p className="text-sm sm:text-lg font-bold text-black">{shipment.itemsReceived ?? '—'}</p>
            </div>
            <div className="bg-orange-50 p-2 sm:p-3 rounded-lg">
              <p className="text-[9px] sm:text-xs text-orange-800 font-medium">Missing</p>
              <p className="text-sm sm:text-lg font-bold text-orange-800">{shipment.itemsMissing ?? '—'}</p>
            </div>
            <div className="bg-red-50 p-2 sm:p-3 rounded-lg">
              <p className="text-[9px] sm:text-xs text-red-800 font-medium">Damaged</p>
              <p className="text-sm sm:text-lg font-bold text-red-800">{shipment.itemsDamaged ?? '—'}</p>
            </div>
          </div>

          {/* Products */}
          <div className="mb-4 sm:mb-6">
            <p className="text-[10px] sm:text-sm text-black font-medium mb-2 sm:mb-3">Products in Shipment</p>
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="flex gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {product.thumbnailUrl ? (
                      <img
                        src={product.thumbnailUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[10px] sm:text-sm font-semibold text-black">{product.title}</h3>
                    <p className="text-[9px] sm:text-xs text-black mt-0.5">{formatCurrency(product.basePrice)}</p>
                    {(product as any).variants && (product as any).variants.length > 0 && (
                      <p className="text-[9px] sm:text-xs text-gray-600 mt-1">{(product as any).variants.length} variant(s)</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variant Discrepancies */}
          {shipment.variantDiscrepancies && shipment.variantDiscrepancies.length > 0 && (
            <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-[10px] sm:text-sm text-blue-800 font-medium mb-2 sm:mb-3">Variant-Level Discrepancies</p>
              <div className="space-y-2">
                {shipment.variantDiscrepancies.map((discrepancy: any) => (
                  <div key={discrepancy.id} className="p-2 sm:p-3 bg-white rounded border border-blue-100">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <p className="text-[9px] sm:text-xs font-semibold text-black">
                          {discrepancy.variant.product.title}
                          {discrepancy.variant.size && ` - Size: ${discrepancy.variant.size}`}
                          {discrepancy.variant.color && ` - Color: ${discrepancy.variant.color}`}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] sm:text-xs font-medium flex-shrink-0 ${
                        discrepancy.acceptanceStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        discrepancy.acceptanceStatus === 'RETURNING' ? 'bg-red-100 text-red-800' :
                        discrepancy.acceptanceStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {discrepancy.acceptanceStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[9px] sm:text-xs text-black mt-2">
                      <div>Expected: <span className="font-semibold">{discrepancy.quantityExpected}</span></div>
                      {discrepancy.quantityReceived !== null && <div>Received: <span className="font-semibold">{discrepancy.quantityReceived}</span></div>}
                      {discrepancy.quantityDamaged !== null && <div>Damaged: <span className="font-semibold text-red-600">{discrepancy.quantityDamaged}</span></div>}
                      {discrepancy.quantityMissing !== null && <div>Missing: <span className="font-semibold text-orange-600">{discrepancy.quantityMissing}</span></div>}
                    </div>
                    {discrepancy.acceptanceStatus === 'PARTIAL' && (
                      <div className="grid grid-cols-2 gap-1 text-[9px] sm:text-xs text-black mt-1">
                        {discrepancy.unitsAccepted !== null && <div>Accepting: <span className="font-semibold text-green-600">{discrepancy.unitsAccepted}</span></div>}
                        {discrepancy.unitsReturning !== null && <div>Returning: <span className="font-semibold text-red-600">{discrepancy.unitsReturning}</span></div>}
                      </div>
                    )}
                    {discrepancy.notes && (
                      <p className="text-[9px] sm:text-xs text-gray-600 mt-1 italic">{discrepancy.notes}</p>
                    )}
                    
                    {/* Decision Controls */}
                    {discrepancy.acceptanceStatus === 'PENDING' && (
                      <div className="mt-3 pt-3 border-t border-blue-100">
                        <div className="mb-3">
                          <label className="text-[8px] sm:text-xs text-black font-medium block mb-1">Decision Notes (optional)</label>
                          <textarea
                            value={variantDecisions[discrepancy.id]?.notes || ''}
                            onChange={(e) => {
                              setVariantDecisions(prev => ({
                                ...prev,
                                [discrepancy.id]: { 
                                  ...prev[discrepancy.id], 
                                  notes: e.target.value 
                                }
                              }))
                            }}
                            placeholder="e.g., 'Items damaged in transit', 'Quality below standard'"
                            rows={2}
                            aria-label="Decision Notes"
                            className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm"
                          />
                          <p className="text-[8px] sm:text-xs text-gray-600 mt-1">Seller will receive this explanation in their notification</p>
                        </div>

                        <div className="mb-3">
                          <label className="text-[8px] sm:text-xs text-black font-medium block mb-1">Rejection Category (if rejecting)</label>
                          <select
                            value={variantDecisions[discrepancy.id]?.rejectionCategory || ''}
                            onChange={(e) => {
                              setVariantDecisions(prev => ({
                                ...prev,
                                [discrepancy.id]: { 
                                  ...prev[discrepancy.id], 
                                  rejectionCategory: e.target.value
                                }
                              }))
                            }}
                            className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm"
                          >
                            <option value="">Select reason (optional)</option>
                            <option value="DAMAGED">Damaged/Defective</option>
                            <option value="QUANTITY_MISMATCH">Quantity Mismatch</option>
                            <option value="QUALITY">Quality Below Standard</option>
                            <option value="WRONG_PRODUCT">Wrong Product</option>
                            <option value="MISSING">Missing Items</option>
                          </select>
                        </div>

                        <p className="text-[8px] sm:text-xs text-gray-600 mb-2">Decision:</p>
                        <div className="flex flex-wrap gap-1 items-center">
                          <button
                            onClick={() => {
                              setVariantDecisions(prev => ({
                                ...prev,
                                [discrepancy.id]: { status: 'ACCEPTED', loading: false }
                              }))
                              handleVariantDecision(discrepancy.id, 'ACCEPTED')
                            }}
                            disabled={variantDecisions[discrepancy.id]?.loading}
                            className="px-2 sm:px-3 py-1 text-[8px] sm:text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded font-medium transition"
                          >
                            {variantDecisions[discrepancy.id]?.loading ? 'Processing...' : 'Accept All'}
                          </button>
                          <button
                            onClick={() => {
                              setVariantDecisions(prev => ({
                                ...prev,
                                [discrepancy.id]: { status: 'RETURNING', loading: false }
                              }))
                              handleVariantDecision(discrepancy.id, 'RETURNING')
                            }}
                            disabled={variantDecisions[discrepancy.id]?.loading}
                            className="px-2 sm:px-3 py-1 text-[8px] sm:text-xs bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded font-medium transition"
                          >
                            {variantDecisions[discrepancy.id]?.loading ? 'Processing...' : 'Return All'}
                          </button>
                          <button
                            onClick={() => {
                              setShowPartialModal(discrepancy.id)
                              setPartialForm({
                                unitsAccepted: Math.max(0, discrepancy.quantityReceived || 0),
                                unitsReturning: 0,
                                notes: '',
                                rejectionCategory: ''
                              })
                              setVariantDecisions(prev => ({
                                ...prev,
                                [discrepancy.id]: { 
                                  status: 'PARTIAL',
                                  unitsAccepted: discrepancy.quantityReceived || 0,
                                  unitsReturning: 0
                                }
                              }))
                            }}
                            disabled={variantDecisions[discrepancy.id]?.loading}
                            className="px-2 sm:px-3 py-1 text-[8px] sm:text-xs bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded font-medium transition"
                          >
                            Partial Split
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Decision Button for Decided Variants */}
                    {discrepancy.acceptanceStatus !== 'PENDING' && (
                      <div className="mt-3 pt-3 border-t border-blue-100">
                        <button
                          onClick={() => {
                            setVariantDecisions(prev => ({
                              ...prev,
                              [discrepancy.id]: { 
                                status: 'PENDING', 
                                loading: false,
                                notes: '' 
                              }
                            }))
                          }}
                          className="px-2 sm:px-3 py-1 text-[8px] sm:text-xs bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition"
                        >
                          ✎ Edit Decision
                        </button>
                        <p className="text-[8px] sm:text-xs text-gray-600 mt-2">Current: <span className="font-semibold">{discrepancy.acceptanceStatus}</span></p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partial Decision Modal */}
          {showPartialModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
              <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full">
                <h3 className="text-sm sm:text-lg font-bold text-black mb-3 sm:mb-4">Partial Acceptance Decision</h3>
                
                {(() => {
                  const discrepancy = shipment?.variantDiscrepancies?.find((d: any) => d.id === showPartialModal)
                  const received = discrepancy?.quantityReceived || 0
                  return (
                    <div className="space-y-3 sm:space-y-4">
                      <p className="text-[9px] sm:text-xs text-gray-600">
                        Total received: <span className="font-semibold text-black">{received} units</span>
                      </p>
                      
                      <div>
                        <label className="text-[9px] sm:text-xs text-black font-medium block mb-1">Units to Accept</label>
                        <input
                          type="number"
                          min="0"
                          max={received}
                          value={partialForm.unitsAccepted}
                          onChange={(e) => {
                            const val = Math.min(parseInt(e.target.value) || 0, received)
                            setPartialForm(prev => ({ ...prev, unitsAccepted: val }))
                            setVariantDecisions(prev => ({
                              ...prev,
                              [showPartialModal]: { status: 'PARTIAL', unitsAccepted: val, unitsReturning: received - val }
                            }))
                          }}
                          aria-label="Units to Accept"
                          className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] sm:text-xs text-black font-medium block mb-1">Units to Return</label>
                        <input
                          type="number"
                          min="0"
                          value={received - partialForm.unitsAccepted}
                          disabled
                          aria-label="Units to Return"
                          className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm bg-gray-50"
                        />
                        <p className="text-[8px] sm:text-xs text-gray-600 mt-1">Auto-calculated: {received} - {partialForm.unitsAccepted} = {received - partialForm.unitsAccepted}</p>
                      </div>

                      {partialForm.unitsAccepted + (received - partialForm.unitsAccepted) !== received && (
                        <p className="text-[9px] sm:text-xs text-red-600">⚠️ Total must equal {received}</p>
                      )}

                      <div>
                        <label className="text-[9px] sm:text-xs text-black font-medium block mb-1">Decision Notes (optional)</label>
                        <textarea
                          value={partialForm.notes}
                          onChange={(e) => {
                            setPartialForm(prev => ({ ...prev, notes: e.target.value }))
                            if (showPartialModal) {
                              setVariantDecisions(prev => ({
                                ...prev,
                                [showPartialModal]: { 
                                  ...prev[showPartialModal], 
                                  notes: e.target.value 
                                }
                              }))
                            }
                          }}
                          placeholder="e.g., '10 units have water damage, 10 units are intact'"
                          rows={3}
                          aria-label="Decision Notes"
                          className="w-full border border-gray-300 rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm"
                        />
                        <p className="text-[8px] sm:text-xs text-gray-600 mt-1">Seller will receive this in their notification email</p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setShowPartialModal(null)
                            setVariantDecisions(prev => {
                              const newDecisions = { ...prev }
                              delete newDecisions[showPartialModal]
                              return newDecisions
                            })
                          }}
                          className="flex-1 px-3 py-2 text-[9px] sm:text-xs bg-gray-300 hover:bg-gray-400 text-black rounded font-medium transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            handleVariantDecision(showPartialModal, 'PARTIAL')
                          }}
                          disabled={variantDecisions[showPartialModal]?.loading}
                          className="flex-1 px-3 py-2 text-[9px] sm:text-xs bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded font-medium transition"
                        >
                          {variantDecisions[showPartialModal]?.loading ? 'Processing...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}


          {/* Discrepancy Info */}
          {shipment.hasDiscrepancy && (
            <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-[10px] sm:text-sm text-orange-800 font-medium flex items-center gap-1 mb-2 sm:mb-3">
                <AlertTriangle className="w-4 h-4" />
                Discrepancy Detected
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[9px] sm:text-xs text-orange-800 mb-2 sm:mb-3">
                {shipment.itemsMissing !== undefined && <p>Missing: {shipment.itemsMissing}</p>}
                {shipment.itemsDamaged !== undefined && <p>Damaged: {shipment.itemsDamaged}</p>}
                {shipment.itemsReceived !== undefined && <p>Received: {shipment.itemsReceived}</p>}
              </div>
              {shipment.disputeStatus && (
                <p className="text-[9px] sm:text-xs text-orange-700 mb-1">
                  <span className="font-semibold">Status:</span> {shipment.disputeStatus}
                </p>
              )}
              {shipment.disputeNotes && (
                <div className="mt-2 p-2 bg-white rounded text-[9px] sm:text-xs text-orange-800">
                  <p className="font-semibold mb-1">Issue Details:</p>
                  <p>{shipment.disputeNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Receipt Photos */}
          {shipment.receiptPhotos && shipment.receiptPhotos.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <p className="text-[10px] sm:text-sm text-black font-medium mb-2 sm:mb-3">Receipt Photos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {shipment.receiptPhotos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Receipt ${index + 1}`}
                    className="w-full h-24 sm:h-32 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {shipment.notes && (
            <div className="mb-4 sm:mb-6 p-2 sm:p-3 bg-blue-50 rounded-lg">
              <p className="text-[10px] sm:text-sm text-black font-medium mb-1">Notes</p>
              <p className="text-[10px] sm:text-sm text-black">{shipment.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 sm:pt-6 border-t">
            {(shipment.status === 'IN_TRANSIT' || shipment.status === 'DELIVERED' || shipment.status === 'SHIPPED') && !shipment.hasDiscrepancy ? (
              <button
                onClick={() => setShowApproveConfirm(true)}
                disabled={actionLoading}
                className="flex items-center gap-1 sm:gap-2 bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                Confirm Receipt
              </button>
            ) : null}
            {shipment.hasDiscrepancy && shipment.status !== 'RECEIVED' && (
              <>
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-1 sm:gap-2 bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  Approve & Go Live
                </button>
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-1 sm:gap-2 bg-red-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  Reject
                </button>
              </>
            )}
            <button
              onClick={() => {
                setDiscrepancyForm({
                  itemsReceived: shipment.itemsReceived || shipment.itemsExpected,
                  itemsDamaged: 0,
                  damagedItemName: '',
                  damagedItemLocation: '',
                  damagedItemNotes: '',
                  damagedItems: [],
                  photos: [],
                  video: '',
                  otherNotes: '',
                })
                setShowDiscrepancyModal(true)
              }}
              disabled={actionLoading}
              className="flex items-center gap-1 sm:gap-2 bg-orange-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              Report Issue
            </button>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 sm:gap-2 border border-gray-200 text-black px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Discrepancy Modal */}
        {showDiscrepancyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50 overflow-hidden">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full h-auto max-h-[85vh] flex flex-col">
              <div className="p-4 sm:p-6 border-b flex-shrink-0 bg-white">
                <h2 className="text-lg sm:text-2xl font-bold text-black">Report Discrepancy</h2>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
                {/* Discrepancy Type Selection */}
                <div>
                  <p className="text-sm font-medium text-black mb-2 sm:mb-3">Issue Type</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <button
                      onClick={() => setDiscrepancyType('incomplete')}
                      className={`p-2 sm:p-3 rounded-lg border-2 text-center transition ${
                        discrepancyType === 'incomplete'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-[10px] sm:text-xs font-medium text-black">Incomplete</p>
                      <p className="text-[8px] sm:text-[10px] text-gray-600 mt-0.5">Missing items</p>
                    </button>
                    <button
                      onClick={() => setDiscrepancyType('damaged')}
                      className={`p-2 sm:p-3 rounded-lg border-2 text-center transition ${
                        discrepancyType === 'damaged'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-[10px] sm:text-xs font-medium text-black">Damaged</p>
                      <p className="text-[8px] sm:text-[10px] text-gray-600 mt-0.5">Damaged items</p>
                    </button>
                    <button
                      onClick={() => setDiscrepancyType('wrong')}
                      className={`p-2 sm:p-3 rounded-lg border-2 text-center transition ${
                        discrepancyType === 'wrong'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-[10px] sm:text-xs font-medium text-black">Wrong Item</p>
                      <p className="text-[8px] sm:text-[10px] text-gray-600 mt-0.5">Color, size, etc</p>
                    </button>
                  </div>
                </div>

                {/* Incomplete Form */}
                {discrepancyType === 'incomplete' && (
                  <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <div>
                      <label className="text-[10px] sm:text-sm font-medium text-black block mb-1.5">
                        Items Received (Expected: {shipment?.itemsExpected})
                      </label>
                      <input
                        type="number"
                        placeholder="Enter number of items received"
                        value={discrepancyForm.itemsReceived}
                        onChange={(e) =>
                          setDiscrepancyForm({
                            ...discrepancyForm,
                            itemsReceived: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        max={shipment?.itemsExpected}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-black bg-white text-[10px] sm:text-sm"
                      />
                      <p className="text-[9px] sm:text-xs text-blue-700 mt-1">
                        Missing: {Math.max(0, (shipment?.itemsExpected || 0) - discrepancyForm.itemsReceived)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Damaged Form */}
                {discrepancyType === 'damaged' && (
                  <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-orange-50 rounded-lg">
                    <div>
                      <label className="text-[10px] sm:text-sm font-medium text-black block mb-1.5">
                        Number of Damaged Items
                      </label>
                      <input
                        type="number"
                        placeholder="Enter number of damaged items"
                        value={discrepancyForm.itemsDamaged}
                        onChange={(e) =>
                          setDiscrepancyForm({
                            ...discrepancyForm,
                            itemsDamaged: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-black bg-white text-[10px] sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-sm font-medium text-black block mb-1.5">
                        Damaged Item Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Blue T-Shirt"
                        value={discrepancyForm.damagedItemName}
                        onChange={(e) =>
                          setDiscrepancyForm({
                            ...discrepancyForm,
                            damagedItemName: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-black bg-white text-[10px] sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-sm font-medium text-black block mb-1.5">
                        Damage Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Right sleeve, seam"
                        value={discrepancyForm.damagedItemLocation}
                        onChange={(e) =>
                          setDiscrepancyForm({
                            ...discrepancyForm,
                            damagedItemLocation: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-black bg-white text-[10px] sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-sm font-medium text-black block mb-1.5">
                        Damage Notes
                      </label>
                      <textarea
                        placeholder="Describe the damage..."
                        value={discrepancyForm.damagedItemNotes}
                        onChange={(e) =>
                          setDiscrepancyForm({
                            ...discrepancyForm,
                            damagedItemNotes: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-black bg-white text-[10px] sm:text-sm h-16 sm:h-20"
                      />
                    </div>
                  </div>
                )}

                {/* Wrong Item Form */}
                {discrepancyType === 'wrong' && (
                  <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-red-50 rounded-lg">
                    <div>
                      <label className="text-[10px] sm:text-sm font-medium text-black block mb-1.5">
                        Issue Details
                      </label>
                      <textarea
                        placeholder="Describe the issue (e.g., Wrong color sent - ordered blue, received red. Wrong size - ordered M, received S. etc.)"
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-black bg-white text-[10px] sm:text-sm h-20 sm:h-24"
                        value={discrepancyForm.otherNotes}
                        onChange={(e) =>
                          setDiscrepancyForm({
                            ...discrepancyForm,
                            otherNotes: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Notes for all types */}
                <div>
                  <label className="text-[10px] sm:text-sm font-medium text-black block mb-1.5">
                    Additional Notes
                  </label>
                  <textarea
                    placeholder="Any other information..."
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg text-black bg-white text-[10px] sm:text-sm h-16 sm:h-20"
                    value={discrepancyForm.otherNotes}
                    onChange={(e) =>
                      setDiscrepancyForm({
                        ...discrepancyForm,
                        otherNotes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Action Buttons - Outside scroll area */}
              <div className="p-4 sm:p-6 border-t flex-shrink-0 bg-white flex gap-2">
                  <button
                    onClick={() => {
                      const submitData: any = {
                        type: discrepancyType,
                      }
                      
                      // Include itemsReceived for incomplete type
                      if (discrepancyType === 'incomplete' && discrepancyForm.itemsReceived > 0) {
                        submitData.itemsReceived = discrepancyForm.itemsReceived
                      }
                      
                      // Include itemsDamaged for damaged type with details
                      if (discrepancyType === 'damaged' && discrepancyForm.itemsDamaged > 0) {
                        submitData.itemsDamaged = discrepancyForm.itemsDamaged
                        
                        // Include detailed damage information
                        if (discrepancyForm.damagedItemName.trim() || discrepancyForm.damagedItemLocation.trim() || discrepancyForm.damagedItemNotes.trim()) {
                          submitData.damageDetails = {
                            name: discrepancyForm.damagedItemName,
                            location: discrepancyForm.damagedItemLocation,
                            notes: discrepancyForm.damagedItemNotes,
                          }
                        }
                      }
                      
                      // Include any additional notes
                      if (discrepancyForm.otherNotes.trim()) {
                        submitData.notes = discrepancyForm.otherNotes
                      }
                      
                      handleAction('markDiscrepancy', submitData)
                      setShowDiscrepancyModal(false)
                    }}
                    disabled={actionLoading}
                    className="flex-1 bg-orange-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                  >
                    Report Issue
                  </button>
                  <button
                    onClick={() => setShowDiscrepancyModal(false)}
                    className="flex-1 border border-gray-200 text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
              </div>
            </div>
          </div>
        )}

        {/* Approve Confirmation Modal */}
        {showApproveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-black">Confirm Approval</h3>
                  <p className="text-[10px] sm:text-sm text-black mt-1">Are you sure you want to approve this shipment and mark products as ready for live? This action cannot be undone.</p>
                </div>
              </div>
              
              {shipment?.hasDiscrepancy && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-[10px] sm:text-xs font-medium text-yellow-800">⚠️ Note: This shipment has discrepancies:</p>
                  <p className="text-[10px] sm:text-xs text-yellow-700 mt-1">
                    Missing: {shipment.itemsMissing}, Damaged: {shipment.itemsDamaged}
                  </p>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    handleAction('confirmReceiptWithDiscrepancy')
                    setShowApproveConfirm(false)
                  }}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Approve & Go Live
                </button>
                <button
                  onClick={() => setShowApproveConfirm(false)}
                  className="flex-1 border border-gray-200 text-black px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Confirmation Modal */}
        {showRejectConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-black">Reject Shipment</h3>
                  <p className="text-[10px] sm:text-sm text-black mt-1">Please provide a reason for rejection. The seller will be notified and can schedule a pickup within 7 days.</p>
                </div>
              </div>

              {shipment?.hasDiscrepancy && (
                <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-[10px] sm:text-xs font-medium text-orange-800">Discrepancies reported:</p>
                  <p className="text-[10px] sm:text-xs text-orange-700 mt-1">
                    Missing: {shipment.itemsMissing}, Damaged: {shipment.itemsDamaged}
                  </p>
                </div>
              )}
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg text-[10px] sm:text-sm text-black placeholder-gray-400 focus:ring-2 focus:ring-red-500 mb-4 sm:mb-6 min-h-24"
              />

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    if (!rejectReason.trim()) {
                      toast.error('Please provide a rejection reason')
                      return
                    }
                    handleAction('rejectShipment', { reason: rejectReason })
                    setShowRejectConfirm(false)
                    setRejectReason('')
                  }}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="flex-1 bg-red-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Reject & Notify Seller
                </button>
                <button
                  onClick={() => {
                    setShowRejectConfirm(false)
                    setRejectReason('')
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
    </div>
  )
}
