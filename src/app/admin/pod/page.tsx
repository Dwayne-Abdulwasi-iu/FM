'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PODOrder {
  id: string;
  orderNumber: string;
  status: string;
  podStatus: string;
  podProvider: string;
  podOrderId: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  totalAmount: number;
  createdAt: string;
  customer: {
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    podProductName: string;
    quantity: number;
    price: number;
  }>;
}

interface PODStats {
  totalOrders: number;
  pendingOrders: number;
  inProductionOrders: number;
  shippedOrders: number;
  totalRevenue: number;
  totalPlatformFees: number;
  byProvider: {
    printful: number;
    printify: number;
    other: number;
  };
}

export default function AdminPODPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [orders, setOrders] = useState<PODOrder[]>([]);
  const [stats, setStats] = useState<PODStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, statsRes] = await Promise.all([
          fetch('/api/admin/pod/orders'),
          fetch('/api/admin/pod/stats')
        ]);
        
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data.orders || []);
        }
        
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch POD data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (session?.user?.role === 'ADMIN') {
      fetchData();
    }
  }, [session]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_production': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-green-200 text-green-900';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">POD Management</h1>
            <p className="text-gray-600">Monitor and manage Print-on-Demand orders across all providers</p>
          </div>
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            ← Back to Admin
          </Link>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Total POD Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-200">
              <p className="text-sm text-yellow-700">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.pendingOrders}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-200">
              <p className="text-sm text-blue-700">In Production</p>
              <p className="text-2xl font-bold text-blue-800">{stats.inProductionOrders}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
              <p className="text-sm text-green-700">Shipped</p>
              <p className="text-2xl font-bold text-green-800">{stats.shippedOrders}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 shadow-sm border border-purple-200">
              <p className="text-sm text-purple-700">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-800">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 shadow-sm border border-indigo-200">
              <p className="text-sm text-indigo-700">Platform Fees</p>
              <p className="text-2xl font-bold text-indigo-800">{formatCurrency(stats.totalPlatformFees)}</p>
            </div>
          </div>
        )}

        {/* Provider Stats */}
        {stats && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Provider</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{stats.byProvider.printful}</p>
                <p className="text-sm text-gray-600 mt-1">Printful</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{stats.byProvider.printify}</p>
                <p className="text-sm text-gray-600 mt-1">Printify</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{stats.byProvider.other}</p>
                <p className="text-sm text-gray-600 mt-1">Other</p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Role Explanation */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-8 text-white">
          <h2 className="text-lg font-bold mb-3">🔐 Admin Role in POD Process</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">What Admins Do:</h3>
              <ul className="space-y-1 text-sm text-purple-100">
                <li>• Monitor all POD orders across providers</li>
                <li>• Handle escalated customer issues</li>
                <li>• Configure POD provider API keys</li>
                <li>• Set platform commission rates per tier</li>
                <li>• Review and approve seller POD setups</li>
                <li>• Access analytics and revenue reports</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What&apos;s Automated:</h3>
              <ul className="space-y-1 text-sm text-purple-100">
                <li>✓ Order creation with Printful/Printify</li>
                <li>✓ Payment processing & webhook handling</li>
                <li>✓ Tiered commission calculation</li>
                <li>✓ Seller earnings distribution</li>
                <li>✓ Tracking updates from providers</li>
                <li>✓ Customer notifications</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white"
            aria-label="Filter by order status"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_production">In Production</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white"
            aria-label="Filter by POD provider"
          >
            <option value="all">All Providers</option>
            <option value="printful">Printful</option>
            <option value="printify">Printify</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No POD orders yet. Orders will appear here when customers purchase POD products.
                  </td>
                </tr>
              ) : (
                orders
                  .filter(o => statusFilter === 'all' || o.podStatus === statusFilter)
                  .filter(o => providerFilter === 'all' || o.podProvider === providerFilter)
                  .map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-gray-900">{order.customer.name}</p>
                        <p className="text-sm text-gray-500">{order.customer.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                          {order.podProvider || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.podStatus)}`}>
                          {order.podStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.trackingUrl ? (
                          <a 
                            href={order.trackingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-800 text-sm"
                          >
                            {order.trackingNumber || 'Track'}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">No tracking</span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Commission Tiers Info */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💰 POD Commission Tiers</h2>
          <p className="text-gray-600 mb-4">
            POD sales use the same tiered commission system as digital sales. 
            Sellers earn more as they sell more!
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Tier</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Total Earnings</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Platform Fee</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Seller Keeps</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="bg-green-50">
                  <td className="px-4 py-2 font-medium">🌱 Starter</td>
                  <td className="px-4 py-2">$0 - $99</td>
                  <td className="px-4 py-2 text-green-600 font-bold">0.1%</td>
                  <td className="px-4 py-2">99.9%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">📦 New Seller</td>
                  <td className="px-4 py-2">$100 - $499</td>
                  <td className="px-4 py-2">10%</td>
                  <td className="px-4 py-2">90%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">🥉 Bronze</td>
                  <td className="px-4 py-2">$500 - $2,499</td>
                  <td className="px-4 py-2">9.5%</td>
                  <td className="px-4 py-2">90.5%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">🥈 Silver</td>
                  <td className="px-4 py-2">$2,500 - $9,999</td>
                  <td className="px-4 py-2">9%</td>
                  <td className="px-4 py-2">91%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">🥇 Gold</td>
                  <td className="px-4 py-2">$10,000 - $49,999</td>
                  <td className="px-4 py-2">8.5%</td>
                  <td className="px-4 py-2">91.5%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">💎 Platinum</td>
                  <td className="px-4 py-2">$50,000 - $99,999</td>
                  <td className="px-4 py-2">8%</td>
                  <td className="px-4 py-2">92%</td>
                </tr>
                <tr className="bg-purple-50">
                  <td className="px-4 py-2 font-medium">👑 Diamond</td>
                  <td className="px-4 py-2">$100,000+</td>
                  <td className="px-4 py-2 text-purple-600 font-bold">7%</td>
                  <td className="px-4 py-2">93%</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">
              * VIP/VVIP sellers get an additional 1% discount (minimum 6%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
