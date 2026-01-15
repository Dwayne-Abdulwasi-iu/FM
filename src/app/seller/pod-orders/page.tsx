'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface PODOrder {
  id: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  orderItems: OrderItem[];
  user: {
    name: string;
    email: string;
  };
  shippingAddress?: {
    name: string;
    city: string;
    country: string;
  };
  podOrderId?: string;
  podProvider?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  podProductName?: string;
  podVariantName?: string;
  podOrderId?: string;
  design: {
    id: string;
    title: string;
    imageUrl: string;
  };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
  PRINTING: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Printing' },
  SHIPPED: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Shipped' },
  DELIVERED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
};

const STATUS_FILTERS = [
  { value: '', label: 'All Orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PRINTING', label: 'Printing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
];

export default function PODOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<PODOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PODOrder | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch POD orders
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        params.set('page', pagination.page.toString());
        params.set('limit', pagination.limit.toString());

        const res = await fetch(`/api/pod/orders?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
          if (data.pagination) {
            setPagination(prev => ({ ...prev, ...data.pagination }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      fetchOrders();
    }
  }, [session, statusFilter, pagination.page, pagination.limit]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusStyle = (status: string) => {
    return STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Print-on-Demand Orders</h1>
              <p className="text-gray-600 text-sm mt-1">
                Track and manage orders for your designs printed on products
              </p>
            </div>
            <Link
              href="/seller/pod-products"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white 
                       rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Manage POD Products
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Processing</p>
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'PROCESSING' || o.status === 'PRINTING').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Shipped</p>
            <p className="text-2xl font-bold text-indigo-600">
              {orders.filter(o => o.status === 'SHIPPED').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Delivered</p>
            <p className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'DELIVERED').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(filter => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${statusFilter === filter.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No POD orders yet</h3>
            <p className="text-gray-500 mb-4">
              When customers order products with your designs, they&apos;ll appear here.
            </p>
            <Link
              href="/seller/pod-products"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white 
                       rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Set Up POD Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const statusStyle = getStatusStyle(order.status);
              
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Order Header */}
                  <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">Order #{order.id.slice(-8).toUpperCase()}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(order.createdAt)} • {order.user.name || order.user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-900">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg 
                          className={`w-5 h-5 transition-transform ${selectedOrder?.id === order.id ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="px-6 py-4">
                    <div className="flex gap-4 overflow-x-auto">
                      {order.orderItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 flex-shrink-0">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={item.design.imageUrl || '/placeholder-design.jpg'}
                              alt={item.design.title}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">
                              {item.podProductName || item.design.title}
                            </p>
                            {item.podVariantName && (
                              <p className="text-xs text-gray-500">{item.podVariantName}</p>
                            )}
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedOrder?.id === order.id && (
                    <div className="px-6 py-4 bg-gray-50 border-t">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Shipping Info */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping Information</h4>
                          {order.shippingAddress ? (
                            <div className="text-sm text-gray-600">
                              <p>{order.shippingAddress.name}</p>
                              <p>{order.shippingAddress.city}, {order.shippingAddress.country}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No shipping address</p>
                          )}
                          
                          {order.trackingNumber && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-1">Tracking</h4>
                              {order.trackingUrl ? (
                                <a
                                  href={order.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-purple-600 hover:text-purple-700"
                                >
                                  {order.trackingNumber} →
                                </a>
                              ) : (
                                <p className="text-sm text-gray-600">{order.trackingNumber}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Order Items Details */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Items</h4>
                          <div className="space-y-2">
                            {order.orderItems.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.podProductName || item.design.title} × {item.quantity}
                                </span>
                                <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* POD Provider Info */}
                      {order.podProvider && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              Fulfilled by: <span className="font-medium text-gray-700 capitalize">{order.podProvider}</span>
                            </span>
                            {order.podOrderId && (
                              <span className="text-sm text-gray-500">
                                POD Order: {order.podOrderId}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
