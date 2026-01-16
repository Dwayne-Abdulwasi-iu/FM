'use client';

import { useState, useEffect } from 'react';
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
  ChevronRight,
  Search,
  Filter,
  Rocket,
  Warehouse,
  Timer,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { 
  FULFILLMENT_METHOD, 
  FULFILLMENT_CONFIG,
  SHIPPING_CARRIERS,
  BOUTIQUE_DEFAULTS,
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
  pendingConfirmation: number;
  awaitingShipment: number;
  shipped: number;
  completed: number;
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
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

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session?.user) {
      fetchOrders();
    }
  }, [session, activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let statusParam = '';
      
      switch (activeTab) {
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

      const response = await fetch(`/api/boutique/seller/orders?${statusParam}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
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
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Manage your boutique orders</p>
        </div>
      </div>

      {/* Urgent Orders Banner */}
      {orders.some(o => o.isOverdue || (o.hoursUntilDeadline && o.hoursUntilDeadline < 12)) && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                You have orders that need immediate attention!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeTab === tab.key
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-purple-200' : 'bg-gray-200'
                }`}>
                  {getTabCount(tab.key)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No Orders</h3>
            <p className="text-gray-500 mt-1">No orders in this category</p>
          </div>
        ) : (
          <div className="space-y-4">
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
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${status.bgColor}`}>
                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">#{order.orderNumber}</span>
                          {order.isSellerDirect && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              <Rocket className="w-3 h-3" />
                              Direct Ship
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()} • {order.buyer.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                      <p className="text-lg font-bold text-purple-600 mt-1">
                        ₦{order.total.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Deadline Warning */}
                  {order.isSellerDirect && order.status === 'PROCESSING' && (
                    <div className={`px-4 py-2 flex items-center gap-2 text-sm ${
                      order.isOverdue 
                        ? 'bg-red-50 text-red-800' 
                        : order.hoursUntilDeadline && order.hoursUntilDeadline < 12 
                          ? 'bg-yellow-50 text-yellow-800'
                          : 'bg-blue-50 text-blue-800'
                    }`}>
                      <Timer className="w-4 h-4" />
                      {order.isOverdue ? (
                        <span className="font-medium">⚠️ OVERDUE! Ship immediately to avoid penalties.</span>
                      ) : (
                        <span>
                          Ship deadline: {order.hoursUntilDeadline?.toFixed(0)} hours remaining
                        </span>
                      )}
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {order.product.thumbnailUrl && (
                        <Image
                          src={order.product.thumbnailUrl}
                          alt={order.product.title}
                          width={80}
                          height={80}
                          className="rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{order.product.title}</h4>
                        {order.items.map(item => (
                          <p key={item.id} className="text-sm text-gray-500">
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
                  <div className="px-4 py-3 bg-gray-50 border-t">
                    <p className="text-sm font-medium text-gray-700">Ship to:</p>
                    <p className="text-sm text-gray-600">
                      {order.shippingAddress?.name} • {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state}
                    </p>
                    <p className="text-sm text-gray-600">📞 {order.shippingAddress?.phone}</p>
                  </div>

                  {/* Tracking Info (if shipped) */}
                  {order.trackingNumber && (
                    <div className="px-4 py-3 bg-green-50 border-t flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Tracking Number:</p>
                        <p className="text-sm text-green-700 font-mono">{order.trackingNumber}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(order.trackingNumber!)}
                        className="p-2 hover:bg-green-100 rounded-lg"
                      >
                        <Copy className="w-4 h-4 text-green-700" />
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  {order.isSellerDirect && ['PAID', 'AWAITING_SELLER_CONFIRMATION', 'PROCESSING'].includes(order.status) && (
                    <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                      <button
                        onClick={() => handleAction(order.id, 'cancel')}
                        disabled={actionLoading}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                      >
                        Cancel Order
                      </button>
                      <div className="flex gap-2">
                        {(order.status === 'PAID' || order.status === 'AWAITING_SELLER_CONFIRMATION') && (
                          <button
                            onClick={() => handleAction(order.id, 'confirm')}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                          >
                            Confirm Order
                          </button>
                        )}
                        {order.status === 'PROCESSING' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowShipModal(true);
                            }}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                          >
                            Mark as Shipped
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Mark Order as Shipped
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Order #{selectedOrder.orderNumber} for {selectedOrder.buyer.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Carrier
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select carrier</option>
                  {SHIPPING_CARRIERS.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowShipModal(false);
                  setTrackingNumber('');
                  setCarrier('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedOrder.id, 'ship')}
                disabled={actionLoading || !trackingNumber.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
