'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Rocket,
  Timer,
  Copy,
} from 'lucide-react';
import { 
  SHIPPING_CARRIERS,
} from '@/lib/boutique/constants';

interface OrderItem {
  id: string;
  quantity: number;
  product: { title: string; thumbnailUrl: string };
  variant: { size: string; color: string } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentMethod: string;
  total: number;
  currency: string;
  createdAt: string;
  sellerShipDeadline: string | null;
  shippedAt: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  isSellerDirect: boolean;
  isOverdue: boolean;
  hoursUntilDeadline: number | null;
  buyer: { name: string; email: string };
  product: { id: string; title: string; slug: string; thumbnailUrl: string };
  items: OrderItem[];
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    phone: string;
  };
}

interface Counts {
  pendingPayment: number;
  paymentFailed: number;
  pendingConfirmation: number;
  awaitingShipment: number;
  shipped: number;
  completed: number;
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: 'text-gray-700', bgColor: 'bg-gray-50', icon: Clock },
  PAYMENT_FAILED: { label: 'Payment Failed', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  PAID: { label: 'New Order', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: Package },
  AWAITING_SELLER_CONFIRMATION: { label: 'Awaiting Confirmation', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'text-purple-700', bgColor: 'bg-purple-50', icon: Package },
  SHIPPED: { label: 'Shipped', color: 'text-indigo-700', bgColor: 'bg-indigo-50', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  COMPLETED: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-50', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
};

const TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'awaiting-payment', label: 'Awaiting Payment' },
  { key: 'pending', label: 'Needs Action' },
  { key: 'processing', label: 'To Ship' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'completed', label: 'Completed' },
];

