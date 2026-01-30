'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Package, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowLeft, 
  Truck,
  AlertTriangle,
  Rocket,
  Store,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    basePrice: number;
    salePrice: number | null;
    thumbnailUrl: string | null;
    status: string;
    fulfillmentMethod: string;
    sellerShippingTime: string | null;
    seller: { id: string; name: string | null };
  };
  variant: {
    id: string;
    size: string;
    color: string;
    colorHex: string | null;
    quantity: number;
    priceAdjustment: number;
  } | null;
  price: number;
  maxQuantity: number;
  isSellerDirect: boolean;
}

interface UnavailableItem {
  id: string;
  product: { id: string; title: string; thumbnailUrl: string | null };
  reason: string;
}

interface Cart {
  items: CartItem[];
  unavailableItems: UnavailableItem[];
  subtotal: number;
  itemCount: number;
  hasSellerDirect: boolean;
  hasMixedFulfillment: boolean;
  fulfillmentNote: string | null;
}

export default function BoutiqueCartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/boutique/cart');
    } else if (status === 'authenticated') {
      fetchCart();
    }
  }, [status, router]);

  const fetchCart = async () => {
    try {
      const response = await fetch('/api/boutique/cart');
      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
      } else {
        toast.error(data.message || 'Failed to load cart');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdating(itemId);
    try {
      const response = await fetch('/api/boutique/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCart();
        window.dispatchEvent(new CustomEvent('boutiqueCartUpdated'));
      } else {
        toast.error(data.message || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      const response = await fetch('/api/boutique/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Item removed from cart');
        await fetchCart();
        window.dispatchEvent(new CustomEvent('boutiqueCartUpdated'));
      } else {
        toast.error(data.message || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  const removeUnavailableItems = async () => {
    if (!cart?.unavailableItems.length) return;
    
    try {
      for (const item of cart.unavailableItems) {
        await fetch('/api/boutique/cart', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id }),
        });
      }
      toast.success('Removed unavailable items');
      await fetchCart();
      window.dispatchEvent(new CustomEvent('boutiqueCartUpdated'));
    } catch (error) {
      console.error('Error removing unavailable items:', error);
      toast.error('Failed to remove items');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price).replace(/[\n\r\t\s]+/g, '');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-8">
          <Link 
            href="/boutique" 
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-black flex items-center gap-1 sm:gap-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              Boutique Cart
            </h1>
            <p className="text-[10px] sm:text-sm text-black flex items-center gap-0.5 sm:gap-1">
              <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
              Physical items • Shipping required
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 sm:p-4 mb-3 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-purple-900 text-[11px] sm:text-base">Physical Items Cart</h3>
              <p className="text-[9px] sm:text-sm text-purple-700">
                These items will be shipped to your address. Shipping fees will be calculated at checkout.
              </p>
            </div>
          </div>
        </div>

        {!cart || cart.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-12 text-center">
            <ShoppingBag className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-4" />
            <h2 className="text-base sm:text-xl font-semibold text-black mb-1 sm:mb-2">Your boutique cart is empty</h2>
            <p className="text-[10px] sm:text-base text-black mb-4 sm:mb-6">Browse our physical fashion items</p>
            <Link
              href="/boutique"
              className="inline-flex items-center gap-1 sm:gap-2 bg-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-purple-700 transition text-[11px] sm:text-base"
            >
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              Browse Boutique
            </Link>
          </div>
        ) : (
          <div className="w-full grid lg:grid-cols-3 gap-3 sm:gap-6 min-w-0">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-2 sm:space-y-4 min-w-0">
              {/* Unavailable Items Warning */}
              {cart.unavailableItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-amber-900 text-[10px] sm:text-base">
                        {cart.unavailableItems.length} item(s) unavailable
                      </h3>
                      <p className="text-[9px] sm:text-sm text-amber-700 mb-2 sm:mb-3">
                        These items are no longer available and will be removed from your cart.
                      </p>
                      <button
                        onClick={removeUnavailableItems}
                        className="text-[9px] sm:text-sm text-amber-800 underline hover:no-underline"
                      >
                        Remove all unavailable items
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mixed Fulfillment Notice */}
              {cart.hasMixedFulfillment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-blue-900 text-[11px] sm:text-base">Mixed Shipping</h3>
                      <p className="text-[9px] sm:text-sm text-blue-700">
                        Your cart has items from different sources. Some ship from our warehouse, others directly from sellers.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Items List */}
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm p-2 sm:p-4 flex gap-2 sm:gap-4"
                >
                  {/* Product Image */}
                  <Link href={`/boutique/${item.product.slug}`} className="shrink-0">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 relative rounded-lg overflow-hidden bg-gray-100">
                      {item.product.thumbnailUrl ? (
                        <Image
                          src={item.product.thumbnailUrl}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 sm:w-8 sm:h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/boutique/${item.product.slug}`}
                      className="font-medium text-black hover:text-purple-600 line-clamp-1 text-[10px] sm:text-base"
                    >
                      {item.product.title}
                    </Link>
                    
                    <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 text-[8px] sm:text-sm text-black">
                      {item.variant && (
                        <>
                          <span>Size: {item.variant.size}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 sm:gap-1">
                            Color: 
                            {item.variant.colorHex && (
                              <span 
                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border"
                                style={{ backgroundColor: item.variant.colorHex }}
                              />
                            )}
                            {item.variant.color}
                          </span>
                        </>
                      )}
                    </div>

                    {item.isSellerDirect && (
                      <div className="flex items-center gap-0.5 sm:gap-1 mt-1">
                        <Rocket className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                        <span className="text-[8px] sm:text-xs text-blue-600">
                          Ships from seller ({item.product.sellerShippingTime || '3-5 days'})
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mt-2 sm:mt-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id || item.quantity <= 1}
                          className="p-1 rounded border hover:bg-gray-50 disabled:opacity-50 text-black"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <span className="w-6 sm:w-8 text-center font-bold text-black text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id || item.quantity >= item.maxQuantity}
                          className="p-1 rounded border hover:bg-gray-50 disabled:opacity-50 text-black"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        {item.maxQuantity <= 5 && (
                          <span className="text-[8px] sm:text-xs text-amber-600 ml-1 sm:ml-2">
                            Only {item.maxQuantity} left
                          </span>
                        )}
                      </div>

                      {/* Price & Remove */}
                      <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
                        <span className="font-bold text-sm sm:text-lg text-black">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={updating === item.id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                          aria-label="Remove item from cart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1 w-full min-w-0">
              <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 lg:p-6 lg:sticky lg:top-20 w-full box-border">
                <h2 className="text-xs sm:text-base lg:text-lg font-semibold text-black mb-2 sm:mb-3 lg:mb-4">Order Summary</h2>
                
                <div className="space-y-1 sm:space-y-2 lg:space-y-3 text-[9px] sm:text-xs lg:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-black truncate">Subtotal ({cart.itemCount} items)</span>
                    <span className="font-bold text-black whitespace-nowrap">{formatPrice(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-black">Shipping</span>
                    <span className="text-gray-500 text-right text-[8px] sm:text-[9px]">At checkout</span>
                  </div>
                  <div className="border-t pt-1 sm:pt-2 lg:pt-3 flex justify-between gap-2">
                    <span className="font-semibold text-black">Total</span>
                    <span className="font-bold text-sm sm:text-base lg:text-lg text-black whitespace-nowrap">{formatPrice(cart.subtotal)}+</span>
                  </div>
                </div>

                <Link
                  href="/boutique/checkout"
                  className="w-full mt-2 sm:mt-3 lg:mt-6 bg-purple-600 text-white py-1.5 sm:py-2 lg:py-3 rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-1 text-[10px] sm:text-xs lg:text-base"
                >
                  <Truck className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  <span>Checkout</span>
                </Link>

                <p className="text-[7px] sm:text-[8px] lg:text-xs text-black text-center mt-1 sm:mt-2 lg:mt-4">
                  Address required
                </p>

                <div className="border-t mt-2 sm:mt-3 lg:mt-6 pt-1 sm:pt-2 lg:pt-4">
                  <Link
                    href="/boutique"
                    className="text-[9px] sm:text-xs lg:text-sm text-purple-600 hover:text-purple-700 flex items-center justify-center gap-0.5"
                  >
                    <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                    <span>Shop More</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
