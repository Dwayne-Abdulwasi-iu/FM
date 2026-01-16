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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/boutique" 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-600" />
              My Boutique Orders
            </h1>
            <p className="text-sm text-gray-500">
              Track your physical item orders
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-900"
            >
              <option value="">All Orders</option>
              <option value="PAID">Paid</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="text-sm text-gray-500">
              {pagination.total} order{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">Start shopping in our boutique</p>
            <Link
              href="/boutique"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              <Package className="w-5 h-5" />
              Browse Boutique
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PROCESSING;
              const StatusIcon = statusConfig.icon;
              
              return (
                <Link
                  key={order.id}
                  href={`/boutique/orders/${order.orderNumber}`}
                  className="block bg-white rounded-lg shadow-sm hover:shadow-md transition"
                >
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-gray-500">
                        #{order.orderNumber}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{formatDate(order.createdAt)}</span>
                      <span className="font-semibold text-purple-600">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Product Images */}
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div 
                            key={item.id}
                            className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border-2 border-white relative"
                            style={{ zIndex: 3 - idx }}
                          >
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
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {order.items.map(i => i.product.title).join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''} • 
                          From {order.seller.displayName || order.seller.name || 'Seller'}
                        </p>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    {/* Tracking Info */}
                    {order.trackingNumber && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                        <Truck className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-600">Tracking:</span>
                        <span className="font-mono text-purple-600">{order.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
