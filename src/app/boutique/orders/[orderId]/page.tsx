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

export default function BoutiqueOrderDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (authStatus === 'authenticated' && orderId) {
      fetchOrder();
    }
  }, [authStatus, router, orderId]);

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
                >
                  <Copy className="w-4 h-4 text-purple-600" />
                </button>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-purple-100 rounded-lg transition"
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
                      <p className="text-sm text-gray-500">
                        {item.variantSnapshot.size && `Size: ${item.variantSnapshot.size}`}
                        {item.variantSnapshot.size && item.variantSnapshot.color && ' • '}
                        {item.variantSnapshot.color && `Color: ${item.variantSnapshot.color}`}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
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
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{formatPrice(order.shippingCost)}</span>
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
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{order.shippingAddress.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{order.shippingAddress.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span>
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
                  <span className="text-gray-600">Order Placed</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                {order.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Confirmed</span>
                    <span>{formatDate(order.paidAt)}</span>
                  </div>
                )}
                {order.shippedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipped</span>
                    <span>{formatDate(order.shippedAt)}</span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivered</span>
                    <span>{formatDate(order.deliveredAt)}</span>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed</span>
                    <span>{formatDate(order.completedAt)}</span>
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
      </div>
    </div>
  );
}