export default function SellerOrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session?.user) {
      fetchOrders(true); // Initial load - show loading state
    }
  }, [session, activeTab]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (session?.user) {
        fetchOrders();
      }
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, minPrice, maxPrice, session?.user]);

  const _handleSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (session?.user) {
      fetchOrders();
    }
  };

  const fetchOrders = async (isInitialLoad = false) => {
    try {
      // Only show loading state for initial page load, not for search/filter updates
      if (isInitialLoad) {
        setLoading(true);
      }
      let statusParam = '';
      
      switch (activeTab) {
        case 'awaiting-payment':
          statusParam = '&status=PENDING_PAYMENT&status=PAYMENT_FAILED';
          break;
        case 'pending':
          statusParam = '&status=PAID&status=AWAITING_SELLER_CONFIRMATION';
          break;
        case 'processing':
          statusParam = '&status=PROCESSING';
          break;
        case 'shipped':
          statusParam = '&status=SHIPPED';
          break;
        case 'completed':
          statusParam = '&status=COMPLETED';
          break;
      }

      const params = new URLSearchParams();
      
      if (statusParam) {
        const statusParts = statusParam.split('&').filter(p => p.startsWith('status='));
        statusParts.forEach(part => {
          const status = part.replace('status=', '');
          params.append('status', status);
        });
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (minPrice) {
        params.append('minPrice', minPrice);
      }

      if (maxPrice) {
        params.append('maxPrice', maxPrice);
      }

      const response = await fetch(`/api/boutique/seller/orders?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      // Only hide loading if it was an initial load
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const handleAction = async (orderId: string, action: string) => {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { orderId, action };
      
      if (action === 'ship') {
        if (!trackingNumber.trim()) {
          alert('Please enter a tracking number');
          return;
        }
        body.trackingNumber = trackingNumber;
        body.carrier = carrier || 'OTHER';
      }

      const response = await fetch('/api/boutique/seller/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setShowShipModal(false);
        setTrackingNumber('');
        setCarrier('');
        setSelectedOrder(null);
        fetchOrders();
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  const getTabCount = (key: string): number => {
    if (!counts) return 0;
    switch (key) {
      case 'awaiting-payment': return counts.pendingPayment + counts.paymentFailed;
      case 'pending': return counts.pendingConfirmation;
      case 'processing': return counts.awaitingShipment;
      case 'shipped': return counts.shipped;
      case 'completed': return counts.completed;
      case 'all': return counts.total;
      default: return 0;
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-0.5 sm:mt-1 text-xs sm:text-base">Manage your boutique orders</p>
        </div>
      </div>

      {/* Urgent Orders Banner */}
      {orders.some(o => o.isOverdue || (o.hoursUntilDeadline && o.hoursUntilDeadline < 12)) && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3 text-red-800">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium">
                You have orders that need immediate attention!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="flex overflow-x-auto gap-1 py-2 -mx-1 px-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg whitespace-nowrap text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 transition-colors ${
                  activeTab === tab.key
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.key === 'all' ? 'All' : tab.key === 'pending' ? 'Action' : tab.key === 'processing' ? 'Ship' : tab.key}</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                  activeTab === tab.key ? 'bg-purple-200' : 'bg-gray-200'
                }`}>
                  {getTabCount(tab.key)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Order ID, Buyer name, or Product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 pl-9 sm:pl-10 border border-gray-200 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <svg className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Price Range Filter */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="text-[10px] sm:text-xs text-gray-600 font-medium block mb-1">Min Price (₦)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs text-gray-600 font-medium block mb-1">Max Price (₦)</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setMinPrice('');
                      setMaxPrice('');
                    }}
                    className="w-full px-2 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] sm:text-xs font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 sm:p-12 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">No Orders</h3>
            <p className="text-sm text-gray-500 mt-1">No orders in this category</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {orders.map(order => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PAID;
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl overflow-hidden shadow-sm ${
                    order.isOverdue ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  {/* Order Header */}
                  <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${status.bgColor}`}>
                        <StatusIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${status.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm sm:text-base">#{order.orderNumber}</span>
                          {order.isSellerDirect && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-700">
                              <Rocket className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">Direct Ship</span>
                              <span className="xs:hidden">Direct</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()} • {order.buyer.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex items-center sm:block gap-2 mt-1 sm:mt-0">
                      <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-medium ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                      <p className="text-sm sm:text-lg font-bold text-purple-600 sm:mt-1">
                        ₦{order.total.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Deadline Warning */}
                  {order.isSellerDirect && order.status === 'PROCESSING' && (
                    <div className={`px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm ${
                      order.isOverdue 
                        ? 'bg-red-50 text-red-800' 
                        : order.hoursUntilDeadline && order.hoursUntilDeadline < 12 
                          ? 'bg-yellow-50 text-yellow-800'
                          : 'bg-blue-50 text-blue-800'
                    }`}>
                      <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                      {order.isOverdue ? (
                        <span className="font-medium">⚠️ OVERDUE! Ship immediately</span>
                      ) : (
                        <span>
                          <span className="hidden xs:inline">Ship deadline: </span>{order.hoursUntilDeadline?.toFixed(0)}h left
                        </span>
                      )}
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-4">
                      {order.product.thumbnailUrl && (
                        <Image
                          src={order.product.thumbnailUrl}
                          alt={order.product.title}
                          width={80}
                          height={80}
                          className="rounded-lg object-cover w-16 h-16 sm:w-20 sm:h-20"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{order.product.title}</h4>
                        {order.items.map(item => (
                          <p key={item.id} className="text-[10px] sm:text-sm text-gray-500">
                            {item.variant?.size && `Size: ${item.variant.size}`}
                            {item.variant?.size && item.variant?.color && ' • '}
                            {item.variant?.color && `Color: ${item.variant.color}`}
                            {' • Qty: '}{item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-t">
                    <p className="text-[9px] sm:text-sm font-medium text-gray-700">Ship to:</p>
                    <p className="text-[9px] sm:text-sm text-gray-600">
                      {order.shippingAddress?.name} • {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state}
                    </p>
                  </div>

                  {/* Tracking Info (if shipped) */}
                  {order.trackingNumber && (
                    <div className="px-3 sm:px-4 py-2 sm:py-3 bg-green-50 border-t flex items-center justify-between">
                      <div>
                        <p className="text-[10px] sm:text-sm font-medium text-green-800">Tracking:</p>
                        <p className="text-[10px] sm:text-sm text-green-700 font-mono">{order.trackingNumber}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(order.trackingNumber!)}
                        className="p-1.5 sm:p-2 hover:bg-green-100 rounded-lg"
                        aria-label="Copy tracking number"
                      >
                        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-700" />
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  {order.isSellerDirect && ['PAID', 'AWAITING_SELLER_CONFIRMATION', 'PROCESSING'].includes(order.status) && (
                    <div className="p-3 sm:p-4 border-t bg-gray-50 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleAction(order.id, 'cancel')}
                        disabled={actionLoading}
                        className="px-2 sm:px-4 py-1.5 sm:py-2 text-red-600 hover:bg-red-50 rounded-lg text-[10px] sm:text-sm"
                      >
                        Cancel
                      </button>
                      <div className="flex gap-1.5 sm:gap-2">
                        {(order.status === 'PAID' || order.status === 'AWAITING_SELLER_CONFIRMATION') && (
                          <button
                            onClick={() => handleAction(order.id, 'confirm')}
                            disabled={actionLoading}
                            className="px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg text-[10px] sm:text-sm hover:bg-blue-700"
                          >
                            Confirm
                          </button>
                        )}
                        {order.status === 'PROCESSING' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowShipModal(true);
                            }}
                            disabled={actionLoading}
                            className="px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg text-[10px] sm:text-sm hover:bg-purple-700"
                          >
                            <span className="hidden xs:inline">Mark as </span>Shipped
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ship Modal */}
      {showShipModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Mark Order as Shipped
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Order #{selectedOrder.orderNumber} for {selectedOrder.buyer.name}
            </p>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Shipping Carrier
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  aria-label="Select shipping carrier"
                >
                  <option value="">Select carrier</option>
                  {SHIPPING_CARRIERS.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => {
                  setShowShipModal(false);
                  setTrackingNumber('');
                  setCarrier('');
                }}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedOrder.id, 'ship')}
                disabled={actionLoading || !trackingNumber.trim()}
                className="flex-1 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
