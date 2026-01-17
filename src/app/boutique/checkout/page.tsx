'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Package, 
  ArrowLeft, 
  Truck,
  MapPin,
  CreditCard,
  Tag,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Phone,
  User,
  Building,
  Info,
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
    fulfillmentMethod: string;
  };
  variant: {
    size: string;
    color: string;
    colorHex: string | null;
    priceAdjustment: number;
  } | null;
  price: number;
  isSellerDirect: boolean;
}

interface Cart {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

interface ShippingAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
}

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function BoutiqueCheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shippingEstimate, setShippingEstimate] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  
  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    country: 'Nigeria',
  });

  const [errors, setErrors] = useState<Partial<ShippingAddress>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/boutique/checkout');
    } else if (status === 'authenticated') {
      fetchCart();
      // Pre-fill name if available
      if (session?.user?.name) {
        setAddress(prev => ({ ...prev, name: session.user.name || '' }));
      }
    }
  }, [status, router, session]);

  const fetchCart = async () => {
    try {
      const response = await fetch('/api/boutique/cart');
      const data = await response.json();
      if (data.success) {
        if (data.cart.items.length === 0) {
          toast.error('Your cart is empty');
          router.push('/boutique/cart');
          return;
        }
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

  const validateAddress = (): boolean => {
    const newErrors: Partial<ShippingAddress> = {};
    
    if (!address.name.trim()) newErrors.name = 'Name is required';
    if (!address.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^[0-9+\-\s]{10,15}$/.test(address.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }
    if (!address.street.trim()) newErrors.street = 'Street address is required';
    if (!address.city.trim()) newErrors.city = 'City is required';
    if (!address.state) newErrors.state = 'State is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const estimateShipping = async () => {
    if (!address.state) return;
    
    try {
      const response = await fetch('/api/boutique/shipping/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: address.state }),
      });
      
      const data = await response.json();
      if (data.success) {
        setShippingEstimate(data.estimate);
      }
    } catch (error) {
      console.error('Error estimating shipping:', error);
    }
  };

  useEffect(() => {
    if (address.state) {
      estimateShipping();
    }
  }, [address.state]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      const response = await fetch('/api/boutique/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal: cart?.subtotal || 0 }),
      });
      
      const data = await response.json();
      if (data.success && data.valid) {
        setAppliedCoupon({ code: couponCode.toUpperCase(), discount: data.discount });
        toast.success(`Coupon applied! You save ${formatPrice(data.discount)}`);
      } else {
        toast.error(data.message || 'Invalid coupon code');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Failed to apply coupon');
    }
  };

  const handleSubmit = async () => {
    if (!validateAddress()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/boutique/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: address,
          paymentMethod: 'paystack',
          couponCode: appliedCoupon?.code,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to Paystack payment page
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          toast.error('Payment initialization failed');
          setSubmitting(false);
        }
      } else {
        toast.error(data.message || 'Checkout failed');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('An error occurred during checkout');
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session || !cart) return null;

  const subtotal = cart.subtotal;
  const shipping = shippingEstimate || 0;
  const discount = appliedCoupon?.discount || 0;
  const total = subtotal + shipping - discount;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/boutique/cart" 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-600" />
              Boutique Checkout
            </h1>
            <p className="text-sm text-gray-500">
              Complete your purchase of physical items
            </p>
          </div>
        </div>

        {/* Physical Items Notice */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-purple-900">Physical Items Shipping</h3>
              <p className="text-sm text-purple-700">
                These items will be physically shipped to your address. Please provide accurate delivery information.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Shipping Address
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 08012345678"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building className="w-4 h-4 inline mr-1" />
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.street ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="House number, street name"
                  />
                  {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Ikeja"
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                
                <div>
                  <label htmlFor="addressState" className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <select
                    id="addressState"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.state ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                </div>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                Discount Code
              </h2>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Enter coupon code"
                />
                {appliedCoupon ? (
                  <button
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={applyCoupon}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Apply
                  </button>
                )}
              </div>
              
              {appliedCoupon && (
                <div className="mt-3 flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Code "{appliedCoupon.code}" applied - {formatPrice(appliedCoupon.discount)} off!
                  </span>
                </div>
              )}
            </div>

            {/* Order Items Preview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items ({cart.itemCount})
              </h2>
              
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="w-12 h-12 relative rounded overflow-hidden bg-gray-100 shrink-0">
                      {item.product.thumbnailUrl ? (
                        <Image
                          src={item.product.thumbnailUrl}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm line-clamp-1">
                        {item.product.title}
                      </p>
                      {item.variant && (
                        <p className="text-xs text-gray-500">
                          {item.variant.size} / {item.variant.color} × {item.quantity}
                        </p>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  {address.state ? (
                    shippingEstimate !== null ? (
                      <span className="font-medium">{formatPrice(shipping)}</span>
                    ) : (
                      <span className="text-gray-400">Calculating...</span>
                    )
                  ) : (
                    <span className="text-gray-400">Select state</span>
                  )}
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                
                <div className="border-t pt-3 flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-purple-600">
                    {address.state && shippingEstimate !== null
                      ? formatPrice(total)
                      : `${formatPrice(subtotal - discount)}+`
                    }
                  </span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="w-4 h-4" />
                  <span>Payment via Paystack (Cards, Bank, USSD)</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !address.state}
                className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay {address.state && shippingEstimate !== null 
                      ? formatPrice(total)
                      : formatPrice(subtotal - discount)
                    }
                  </>
                )}
              </button>

              {!address.state && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-600">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Please select your state to calculate shipping</span>
                </div>
              )}

              <div className="border-t mt-6 pt-4">
                <Link
                  href="/boutique/cart"
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Cart
                </Link>
              </div>

              {/* Security Note */}
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-start gap-2 text-xs text-green-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Your payment is secured by Paystack. We do not store your card details.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
