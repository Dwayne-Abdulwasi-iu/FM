'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Package, 
  ArrowLeft, 
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';

interface Payout {
  id: string;
  amount: number;
  status: string;
  reference: string;
  createdAt: string;
  paidAt: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  sellerPayout: number;
  platformFee: number;
  createdAt: string;
  completedAt: string | null;
  items: Array<{
    quantity: number;
    product: { title: string; thumbnailUrl: string | null };
  }>;
}

interface EarningsData {
  summary: {
    totalEarnings: number;
    periodEarnings: number;
    pendingEarnings: number;
    availableBalance: number;
    totalPaidOut: number;
  };
  payouts: Payout[];
  recentOrders: Order[];
  ordersByStatus: Array<{ status: string; count: number; earnings: number }>;
  period: number;
}

export default function SellerBoutiqueEarningsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/seller/boutique/earnings');
    } else if (authStatus === 'authenticated') {
      fetchEarnings();
    }
  }, [authStatus, router, period]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boutique/seller/earnings?period=${period}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!session || !data) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/seller/boutique" 
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-purple-600" />
                Boutique Earnings
              </h1>
              <p className="text-sm text-gray-500">
                Track your physical product sales and payouts
              </p>
            </div>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                Period
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(data.summary.periodEarnings)}
            </p>
            <p className="text-sm text-gray-500">Last {data.period} days</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(data.summary.totalEarnings)}
            </p>
            <p className="text-sm text-gray-500">Total Earnings</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(data.summary.pendingEarnings)}
            </p>
            <p className="text-sm text-gray-500">Pending (In Transit)</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(data.summary.availableBalance)}
            </p>
            <p className="text-sm text-gray-500">Available Balance</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
              <Link href="/seller/boutique/orders" className="text-sm text-purple-600 hover:text-purple-700">
                View all
              </Link>
            </div>
            
            {data.recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No sales yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.slice(0, 8).map((order) => (
                  <Link
                    key={order.id}
                    href={`/seller/boutique/orders?order=${order.orderNumber}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 relative shrink-0">
                      {order.items[0]?.product.thumbnailUrl ? (
                        <Image
                          src={order.items[0].product.thumbnailUrl}
                          alt=""
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
                      <p className="text-sm font-medium text-gray-900 truncate">
                        #{order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +{formatPrice(order.sellerPayout)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        order.status === 'DELIVERED' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'SHIPPED' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Payout History */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
              <span className="text-sm text-gray-500">
                Total: {formatPrice(data.summary.totalPaidOut)}
              </span>
            </div>
            
            {data.payouts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No payouts yet</p>
                <p className="text-xs mt-1">Payouts are processed automatically</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payout.status === 'COMPLETED' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {payout.status === 'COMPLETED' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(payout.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payout.status === 'COMPLETED' && payout.paidAt
                          ? `Paid ${formatDate(payout.paidAt)}`
                          : `Pending • ${formatDate(payout.createdAt)}`
                        }
                      </p>
                    </div>
                    <span className="text-xs font-mono text-gray-400">
                      {payout.reference.slice(0, 12)}...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Earnings by Status */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Earnings by Order Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.ordersByStatus.map((stat) => (
              <div key={stat.status} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">{stat.status}</p>
                <p className="text-lg font-bold text-gray-900">{stat.count}</p>
                <p className="text-sm text-green-600">{formatPrice(stat.earnings)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
