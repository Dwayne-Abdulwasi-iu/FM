'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Package, 
  ArrowLeft, 
  Truck,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  User,
  ExternalLink,
  Copy,
  AlertCircle,
  RotateCcw,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  finalPrice: number;
  variantSnapshot: { size?: string; color?: string; colorHex?: string } | null;
  product: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  discount: number;
  platformFee: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  items: OrderItem[];
  seller: {
    id: string;
    name: string | null;
    displayName: string | null;
    image: string | null;
  };
  boutiqueReturn: { id: string; status: string } | null;
  boutiqueRefund: { id: string; status: string; amount: number } | null;
}

const STATUS_STEPS = [
  { key: 'PAID', label: 'Order Placed', icon: CheckCircle },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: MapPin },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle },
];

const STATUS_ORDER = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

const getReturnWindowInfo = (deliveredAt: string | null) => {
  if (!deliveredAt) return { daysRemaining: 0, isOpen: false };
  
  const delivered = new Date(deliveredAt).getTime();
  const now = Date.now();
  const daysSinceDelivery = Math.floor((now - delivered) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 7 - daysSinceDelivery);
  
  return {
    daysRemaining,
    isOpen: daysRemaining > 0,
  };
};

export default function BoutiqueOrderDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDescription, setReturnDescription] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (authStatus === 'authenticated' && orderId) {
      fetchOrder();
    }
  }, [authStatus, router, orderId]);

  const confirmDelivery = async () => {
    setConfirming(true);
    try {
      const response = await fetch(`/api/boutique/orders/${orderId}/confirm`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Order confirmed! Thank you for your purchase.');
        fetchOrder();
      } else {
        toast.error(data.message || 'Failed to confirm delivery');
      }
    } catch (_error) {
      toast.error('Failed to confirm delivery');
    } finally {
      setConfirming(false);
    }
  };

  const submitReturnRequest = async () => {
    if (!returnReason || !selectedItemId || !returnDescription.trim()) {
      toast.error('Please select an item, provide a reason, and add a description');
      return;
    }
    setConfirming(true);
    try {
      const response = await fetch('/api/boutique/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: selectedItemId,
          reason: returnReason,
          description: returnDescription,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Return request submitted!');
        setShowReturnModal(false);
        fetchOrder();
      } else {
        toast.error(data.message || 'Failed to submit return request');
      }
    } catch (_error) {
      toast.error('Failed to submit return request');
    } finally {
      setConfirming(false);
    }
  };

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/boutique/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrder(data.order);
      } else {
        toast.error(data.message || 'Order not found');
        router.push('/boutique/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIndex = (status: string) => {
    const idx = STATUS_ORDER.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session || !order) return null;

  const currentStatusIndex = getStatusIndex(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/boutique/orders" 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <p className="text-sm text-gray-500 font-mono">#{order.orderNumber}</p>
          </div>
        </div>

        {/* Status Banner */}
        {isCancelled ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">
                  Order {order.status === 'REFUNDED' ? 'Refunded' : 'Cancelled'}
                </h3>
                {order.boutiqueRefund && (
                  <p className="text-sm text-red-700">
                    Refund amount: {formatPrice(order.boutiqueRefund.amount)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
            <div className="relative">
              <div className="flex justify-between">
                {STATUS_STEPS.map((step, _idx) => {
                  const isCompleted = currentStatusIndex >= STATUS_ORDER.indexOf(step.key);
                  const isCurrent = order.status === step.key;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-purple-100' : ''}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`mt-2 text-xs text-center ${
                        isCompleted ? 'text-purple-600 font-medium' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" style={{ marginLeft: '5%', marginRight: '5%' }}>
                <div 
                  className="h-full bg-purple-600 transition-all"
                  style={{ width: `${Math.min(currentStatusIndex / (STATUS_STEPS.length - 1) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tracking Info */}
        {order.trackingNumber && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-medium text-purple-900">Tracking Number</h3>
                  <p className="font-mono text-purple-700">{order.trackingNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(order.trackingNumber!, 'Tracking number')}
                  className="p-2 hover:bg-purple-100 rounded-lg transition"
                  aria-label="Copy tracking number"
                >
                  <Copy className="w-4 h-4 text-purple-600" />
                </button>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-purple-100 rounded-lg transition"
                    aria-label="Track shipment on carrier website"
                  >
                    <ExternalLink className="w-4 h-4 text-purple-600" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Items ({order.items.length})
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <Link href={`/boutique/${item.product.slug}`}>
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative shrink-0">
                      {item.product.thumbnailUrl ? (
                        <Image
                          src={item.product.thumbnailUrl}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/boutique/${item.product.slug}`}
                      className="font-medium text-gray-900 hover:text-purple-600 line-clamp-1"
                    >
                      {item.product.title}
                    </Link>
                    {item.variantSnapshot && (
                      <p className="text-sm text-gray-900">
                        {item.variantSnapshot.size && `Size: ${item.variantSnapshot.size}`}
                        {item.variantSnapshot.size && item.variantSnapshot.color && ' • '}
                        {item.variantSnapshot.color && `Color: ${item.variantSnapshot.color}`}
                      </p>
                    )}
                    <p className="text-sm text-gray-900">Qty: {item.quantity}</p>
                    <p className="font-medium text-gray-900 mt-1">
                      {formatPrice(item.finalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Pricing */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-900">Subtotal</span>
                  <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900">Shipping</span>
                  <span className="text-gray-900">{formatPrice(order.shippingCost)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-purple-600">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-900" />
                  <span className="text-gray-900">{order.shippingAddress.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-900" />
                  <span className="text-gray-900">{order.shippingAddress.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-900 mt-0.5" />
                  <span className="text-gray-900">
                    {order.shippingAddress.street}<br />
                    {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                    {order.shippingAddress.country}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-900">Order Placed</span>
                  <span className="text-gray-900">{formatDate(order.createdAt)}</span>
                </div>
                {order.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Payment Confirmed</span>
                    <span className="text-gray-900">{formatDate(order.paidAt)}</span>
                  </div>
                )}
                {order.shippedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Shipped</span>
                    <span className="text-gray-900">{formatDate(order.shippedAt)}</span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Delivered</span>
                    <span className="text-gray-900">{formatDate(order.deliveredAt)}</span>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Completed</span>
                    <span className="text-gray-900">{formatDate(order.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Need Help?</h3>
              <p className="text-sm text-amber-700 mt-1">
                If you have any issues with your order, please{' '}
                <Link href="/contact" className="underline">contact our support team</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Confirm Delivery / Request Return */}
        {!isCancelled && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {/* Confirm Delivery - Only show when DELIVERED status */}
            {order.status === 'DELIVERED' && (
              <button
                onClick={confirmDelivery}
                disabled={confirming}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                {confirming ? 'Confirming...' : 'Confirm Delivery'}
              </button>
            )}

            {/* Request Return - Show for DELIVERED or COMPLETED orders */}
            {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && !order.boutiqueReturn && (() => {
              const returnWindow = getReturnWindowInfo(order.deliveredAt);
              return returnWindow.isOpen ? (
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-amber-300 bg-amber-50 text-amber-900 py-3 px-6 rounded-lg hover:bg-amber-100 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Request Return
                  </div>
                  <span className="text-xs font-normal">
                    {returnWindow.daysRemaining} day{returnWindow.daysRemaining !== 1 ? 's' : ''} remaining
                  </span>
                </button>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-gray-200 bg-gray-50 text-gray-500 py-3 px-6 rounded-lg font-medium cursor-not-allowed">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Return window closed
                  </div>
                  <span className="text-xs font-normal">
                    (7 days from delivery)
                  </span>
                </div>
              );
            })()}

            {/* Leave Review - Show for COMPLETED orders */}
            {order.status === 'COMPLETED' && (
              <Link
                href={`/boutique/${order.items[0]?.product.slug}#reviews`}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 font-medium"
              >
                <Star className="w-5 h-5" />
                Leave a Review
              </Link>
            )}
          </div>
        )}

        {/* Return Status Banner */}
        {order.boutiqueReturn && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">Return Request</h3>
                <p className="text-sm text-blue-700">
                  Status: {order.boutiqueReturn.status.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Request Return</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="returnItemSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Item
                </label>
                <select
                  id="returnItemSelect"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                >
                  <option value="" className="text-gray-900">Choose an item...</option>
                  {order.items.map((item) => (
                    <option key={item.id} value={item.id} className="text-gray-900">
                      {item.product.title} (Qty: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="returnReasonSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Return
                </label>
                <select
                  id="returnReasonSelect"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                >
                  <option value="" className="text-gray-900">Select a reason...</option>
                  <option value="WRONG_SIZE" className="text-gray-900">Wrong Size</option>
                  <option value="DEFECTIVE" className="text-gray-900">Defective/Damaged</option>
                  <option value="NOT_AS_DESCRIBED" className="text-gray-900">Not as Described</option>
                  <option value="WRONG_ITEM" className="text-gray-900">Wrong Item Received</option>
                  <option value="CHANGED_MIND" className="text-gray-900">Changed My Mind</option>
                  <option value="OTHER" className="text-gray-900">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  placeholder="Provide details about your return request..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReturnModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReturnRequest}
                disabled={confirming || !returnReason || !selectedItemId || !returnDescription.trim()}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {confirming ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
