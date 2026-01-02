'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, X, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface CartItem {
  id: string
  quantity: number
  design: {
    id: string
    title: string
    price: number
    imageUrl: string
    thumbnailUrl: string | null
    designer: {
      id: string
      name: string | null
    }
  }
}

export default function CartPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paystack'>('stripe')

  useEffect(() => {
    if (session) {
      fetchCart()
    } else {
      setLoading(false)
    }
  }, [session])

  const fetchCart = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items)
      } else if (response.status === 401) {
        setErrorMessage('Please sign in to view your cart.')
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFromCart = async (itemId: string) => {
    try {
      setUpdating(itemId)
      const response = await fetch(`/api/cart?itemId=${itemId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setCartItems(items => items.filter(item => item.id !== itemId))
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
    } finally {
      setUpdating(null)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId)
      return
    }

    try {
      setUpdating(itemId)
      // For now, just update locally since we don't have update endpoint
      setCartItems(items => 
        items.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      )
    } catch (error) {
      console.error('Failed to update quantity:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleCheckout = async () => {
    try {
      setCheckingOut(true)
      setErrorMessage(null)
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cartItems: cartItems.map(item => ({
            designId: item.design.id,
            quantity: item.quantity
          })),
          paymentMethod
        })
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        // If Stripe is not activated, automatically try Paystack
        if (paymentMethod === 'stripe' && error.message?.includes('Stripe not activated')) {
          setErrorMessage('Stripe not activated. Switching to Paystack...')
          setPaymentMethod('paystack')
          // Retry with Paystack after a brief delay
          setTimeout(() => {
            setErrorMessage(null)
          }, 2000)
          return
        }
        setErrorMessage(error.message || 'Checkout failed. Please try again.')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setErrorMessage('Checkout failed. Please try again.')
    } finally {
      setCheckingOut(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.design.price * item.quantity), 0)
  }

  // const calculatePlatformFee = (total: number) => {
  //   return total * 0.05 // 5% platform fee (deducted from sellers, not added to buyers)
  // }

  if (!session || errorMessage === 'Please sign in to view your cart.') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to view your cart</p>
          <button 
            onClick={() => router.push('/api/auth/signin')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const total = calculateTotal()
  // const platformFee = calculatePlatformFee(total)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              Shopping Cart ({cartItems.length})
            </h1>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <span className="text-red-800 font-medium">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-600 hover:text-red-800"
                aria-label="Close error message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
              <Link 
                href="/designs"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Browse Designs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4 mb-8">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-20 h-20 flex-shrink-0">
                      <Image
                        src={item.design.thumbnailUrl || item.design.imageUrl}
                        alt={item.design.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link href={`/designs/${item.design.id}`}>
                        <h3 className="font-semibold text-gray-900 hover:text-indigo-600 truncate">
                          {item.design.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600">
                        by {item.design.designer.name || 'Anonymous'}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {formatPrice(item.design.price)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={updating === item.id}
                        className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={updating === item.id}
                        className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(item.design.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        disabled={updating === item.id}
                        className="mt-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items Total</span>
                      <span className="font-medium">{formatPrice(total)}</span>
                    </div>
                    
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-900">You Pay</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatPrice(total)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 space-y-1">
                        <p>• No additional fees charged to you</p>
                        <p>• Platform takes 10% commission from sellers</p>
                        <p>• Sellers receive 90% of the sale price</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Method Selection */}
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Payment Method</h3>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="stripe"
                          checked={paymentMethod === 'stripe'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paystack')}
                          className="mr-3 text-indigo-600"
                        />
                        <div className="flex items-center">
                          <span className="text-sm text-gray-700">Stripe</span>
                          <span className="ml-2 text-xs text-gray-500">(Credit/Debit Cards)</span>
                        </div>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="paystack"
                          checked={paymentMethod === 'paystack'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paystack')}
                          className="mr-3 text-indigo-600"
                        />
                        <div className="flex items-center">
                          <span className="text-sm text-gray-700">Paystack</span>
                          <span className="ml-2 text-xs text-gray-500">(Cards, Bank Transfer, USSD)</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    className="w-full mt-6 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {checkingOut ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Proceed to Checkout
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}