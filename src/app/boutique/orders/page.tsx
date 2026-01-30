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
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  ShoppingBag,
  Filter,
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  finalPrice: number;
  variantSnapshot: { size?: string; color?: string } | null;
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
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
  seller: {
    name: string | null;
    displayName: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  PAID: { label: 'Paid', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  PROCESSING: { label: 'Processing', color: 'text-indigo-600 bg-indigo-50', icon: Package },
  SHIPPED: { label: 'Shipped', color: 'text-purple-600 bg-purple-50', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  COMPLETED: { label: 'Completed', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600 bg-red-50', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'text-gray-600 bg-gray-50', icon: XCircle },
};

export default function BoutiqueOrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/boutique/orders');
    } else if (authStatus === 'authenticated') {
      fetchOrders();
    }
  }, [authStatus, router, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await fetch(`/api/boutique/orders?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-6">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
          <Link 
            href="/boutique" 
            className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-gray-900 flex items-center gap-1 sm:gap-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
              <span className="truncate">My Boutique Orders</span>
            </h1>
            <p className="text-[8px] sm:text-xs text-gray-500 mt-0.5">
              Track your physical item orders
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded shadow-sm p-2 sm:p-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 rounded text-[9px] sm:text-xs text-gray-900"
              aria-label="Filter orders by status"
            >
              <option value="">All Orders</option>
              <option value="PAID">Paid</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="text-[8px] sm:text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
              {pagination.total} order{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded shadow-sm p-6 sm:p-8 text-center">
            <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">No orders yet</h2>
            <p className="text-[8px] sm:text-xs text-gray-500 mb-3 sm:mb-4">Start shopping in our boutique</p>
            <Link
              href="/boutique"
              className="inline-flex items-center gap-1.5 bg-purple-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-purple-700 transition text-[9px] sm:text-xs font-medium"
            >
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Browse Boutique
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PROCESSING;
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedOrderId === order.id;
              
              return (
                <div
                  key={order.id}
                  className="bg-white rounded shadow-sm overflow-hidden"
                >
                  {/* Order Header - Clickable to expand */}
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="w-full p-2 sm:p-3 flex items-center justify-between gap-1.5 hover:bg-gray-50 transition"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <span className="font-mono text-[9px] sm:text-xs text-gray-500">
                        #{order.orderNumber}
                      </span>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-0.5">
                        <span className="text-[8px] sm:text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                        <span className="font-semibold text-[9px] sm:text-xs text-purple-600">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                      <span className={`inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-full text-[7px] sm:text-[10px] font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                        <span className="hidden sm:inline">{statusConfig.label}</span>
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-2 sm:px-3 pb-2 sm:pb-3 border-t border-gray-100">
                      {/* Product Items */}
                      <p className="text-[8px] sm:text-[9px] text-gray-500 pt-1.5 mb-1.5">Click an item to view details:</p>
                      <div className="space-y-1.5">
                        {order.items.map((item) => (
                          <Link 
                            key={item.id} 
                            href={`/boutique/products/${item.product.slug}`}
                            className="flex items-start gap-1.5 sm:gap-2 bg-gray-50 rounded p-1.5 hover:bg-gray-100 hover:shadow-sm transition-all"
                          >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden bg-gray-100 relative flex-shrink-0">
                              {item.product.thumbnailUrl ? (
                                <Image
                                  src={item.product.thumbnailUrl}
                                  alt={item.product.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-4 h-4 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] sm:text-xs font-medium text-gray-900 line-clamp-2">{item.product.title}</p>
                              {item.variantSnapshot && (
                                <p className="text-[8px] sm:text-[9px] text-gray-500 mt-0.5">
                                  {item.variantSnapshot.size && `Size: ${item.variantSnapshot.size}`}
                                  {item.variantSnapshot.size && item.variantSnapshot.color && ' • '}
                                  {item.variantSnapshot.color && `Color: ${item.variantSnapshot.color}`}
                                </p>
                              )}
                              <p className="text-[8px] sm:text-[9px] text-gray-500">Qty: {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <p className="font-semibold text-[9px] sm:text-xs text-gray-900">{formatPrice(item.finalPrice)}</p>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            </div>
                          </Link>
                        ))}
                      </div>
                      
                      {/* Seller & Tracking */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-gray-100">
                        <p className="text-[8px] sm:text-[9px] text-gray-500">
                          From {order.seller.displayName || order.seller.name || 'Seller'}
                        </p>
                        {order.trackingNumber && (
                          <div className="flex items-center gap-0.5 text-[8px] sm:text-[9px]">
                            <Truck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600" />
                            <span className="text-gray-600">Track:</span>
                            <span className="font-mono text-purple-600">{order.trackingNumber}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* View Details Link */}
                      <Link
                        href={`/boutique/orders/${order.orderNumber}`}
                        className="mt-1.5 sm:mt-2 w-full flex items-center justify-center gap-0.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-[9px] sm:text-xs font-medium"
                      >
                        View Details
                        <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
