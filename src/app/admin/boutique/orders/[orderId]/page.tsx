'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Package, ChevronLeft, Truck, AlertCircle,
  User, MapPin, Phone, Mail, Copy, ExternalLink,
  Banknote, Send
} from 'lucide-react'
import toast from 'react-hot-toast'

interface OrderItem {
  id: string
  quantity: number
  price: number
  finalPrice: number
  variantSnapshot: { size?: string; color?: string } | null
  product: {
    id: string
    title: string
    thumbnailUrl: string | null
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  fulfillmentMethod: string
  subtotal: number
  discount: number
  shippingCost: number
  platformFee: number
  sellerPayout: number | null
  total: number
  currency: string
  trackingNumber: string | null
  trackingUrl: string | null
  paymentReference: string | null
  adminNotes: string | null
  shippingAddress: {
    name: string
    phone: string
    street: string
    city: string
    state: string
    country?: string
  }
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  completedAt: string | null
  buyerConfirmedAt: string | null
  buyer: {
    id: string
    name: string | null
    email: string
    phone: string // Admin can contact for disputes/urgent updates
  }
  seller: {
    id: string
    name: string | null
    email: string
    phone: string // Admin can contact for disputes/urgent updates
    sellerAccount?: {
      bankName: string | null
      accountNumber: string | null
      accountName: string | null
    } | null
  } | null
  items: OrderItem[]
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PAID', label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  { value: 'PROCESSING', label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  { value: 'SHIPPED', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'DELIVERED', label: 'Delivered', color: 'bg-teal-100 text-teal-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'REFUNDED', label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
]

export default function AdminOrderDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as any).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchOrder()
  }, [session, status, orderId])

  const fetchOrder = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/boutique/admin/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
        setNewStatus(data.status)
        setTrackingNumber(data.trackingNumber || '')
        setTrackingUrl(data.trackingUrl || '')
        setAdminNotes(data.adminNotes || '')
      } else {
        toast.error('Order not found')
        router.push('/admin/boutique/orders')
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const updateOrder = async () => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/boutique/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          trackingNumber: trackingNumber || null,
          trackingUrl: trackingUrl || null,
          notes: adminNotes,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setOrder(data)
        toast.success('Order updated successfully')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update order')
      }
    } catch (error) {
      toast.error('Failed to update order')
    } finally {
      setUpdating(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied!`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (statusValue: string) => {
    return ORDER_STATUSES.find(s => s.value === statusValue)?.color || 'bg-gray-100 text-gray-800'
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/boutique/orders" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-4 text-sm">
            <ChevronLeft className="w-4 h-4" />
            Back to Orders
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
              <p className="text-sm text-gray-500">Created {formatDate(order.createdAt)}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {item.product.thumbnailUrl ? (
                        <Image
                          src={item.product.thumbnailUrl}
                          alt={item.product.title}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.product.title}</p>
                      {item.variantSnapshot && (
                        <p className="text-sm text-gray-500">
                          {item.variantSnapshot.size && `Size: ${item.variantSnapshot.size}`}
                          {item.variantSnapshot.size && item.variantSnapshot.color && ' • '}
                          {item.variantSnapshot.color && `Color: ${item.variantSnapshot.color}`}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(item.finalPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>{formatCurrency(order.shippingCost)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-purple-600">
                  <span>Platform Fee</span>
                  <span>{formatCurrency(order.platformFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-purple-600">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{order.shippingAddress.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{order.shippingAddress.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-900">
                    {order.shippingAddress.street}<br />
                    {order.shippingAddress.city}, {order.shippingAddress.state}
                    {order.shippingAddress.country && <><br />{order.shippingAddress.country}</>}
                  </span>
                </div>
              </div>
            </div>

            {/* Update Order Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Order</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="orderStatus" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    id="orderStatus"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  >
                    {ORDER_STATUSES.map(s => (
                      <option key={s.value} value={s.value} className="text-gray-900">{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number..."
                    className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking URL
                  </label>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Internal notes..."
                    className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  />
                </div>

                <button
                  onClick={updateOrder}
                  disabled={updating}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {updating ? 'Updating...' : 'Update Order'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Buyer Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Buyer</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{order.buyer.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{order.buyer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${order.buyer.phone}`} className="text-primary-600 hover:underline">
                    {order.buyer.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Seller Info with Bank Details */}
            {order.seller && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Seller</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{order.seller.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{order.seller.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${order.seller.phone}`} className="text-primary-600 hover:underline">
                      {order.seller.phone}
                    </a>
                  </div>
                </div>

                {/* Bank Details for Payout */}
                {order.sellerPayout && order.sellerPayout > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-green-600" />
                      Payout Details
                    </h3>
                    <div className="bg-green-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="font-semibold text-green-700">{formatCurrency(order.sellerPayout)}</span>
                      </div>
                      {order.seller.sellerAccount?.bankName ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Bank:</span>
                            <span className="text-sm text-gray-900">{order.seller.sellerAccount.bankName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Account:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-mono text-gray-900">{order.seller.sellerAccount.accountNumber}</span>
                              <button
                                onClick={() => copyToClipboard(order.seller!.sellerAccount!.accountNumber!, 'Account number')}
                                className="p-1 hover:bg-green-100 rounded"
                                aria-label="Copy account number"
                              >
                                <Copy className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Name:</span>
                            <span className="text-sm text-gray-900">{order.seller.sellerAccount.accountName}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">No bank details on file</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
              <div className="space-y-2 text-sm">
                {order.paymentReference && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Reference:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-gray-900 text-xs">{order.paymentReference.slice(0, 12)}...</span>
                      <button
                        onClick={() => copyToClipboard(order.paymentReference!, 'Payment reference')}
                        className="p-1 hover:bg-gray-100 rounded"
                        aria-label="Copy payment reference"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Fulfillment:</span>
                  <span className="text-gray-900">{order.fulfillmentMethod.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="text-gray-900">{formatDate(order.createdAt)}</span>
                </div>
                {order.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid</span>
                    <span className="text-gray-900">{formatDate(order.paidAt)}</span>
                  </div>
                )}
                {order.shippedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipped</span>
                    <span className="text-gray-900">{formatDate(order.shippedAt)}</span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivered</span>
                    <span className="text-gray-900">{formatDate(order.deliveredAt)}</span>
                  </div>
                )}
                {order.buyerConfirmedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Buyer Confirmed</span>
                    <span className="text-gray-900">{formatDate(order.buyerConfirmedAt)}</span>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed</span>
                    <span className="text-gray-900">{formatDate(order.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Info */}
            {order.trackingNumber && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <h3 className="font-medium text-purple-900">Tracking</h3>
                </div>
                <p className="font-mono text-purple-700 text-sm">{order.trackingNumber}</p>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-purple-600 hover:text-purple-700 text-sm"
                  >
                    Track Package <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
