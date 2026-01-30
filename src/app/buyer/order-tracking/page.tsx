'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Package, Truck, CheckCircle, AlertCircle, Phone, MessageSquare } from 'lucide-react'

interface TrackingEvent {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED'
  description: string
  timestamp: string
  location: string
  carrier: string
}

interface TrackingDetail {
  orderId: string
  orderNumber: string
  trackingNumber: string
  carrier: string
  carrierUrl: string
  estimatedDelivery: string
  currentStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED'
  shippedDate: string
  deliveredDate: string | null
  events: TrackingEvent[]
  shippingAddress: {
    fullName: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  seller: {
    name: string
    email: string
    phone: string
  }
  items: Array<{
    id: string
    title: string
    image: string
    quantity: number
  }>
}

export default function OrderTrackingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('id')

  const [tracking, setTracking] = useState<TrackingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapExpanded, setMapExpanded] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    if (!orderId) {
      return
    }

    fetchTracking()
  }, [status, orderId, router])

  const fetchTracking = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/buyer/orders/${orderId}/tracking`)
      if (response.ok) {
        const data = await response.json()
        setTracking(data.tracking)
      }
    } catch (error) {
      console.error('Failed to fetch tracking:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED': return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'OUT_FOR_DELIVERY': return <Truck className="w-6 h-6 text-blue-600" />
      case 'IN_TRANSIT': return <Package className="w-6 h-6 text-blue-500" />
      case 'SHIPPED': return <Package className="w-6 h-6 text-indigo-600" />
      case 'PROCESSING': return <AlertCircle className="w-6 h-6 text-yellow-600" />
      case 'FAILED': return <AlertCircle className="w-6 h-6 text-red-600" />
      case 'RETURNED': return <ArrowLeft className="w-6 h-6 text-orange-600" />
      default: return <Package className="w-6 h-6 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'OUT_FOR_DELIVERY': return 'bg-blue-100 text-blue-800'
      case 'IN_TRANSIT': return 'bg-blue-50 text-blue-800'
      case 'SHIPPED': return 'bg-indigo-100 text-indigo-800'
      case 'PROCESSING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'RETURNED': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'PENDING': return 10
      case 'PROCESSING': return 25
      case 'SHIPPED': return 50
      case 'IN_TRANSIT': return 65
      case 'OUT_FOR_DELIVERY': return 85
      case 'DELIVERED': return 100
      default: return 0
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading tracking information...</div>
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/orders" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8">
            <ArrowLeft className="w-5 h-5" />
            Back to Orders
          </Link>
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Tracking information not available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/orders" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4">
            <ArrowLeft className="w-5 h-5" />
            Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
          <p className="text-gray-600 mt-1">Order {tracking.orderNumber}</p>
        </div>

        {/* Main Tracking Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {getStatusIcon(tracking.currentStatus)}
                {tracking.currentStatus.replace(/_/g, ' ')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Tracking: {tracking.trackingNumber}</p>
            </div>
            <a
              href={tracking.carrierUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
            >
              {tracking.carrier} Tracking
            </a>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-900">Delivery Progress</p>
              <p className="text-sm text-gray-600">{getProgressPercentage(tracking.currentStatus)}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage(tracking.currentStatus)}%` }}
              />
            </div>
          </div>

          {/* Key Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Shipped</p>
              <p className="font-semibold text-gray-900">{new Date(tracking.shippedDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Est. Delivery</p>
              <p className="font-semibold text-gray-900">{new Date(tracking.estimatedDelivery).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Carrier</p>
              <p className="font-semibold text-gray-900">{tracking.carrier}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tracking Events */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Tracking History</h3>
              <div className="space-y-4">
                {tracking.events.map((event, index) => (
                  <div key={event.id} className="relative">
                    {index !== tracking.events.length - 1 && (
                      <div className="absolute left-4 top-12 w-0.5 h-12 bg-gray-200" />
                    )}
                    <div className="flex gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusColor(event.status)}`}>
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="pt-1">
                        <p className="font-semibold text-gray-900 text-sm">{event.status.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>{event.location}</span>
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Items in This Shipment</h3>
              <div className="space-y-3">
                {tracking.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
                      <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Delivery Address
              </h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium">{tracking.shippingAddress.fullName}</p>
                <p>{tracking.shippingAddress.street}</p>
                <p>{tracking.shippingAddress.city}, {tracking.shippingAddress.state} {tracking.shippingAddress.zipCode}</p>
                <p>{tracking.shippingAddress.country}</p>
              </div>
            </div>

            {/* Seller Contact */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Contact</h3>
              <div className="space-y-3">
                <p className="text-sm">
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium text-gray-900">{tracking.seller.name}</span>
                </p>
                <div className="flex gap-2">
                  <a
                    href={`mailto:${tracking.seller.email}`}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-center"
                  >
                    Email
                  </a>
                  <a
                    href={`tel:${tracking.seller.phone}`}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-center flex items-center justify-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    Call
                  </a>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-indigo-50 rounded-lg shadow-sm p-6 border border-indigo-200">
              <h3 className="text-lg font-semibold text-indigo-900 mb-4">Need Help?</h3>
              <p className="text-sm text-indigo-800 mb-4">If there are any issues with your delivery, contact support.</p>
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
