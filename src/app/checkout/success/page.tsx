'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
// import { useRouter } from 'next/navigation'
import { CheckCircle, Download, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { downloadFilesAsZip } from '@/lib/downloadUtils'

interface OrderItem {
  id: string
  quantity: number
  price: number
  design: {
    id: string
    title: string
    imageUrl: string
    mediaFiles?: Array<{
      id: string
      fileUrl: string
      fileName: string
      fileType: string
      mimeType: string
    }>
    designer: {
      name: string | null
    }
  }
}

interface OrderDetails {
  id: string
  orderNumber: string
  totalAmount: number
  platformFee: number
  createdAt: string
  items: OrderItem[]
}

export default function CheckoutSuccessPage() {
  // const router = useRouter()
  const { data: session } = useSession()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('session_id') || params.get('reference')
    setSessionId(sid)
  }, [])

  useEffect(() => {
    if (sessionId) {
      fetchOrderDetails(sessionId)
      // Clear cart after successful payment
      if (session?.user?.id) {
        clearCart()
      }
    } else {
      setLoading(false)
    }
  }, [sessionId, session])

  const clearCart = async () => {
    try {
      // Delete all items from user's cart
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        console.log('Cart cleared successfully after payment')
      }
    } catch (error) {
      console.error('Failed to clear cart:', error)
      // Don't fail the success page if cart clearing fails
    }
  }

  const fetchOrderDetails = async (sessionId: string) => {
    try {
      console.log('Fetching order for sessionId:', sessionId)
      const response = await fetch(`/api/orders/session/${sessionId}`)
      console.log('Order fetch response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Order found:', data.order)
        setOrder(data.order)
      } else {
        const errorData = await response.json()
        console.error('Order fetch error:', response.status, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleDownloadItem = async (item: OrderItem) => {
    setDownloadingItemId(item.id)
    
    try {
      if (!item.design.mediaFiles || item.design.mediaFiles.length === 0) {
        toast.error('No files available for this design')
        setDownloadingItemId(null)
        return
      }

      const files = item.design.mediaFiles.map((media) => ({
        url: media.fileUrl,
        name: media.fileName || `${item.design.title}-${media.id}`
      }))

      await downloadFilesAsZip(files, `${item.design.title}`)
      toast.success(`Downloaded ${files.length} file(s)`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download files. Please try again.')
    } finally {
      setDownloadingItemId(null)
    }
  }

  const handleDownloadAll = async () => {
    if (!order || order.items.length === 0) {
      toast.error('No items to download')
      return
    }

    setDownloadingAll(true)
    
    try {
      const allFiles: Array<{ url: string; name: string; folder?: string }> = []
      
      // Collect all files organized by design name
      order.items.forEach((item) => {
        if (item.design.mediaFiles && item.design.mediaFiles.length > 0) {
          item.design.mediaFiles.forEach((media) => {
            allFiles.push({
              url: media.fileUrl,
              name: media.fileName || `${item.design.title}-${media.id}`,
              folder: item.design.title // Create subfolder for each design
            })
          })
        }
      })

      if (allFiles.length === 0) {
        toast.error('No files available for download')
        setDownloadingAll(false)
        return
      }

      await downloadFilesAsZip(allFiles, `Order-${order.orderNumber}`)
      toast.success(`Downloaded ${allFiles.length} file(s) from ${order.items.length} design(s)`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download files. Please try again.')
    } finally {
      setDownloadingAll(false)
    }
  }

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
          </div>

          {/* Order Details */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
            
            <div className="space-y-4 mb-8">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-16 h-16 flex-shrink-0">
                    <Image
                      src={item.design.imageUrl}
                      alt={item.design.title}
                      width={64}
                      height={64}
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
                    <button 
                      onClick={() => handleDownloadItem(item)}
                      disabled={downloadingItemId === item.id}
                      className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {downloadingItemId === item.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download as ZIP
                        </>
                      )}
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
                  <span className="text-gray-600">Platform Fee</span>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Download Your Designs</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Your purchased designs are now available for download. You have lifetime access to these files.
                  </p>
                  <button 
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {downloadingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download All
                      </>
                    )}
                  </button>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Order Confirmation</h4>
                  <p className="text-purple-700 text-sm mb-3">
                    A confirmation email has been sent to your registered email address with all the details.
                  </p>
                  <Link href="/orders" className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                    View Order History
                  </Link>
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