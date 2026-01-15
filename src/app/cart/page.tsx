'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, X, AlertCircle, Package, Download, Truck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface CartItem {
  id: string
  quantity: number
  purchaseType: 'REGULAR' | 'OWNERSHIP' | 'POD'
  // POD-specific fields
  podProductId?: string
  podProductName?: string
  podProvider?: string
  podPrice?: number
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

interface ShippingAddress {
  fullName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
}

export default function CartPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paystack' | 'flutterwave'>('paystack')
  const [countryCode, setCountryCode] = useState('NG')
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'NG',
    phone: ''
  })

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
    // Check if POD items exist and shipping form is needed
    const hasPOD = cartItems.some(item => item.purchaseType === 'POD')
    
    if (hasPOD && !showShippingForm) {
      setShowShippingForm(true)
      return
    }
    
    // Validate shipping address if POD items exist
    if (hasPOD) {
      const required = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'country', 'phone'] as const
      const missing = required.filter(field => !shippingAddress[field])
      if (missing.length > 0) {
        setErrorMessage(`Please fill in: ${missing.join(', ')}`)
        return
      }
    }
    
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
            quantity: item.quantity,
            purchaseType: item.purchaseType,
            // Include POD-specific fields
            ...(item.purchaseType === 'POD' ? {
              podProductId: item.podProductId,
              podProductName: item.podProductName,
              podProvider: item.podProvider,
              podPrice: item.podPrice
            } : {})
          })),
          paymentMethod,
          countryCode,
          // Include shipping address for POD orders
          ...(hasPOD ? { shippingAddress } : {})
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.url) {
          window.location.href = data.url
        }
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
    return cartItems.reduce((sum, item) => {
      // For POD items, use podPrice; for digital, use design.price
      const itemPrice = item.purchaseType === 'POD' && item.podPrice 
        ? item.podPrice 
        : item.design.price
      return sum + (itemPrice * item.quantity)
    }, 0)
  }
  
  // Check if cart has any POD items (requires shipping)
  const hasPODItems = cartItems.some(item => item.purchaseType === 'POD')
  const hasDigitalItems = cartItems.some(item => item.purchaseType !== 'POD')
  
  // Helper to get item price
  const getItemPrice = (item: CartItem) => {
    return item.purchaseType === 'POD' && item.podPrice ? item.podPrice : item.design.price
  }
  
  // Helper to get item type badge
  const getItemTypeBadge = (item: CartItem) => {
    if (item.purchaseType === 'POD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Package className="h-3 w-3" />
          Physical Product
        </span>
      )
    }
    if (item.purchaseType === 'OWNERSHIP') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Ownership Rights
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Download className="h-3 w-3" />
        Digital Download
      </span>
    )
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
                {/* POD Items Notice */}
                {hasPODItems && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                    <Truck className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">Physical Products Require Shipping</p>
                      <p className="text-sm text-orange-700 mt-1">
                        You have print-on-demand items in your cart. You&apos;ll need to provide a shipping address during checkout.
                      </p>
                    </div>
                  </div>
                )}
                
                {cartItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center space-x-4 p-4 border rounded-lg ${
                      item.purchaseType === 'POD' 
                        ? 'border-orange-200 bg-orange-50/30' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="w-20 h-20 flex-shrink-0 relative">
                      <Image
                        src={item.design.thumbnailUrl || item.design.imageUrl}
                        alt={item.design.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {item.purchaseType === 'POD' && (
                        <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-1">
                          <Package className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link href={`/designs/${item.design.id}`}>
                        <h3 className="font-semibold text-gray-900 hover:text-indigo-600 truncate">
                          {item.design.title}
                        </h3>
                      </Link>
                      {item.purchaseType === 'POD' && item.podProductName && (
                        <p className="text-sm text-orange-700 font-medium">
                          {item.podProductName}
                          {item.podProvider && (
                            <span className="text-orange-500 ml-1">
                              via {item.podProvider}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        by {item.design.designer.name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getItemTypeBadge(item)}
                      </div>
                      <p className="font-semibold text-gray-900 mt-1">
                        {formatPrice(getItemPrice(item))}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.purchaseType !== 'OWNERSHIP' && (
                        <>
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
                        </>
                      )}
                      {item.purchaseType === 'OWNERSHIP' && (
                        <span className="text-sm text-gray-500">Qty: 1</span>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(getItemPrice(item) * item.quantity)}
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
                    {/* Show breakdown by type */}
                    {hasDigitalItems && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          Digital Items
                        </span>
                        <span className="font-medium">
                          {formatPrice(
                            cartItems
                              .filter(item => item.purchaseType !== 'POD')
                              .reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0)
                          )}
                        </span>
                      </div>
                    )}
                    
                    {hasPODItems && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          Physical Products
                        </span>
                        <span className="font-medium">
                          {formatPrice(
                            cartItems
                              .filter(item => item.purchaseType === 'POD')
                              .reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0)
                          )}
                        </span>
                      </div>
                    )}
                    
                    {hasPODItems && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Truck className="h-4 w-4" />
                          Shipping
                        </span>
                        <span className="text-gray-500 italic">Calculated at checkout</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items Total</span>
                      <span className="font-medium">{formatPrice(total)}</span>
                    </div>
                    
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-900">You Pay</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatPrice(total)}
                          {hasPODItems && <span className="text-sm font-normal text-gray-500"> + shipping</span>}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 space-y-1">
                        <p>• No additional fees charged to you</p>
                        <p>• Platform takes 7-10% commission from sellers (first $100 free!)</p>
                        <p>• Higher volume sellers pay lower rates</p>
                        {hasPODItems && (
                          <p className="text-orange-600">• Physical products will be printed and shipped to your address</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Method Selection */}
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Payment Method</h3>
                    <div className="space-y-2">
                      <label className="flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="paystack"
                          checked={paymentMethod === 'paystack'}
                          onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                          className="mr-3 text-indigo-600"
                        />
                        <div className="flex items-center flex-1">
                          <span className="text-2xl mr-2">🏦</span>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Paystack</span>
                            <p className="text-xs text-gray-500">Cards, Bank Transfer, USSD (Nigeria, Ghana, SA)</p>
                          </div>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="flutterwave"
                          checked={paymentMethod === 'flutterwave'}
                          onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                          className="mr-3 text-indigo-600"
                        />
                        <div className="flex items-center flex-1">
                          <span className="text-2xl mr-2">🌍</span>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Flutterwave</span>
                            <p className="text-xs text-gray-500">Cards, Mobile Money (11 African countries)</p>
                          </div>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="stripe"
                          checked={paymentMethod === 'stripe'}
                          onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                          className="mr-3 text-indigo-600"
                        />
                        <div className="flex items-center flex-1">
                          <span className="text-2xl mr-2">💳</span>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Stripe</span>
                            <p className="text-xs text-gray-500">International Cards (Visa, Mastercard)</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    
                    {/* Flutterwave Country Selection */}
                    {paymentMethod === 'flutterwave' && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Your Country
                        </label>
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="NG">🇳🇬 Nigeria (NGN)</option>
                          <option value="GH">🇬🇭 Ghana (GHS)</option>
                          <option value="KE">🇰🇪 Kenya (KES)</option>
                          <option value="ZA">🇿🇦 South Africa (ZAR)</option>
                          <option value="TZ">🇹🇿 Tanzania (TZS)</option>
                          <option value="UG">🇺🇬 Uganda (UGX)</option>
                          <option value="RW">🇷🇼 Rwanda (RWF)</option>
                          <option value="CM">🇨🇲 Cameroon (XAF)</option>
                          <option value="CI">🇨🇮 Ivory Coast (XOF)</option>
                          <option value="SN">🇸🇳 Senegal (XOF)</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {/* Shipping Address Form (for POD orders) */}
                  {showShippingForm && hasPODItems && (
                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Shipping Address
                      </h3>
                      <p className="text-xs text-gray-500 mb-4">
                        Required for physical products. Your items will be printed and shipped to this address.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            placeholder="Full Name *"
                            value={shippingAddress.fullName}
                            onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            placeholder="Address Line 1 *"
                            value={shippingAddress.addressLine1}
                            onChange={(e) => setShippingAddress({...shippingAddress, addressLine1: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            placeholder="Address Line 2 (Optional)"
                            value={shippingAddress.addressLine2}
                            onChange={(e) => setShippingAddress({...shippingAddress, addressLine2: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="City *"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="State/Province *"
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Postal Code *"
                          value={shippingAddress.postalCode}
                          onChange={(e) => setShippingAddress({...shippingAddress, postalCode: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <select
                          value={shippingAddress.country}
                          onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="NG">🇳🇬 Nigeria</option>
                          <option value="GH">🇬🇭 Ghana</option>
                          <option value="KE">🇰🇪 Kenya</option>
                          <option value="ZA">🇿🇦 South Africa</option>
                          <option value="US">🇺🇸 United States</option>
                          <option value="GB">🇬🇧 United Kingdom</option>
                          <option value="CA">🇨🇦 Canada</option>
                          <option value="AU">🇦🇺 Australia</option>
                          <option value="DE">🇩🇪 Germany</option>
                          <option value="FR">🇫🇷 France</option>
                        </select>
                        <div className="md:col-span-2">
                          <input
                            type="tel"
                            placeholder="Phone Number *"
                            value={shippingAddress.phone}
                            onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                    ) : hasPODItems && !showShippingForm ? (
                      <>
                        Enter Shipping Address
                        <Truck className="h-4 w-4" />
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