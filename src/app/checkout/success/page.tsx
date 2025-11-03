'use client'

import { useEffect, useState, Suspense } from 'react'
import SafeImage from '@/components/ui/safe-image'
import Banner from '@/components/ui/banner'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Download, ArrowRight, Copy, ExternalLink, Mail, Link as LinkIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface OrderDetails {
  id: string
  orderNumber: string
  totalAmount: number
  platformFee: number
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    price: number
    design: {
      id: string
      title: string
      imageUrl: string
      designer: {
        name: string | null
      }
    }
  }>
}

function CheckoutSuccessPageInner() {
  const searchParams = useSearchParams()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null)
  const sessionId = searchParams.get('session_id') || searchParams.get('reference')

  useEffect(() => {
    if (sessionId) {
      fetchOrderDetails(sessionId)
    } else {
      setLoading(false)
    }
  }, [sessionId])

  const fetchOrderDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/orders/session/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
        setErrorMessage(null)
      } else if (response.status === 404) {
        setErrorMessage('Your payment was received. We are finalizing your order; please refresh in a few seconds or check your profile orders shortly.')
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error)
      setErrorMessage('We could not fetch your order details right now. Please refresh this page in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const orderLink = order ? `/profile/orders/${order.id}` : ''

  const copyOrderLink = async () => {
    if (!orderLink) return
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      await navigator.clipboard.writeText(`${base}${orderLink}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      toast.success('Order link copied')
    } catch {
      setErrorMessage('Could not copy the link. You can open the order and copy from the address bar.')
    }
  }

  const sendConfirmationEmail = async () => {
    if (!order) return
    try {
      setNotifyMessage(null)
      const res = await fetch('/api/orders/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setNotifyMessage(data.message || 'Confirmation email sent (or queued).')
      } else {
        setNotifyMessage(data.message || 'Could not send confirmation email. You can copy the order link instead.')
      }
    } catch {
      setNotifyMessage('Could not send confirmation email right now. Please try again later.')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

    // Image sanitization handled by SafeImage

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!sessionId || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-6">Unable to find your order details</p>
          <Link 
            href="/designs"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Success Header */}
          <div className="px-6 py-8 text-center border-b border-gray-200">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">Thank you for your purchase. Your order has been confirmed.</p>
            <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
              <span className="font-medium">Order #{order.orderNumber}</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm">
              <LinkIcon className="h-4 w-4 text-gray-500" />
              <Link href={orderLink} className="text-indigo-600 hover:text-indigo-800 break-all">
                View your order
              </Link>
              <button onClick={copyOrderLink} className="text-gray-600 hover:text-gray-800 inline-flex items-center gap-1">
                Copy
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Order Details */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
            {errorMessage && (
              <Banner type="info" onClose={() => setErrorMessage(null)}>
                {errorMessage}
              </Banner>
            )}
            
            <div className="space-y-4 mb-8">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-16 h-16 flex-shrink-0">
                      <SafeImage
                        src={item.design.imageUrl}
                        alt={item.design.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.design.title}</h3>
                    <p className="text-sm text-gray-600">
                      by {item.design.designer.name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    <button className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(order.totalAmount - order.platformFee)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee (5%)</span>
                  <span className="font-medium">{formatPrice(order.platformFee)}</span>
                </div>
                
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total Paid</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s Next?</h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Download Your Designs</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Your purchased designs are now available for download. You have lifetime access to these files.
                  </p>
                  <Link
                    href={`/api/orders/${order.id}/download`}
                    prefetch={false}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Download All
                  </Link>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Order Confirmation</h4>
                  <p className="text-purple-700 text-sm mb-3">
                    A confirmation email has been sent to your registered email address with all the details.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={orderLink}
                      className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      View Order
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={copyOrderLink}
                      className="inline-flex items-center justify-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-md hover:bg-purple-200"
                    >
                      {copied ? 'Link Copied' : 'Copy Order Link'}
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={sendConfirmationEmail}
                      className="inline-flex items-center justify-center gap-2 border border-purple-300 text-purple-800 px-4 py-2 rounded-md hover:bg-purple-100"
                    >
                      Resend Email
                      <Mail className="h-4 w-4" />
                    </button>
                  </div>
                  {notifyMessage && (
                    <p className="mt-2 text-sm text-purple-800">{notifyMessage}</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/designs"
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 text-center flex items-center justify-center gap-2"
                >
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>
                
                <Link
                  href="/profile"
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 text-center"
                >
                  View Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" /> }>
      <CheckoutSuccessPageInner />
    </Suspense>
  )
}