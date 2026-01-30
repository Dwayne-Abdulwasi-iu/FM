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
  const [shippingInfo, setShippingInfo] = useState<{
    cost: number;
    carrier: string;
    estimatedDays: number;
    notes?: string;
  } | null>(null);
  const [paymentProcessor, setPaymentProcessor] = useState<'PAYSTACK' | 'STRIPE' | 'FLUTTERWAVE' | null>(null);
  const [buyerCountry, setBuyerCountry] = useState<string>('NG');
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
        body: JSON.stringify({ 
          state: address.state,
          fulfillmentMethod: 'ADMIN_STOCK',
          weight: 0.5,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setShippingEstimate(data.shipping.cost);
        setShippingInfo({
          cost: data.shipping.cost,
          carrier: data.shipping.carrier || 'Standard Shipping',
          estimatedDays: data.shipping.estimatedDays || 3,
          notes: data.shipping.notes,
        });
        setPaymentProcessor(data.buyer?.paymentProcessor || 'PAYSTACK');
        setBuyerCountry(data.buyer?.country || 'NG');
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
          buyerCountry,
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
    }).format(price).replace(/[\n\r\t\s]+/g, '');
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-8">
          <Link 
            href="/boutique/cart" 
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-black flex items-center gap-1 sm:gap-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              Checkout
            </h1>
            <p className="text-[9px] sm:text-sm text-black">
              Complete your purchase
            </p>
          </div>
        </div>

        {/* Physical Items Notice */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 sm:p-4 mb-3 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-purple-900 text-[11px] sm:text-base">Physical Items Shipping</h3>
              <p className="text-[9px] sm:text-sm text-purple-700">
                Items will be shipped to your address. Provide accurate information.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full grid lg:grid-cols-3 gap-3 sm:gap-6 min-w-0">
          {/* Shipping Form */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-6 min-w-0">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <h2 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-4 flex items-center gap-1 sm:gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                Shipping Address
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-black mb-0.5 sm:mb-1">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[11px] sm:text-base text-gray-900 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Full name"
                  />
                  {errors.name && <p className="text-red-500 text-[8px] sm:text-xs mt-0.5">{errors.name}</p>}
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-black mb-0.5 sm:mb-1">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[11px] sm:text-base text-gray-900 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="08012345678"
                  />
                  {errors.phone && <p className="text-red-500 text-[8px] sm:text-xs mt-0.5">{errors.phone}</p>}
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-black mb-0.5 sm:mb-1">
                    <Building className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[11px] sm:text-base text-gray-900 ${
                      errors.street ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="House number, street"
                  />
                  {errors.street && <p className="text-red-500 text-[8px] sm:text-xs mt-0.5">{errors.street}</p>}
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-black mb-0.5 sm:mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[11px] sm:text-base text-gray-900 ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ikeja"
                  />
                  {errors.city && <p className="text-red-500 text-[8px] sm:text-xs mt-0.5">{errors.city}</p>}
                </div>
                
                <div>
                  <label htmlFor="addressState" className="block text-xs sm:text-sm font-medium text-black mb-0.5 sm:mb-1">
                    State *
                  </label>
                  <select
                    id="addressState"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className={`w-full px-2 sm:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[11px] sm:text-base text-gray-900 ${
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
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <h2 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-4 flex items-center gap-1 sm:gap-2">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                Discount Code
              </h2>
              
              <div className="flex gap-1 sm:gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                  className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 text-[11px] sm:text-base text-gray-900"
                  placeholder="Code"
                />
                {appliedCoupon ? (
                  <button
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                    }}
                    className="px-2 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-[11px] sm:text-base"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={applyCoupon}
                    className="px-3 sm:px-6 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-[11px] sm:text-base"
                  >
                    Apply
                  </button>
                )}
              </div>
              
              {appliedCoupon && (
                <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-2 text-green-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-[9px] sm:text-sm">
                    "{appliedCoupon.code}" applied!
                  </span>
                </div>
              )}
            </div>

            {/* Order Items Preview */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <h2 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-4">
                Items ({cart.itemCount})
              </h2>
              
              <div className="space-y-2 sm:space-y-3">
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
                        <p className="text-[8px] sm:text-xs text-black">
                          {item.variant.size} / {item.variant.color} × {item.quantity}
                        </p>
                      )}
                    </div>
                    <span className="font-medium text-black text-sm">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 w-full min-w-0">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 lg:sticky lg:top-20 w-full box-border">
              <h2 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-4">
                Order Summary
              </h2>
              
              <div className="space-y-1.5 sm:space-y-3 text-[9px] sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-black">Subtotal</span>
                  <span className="font-bold text-black">{formatPrice(subtotal)}</span>
                </div>
                
                {/* Shipping Breakdown */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between gap-2 mb-1">
                    <span className="text-black">Shipping</span>
                    {address.state ? (
                      shippingEstimate !== null ? (
                        <span className="font-bold text-black">{formatPrice(shipping)}</span>
                      ) : (
                        <span className="text-[8px] sm:text-xs text-gray-400">Calculating...</span>
                      )
                    ) : (
                      <span className="text-[8px] sm:text-xs text-gray-400">Select state</span>
                    )}
                  </div>
                  {shippingInfo && (
                    <div className="text-[7px] sm:text-xs text-gray-600 space-y-0.5">
                      <p>Carrier: <span className="font-medium">{shippingInfo.carrier}</span></p>
                      <p>Delivery: <span className="font-medium">{shippingInfo.estimatedDays} days</span></p>
                      {shippingInfo.notes && <p className="text-gray-500">{shippingInfo.notes}</p>}
                    </div>
                  )}
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between gap-2 text-green-600">
                    <span>Discount</span>
                    <span className="font-bold text-black">-{formatPrice(discount)}</span>
                  </div>
                )}
                
                <div className="border-t pt-1.5 sm:pt-3 flex justify-between text-xs sm:text-base">
                  <span className="font-semibold text-black">Total</span>
                  <span className="font-bold text-black">
                    {address.state && shippingEstimate !== null
                      ? formatPrice(total)
                      : `${formatPrice(subtotal - discount)}+`
                    }
                  </span>
                </div>
              </div>

              {/* Payment Processor Info */}
              <div className="mt-3 sm:mt-6 p-2 sm:p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                <div className="space-y-1.5">
                  {/* Processor */}
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-[7px] sm:text-xs uppercase tracking-wide font-semibold text-purple-600">Payment Method</p>
                      <p className="text-sm font-bold text-black">
                        {paymentProcessor === 'PAYSTACK' && 'Paystack (Cards, Bank, USSD)'}
                        {paymentProcessor === 'STRIPE' && 'Stripe (Cards)'}
                        {paymentProcessor === 'FLUTTERWAVE' && 'Flutterwave (Cards, Bank)'}
                        {!paymentProcessor && 'Detecting...'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Buyer Location */}
                  <div className="flex items-center gap-2 text-[8px] sm:text-xs text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span>Shipping to: <span className="font-medium text-black">{address.state || 'Select state'}</span></span>
                  </div>
                  
                  {/* Security Badge */}
                  <div className="flex items-center gap-1 text-[7px] sm:text-xs text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    <span>Secure & Encrypted</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !address.state}
                className="w-full mt-3 sm:mt-6 bg-purple-600 text-white py-2 sm:py-3 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Pay {address.state && shippingEstimate !== null 
                      ? formatPrice(total)
                      : formatPrice(subtotal - discount)
                    }</span>
                  </>
                )}
              </button>

              {!address.state && (
                <div className="mt-2 sm:mt-3 flex items-start gap-1 sm:gap-2 text-[8px] sm:text-xs text-amber-600">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
                  <span>Select state to calculate shipping</span>
                </div>
              )}

              <div className="border-t mt-3 sm:mt-6 pt-2 sm:pt-4">
                <Link
                  href="/boutique/cart"
                  className="text-[10px] sm:text-sm text-purple-600 hover:text-purple-700 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  Back
                </Link>
              </div>

              {/* Security Note */}
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-green-50 rounded-lg">
                <div className="flex items-start gap-1 sm:gap-2 text-[8px] sm:text-xs text-green-700">
                  <Info className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
                  <span>
                    Secured by Paystack. Card details not stored.
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
