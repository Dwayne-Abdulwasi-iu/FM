'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { formatNGNPrice } from '@/lib/currency';
import {
  Package,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Filter,
  Search,
  ShoppingBag,
  Settings,
  RotateCcw,
  TrendingDown,
  Star,
} from 'lucide-react';

interface BoutiqueProduct {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  salePrice: number | null;
  status: string;
  displayStatus?: string;
  createdAt: string;
  submittedAt: string | null;
  currentStock?: number;
  fulfillmentMethod?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  media: Array<{
    id: string;
    url: string;
    type: string;
  }>;
  variants: Array<{
    id: string;
    size: string | null;
    color: string | null;
    quantity: number;
  }>;
  _count: {
    orders: number;
    favorites: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Edit className="w-4 h-4" /> },
  PENDING_CONTENT_REVIEW: { label: 'Pending Review', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: <Clock className="w-4 h-4" /> },
  CONTENT_APPROVED: { label: 'Approved - Ship Now', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <Truck className="w-4 h-4" /> },
  SHIPPED_TO_ADMIN: { label: 'Shipped', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: <Truck className="w-4 h-4" /> },
  RECEIVED_BY_ADMIN: { label: 'Received', color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: <Package className="w-4 h-4" /> },
  VERIFICATION_PASSED: { label: 'Verified', color: 'text-teal-600', bgColor: 'bg-teal-100', icon: <CheckCircle className="w-4 h-4" /> },
  LIVE: { label: 'Live', color: 'text-green-600', bgColor: 'bg-green-100', icon: <Eye className="w-4 h-4" /> },
  RETURN_REQUESTED: { label: 'Return Requested', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: <RotateCcw className="w-4 h-4" /> },
  IN_RETURN: { label: 'Approved for Return', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <RotateCcw className="w-4 h-4" /> },
  RETURN_SHIPPED: { label: 'Return Shipped', color: 'text-orange-500', bgColor: 'bg-orange-100', icon: <Truck className="w-4 h-4" /> },
  RETURNED_TO_SELLER: { label: 'Returned Successfully', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: <CheckCircle className="w-4 h-4" /> },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'text-red-600', bgColor: 'bg-red-100', icon: <AlertCircle className="w-4 h-4" /> },
  SOLD: { label: 'Sold', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: <CheckCircle className="w-4 h-4" /> },
  REJECTED: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100', icon: <XCircle className="w-4 h-4" /> },
  CANCELLED: { label: 'Cancelled', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <AlertCircle className="w-4 h-4" /> },
};

export default function SellerBoutiquePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  // Boutique prices are stored in NGN — use direct NGN formatter
  const formatPrice = formatNGNPrice;
  const [products, setProducts] = useState<BoutiqueProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  const fetchPendingActions = useCallback(async () => {
    try {
      const response = await fetch('/api/seller/boutique/pending-actions');
      if (response.ok) {
        const data = await response.json();
        setPendingActionsCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch pending actions:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await fetch(`/api/boutique/seller/products?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch boutique products');
      }
      
      const data = await response.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }
      
      if (data.success === false) {
        throw new Error(data.error || 'Failed to fetch products');
      }
      
      if (!Array.isArray(data.products)) {
        throw new Error('Products data is not an array');
      }
      
      setProducts(data.products);
      setStatusCounts(data.statusCounts && typeof data.statusCounts === 'object' ? data.statusCounts : {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      console.error('Error fetching products:', err);
      setError(message);
      setProducts([]);
      setStatusCounts({});
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchProducts();
      fetchPendingActions();
    }
  }, [statusFilter, authStatus, fetchProducts, fetchPendingActions]);

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      const response = await fetch(`/api/boutique/products/${productId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setProducts(products.filter(p => p.id !== productId));
        toast.success(data.message || 'Product deleted successfully');
      } else {
        toast.error(data.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Network error while deleting product. Please try again.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const totalProducts = Object.values(statusCounts).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Error</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchProducts()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Fashion Boutique</h1>
              <p className="text-purple-200 text-xs sm:text-sm line-clamp-1">Admin verified physical products</p>
            </div>
            <Link
              href="/seller/boutique/upload"
              className="relative flex items-center gap-1 sm:gap-2 bg-white text-purple-600 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-purple-50 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
              {pendingActionsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingActionsCount}
                </span>
              )}
            </Link>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:pb-0 sm:gap-2">
            <div className="group relative">
              <Link
                href="/seller/boutique/warehouse-expiration"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="Manage warehouse inventory cycles"
              >
                <Package className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Warehouse</span>
                <span className="sm:hidden text-[7px] leading-none">Warehouse</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                Manage warehouse inventory cycles
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/warehouse-inventory"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="Track all products in warehouse"
              >
                <Package className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inventory</span>
                <span className="sm:hidden text-[7px] leading-none">Inv.</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                Track all products in warehouse
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/warehouse-returns"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="Manage warehouse return requests"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Wh. Returns</span>
                <span className="sm:hidden text-[7px] leading-none">Ret.</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                Manage warehouse return requests
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/earnings"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="View earnings"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Earnings</span>
                <span className="sm:hidden text-[7px] leading-none">Earn</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                View earnings
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/orders"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="Manage orders"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Orders</span>
                <span className="sm:hidden text-[7px] leading-none">Orders</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                Manage orders
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/shipments"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="Track shipments"
              >
                <Truck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Shipments</span>
                <span className="sm:hidden text-[7px] leading-none">Ship</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                Track shipments
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/returns"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="Manage returns"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Returns</span>
                <span className="sm:hidden text-[7px] leading-none">Returns</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                Manage returns
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/rejected"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="View rejected products"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rejected</span>
                <span className="sm:hidden text-[7px] leading-none">Reject</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                View rejected products
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/out-of-stock"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="View out of stock products"
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sold Out</span>
                <span className="sm:hidden text-[7px] leading-none">Out</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                View out of stock products
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/featured"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="Manage featured products"
              >
                <Star className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Featured</span>
                <span className="sm:hidden text-[7px] leading-none">Featured</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                Manage featured products
              </div>
            </div>
            <div className="group relative">
              <Link
                href="/seller/boutique/settings"
                className="flex flex-col items-center gap-0.5 bg-white/20 backdrop-blur text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-white/30 transition whitespace-nowrap"
                title="Boutique settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden text-[7px] leading-none">Settings</span>
              </Link>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                Boutique settings
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Pending Actions Alert */}
        {pendingActionsCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                {pendingActionsCount} {pendingActionsCount === 1 ? 'Action' : 'Actions'} Needed
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                You have {pendingActionsCount} {pendingActionsCount === 1 ? 'product' : 'products'} awaiting your attention:
              </p>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href="/seller/boutique?status=CONTENT_APPROVED"
                  className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition"
                >
                  <Truck className="w-4 h-4" />
                  Ship Products
                </Link>
                <Link
                  href="/seller/boutique?status=REJECTED"
                  className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition"
                >
                  <Edit className="w-4 h-4" />
                  Revise Rejected
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-4 mb-3 sm:mb-8">
          <button
            onClick={() => setStatusFilter('')}
            className={`p-1.5 sm:p-4 rounded-lg sm:rounded-xl text-left transition-all ${
              statusFilter === '' ? 'ring-2 ring-purple-500 bg-white' : 'bg-white hover:shadow-md'
            }`}
          >
            <p className="text-base sm:text-2xl font-bold text-gray-900">{totalProducts}</p>
            <p className="text-[10px] sm:text-sm text-gray-500">All</p>
          </button>
          
          {Object.entries(STATUS_CONFIG).slice(0, 5).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`p-1.5 sm:p-4 rounded-lg sm:rounded-xl text-left transition-all ${
                statusFilter === status ? 'ring-2 ring-purple-500 bg-white' : 'bg-white hover:shadow-md'
              }`}
            >
              <p className={`text-base sm:text-2xl font-bold ${config.color}`}>
                {statusCounts[status] || 0}
              </p>
              <p className="text-[10px] sm:text-sm text-gray-500 truncate">{config.label}</p>
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-4 mb-3 sm:mb-6 flex flex-col md:flex-row gap-2 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 py-1.5 sm:py-2 text-xs sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Filter className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              aria-label="Filter by product status"
            >
              <option value="" className="text-gray-900">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <option key={status} value={status}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg sm:rounded-xl p-6 sm:p-12 text-center">
            <Package className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">No products yet</h3>
            <p className="text-xs sm:text-base text-gray-500 mb-3 sm:mb-6">Start selling physical fashion items by adding your first product</p>
            <Link
              href="/seller/boutique/upload"
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-purple-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-base font-semibold hover:bg-purple-700"
            >
              <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-4">
            {filteredProducts.map((product) => {
              const primaryImage = product.media[0]?.url;
              
              return (
                <div key={product.id} className="bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div className="flex items-start gap-2.5 sm:gap-0">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {primaryImage ? (
                        <Image
                          src={primaryImage}
                          alt={product.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Package className="w-5 h-5 sm:w-8 sm:h-8" />
                        </div>
                      )}
                    </div>

                    {/* Info - Mobile inline */}
                    <div className="flex-1 min-w-0 sm:hidden">
                      <h3 className="font-semibold text-gray-900 text-xs truncate">{product.title}</h3>
                      <p className="text-[10px] text-gray-500">{product.category.name}</p>
                      <span className="text-sm font-bold text-gray-900">{formatPrice(product.basePrice)}</span>
                    </div>
                  </div>

                  {/* Info - Desktop */}
                  <div className="hidden sm:block flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                    <p className="text-sm text-gray-500">{product.category.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(product.basePrice)}
                      </span>
                      {product.variants.length > 0 && (
                        <span className="text-sm text-gray-500">
                          {product.variants.length} variant{product.variants.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status and Actions Row */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-4">
                    {/* Status Badge */}
                    {(() => {
                      // For ADMINSTOCK products, use currentStock; otherwise sum variants
                      const variantStock = product.variants.reduce((sum, v) => sum + v.quantity, 0);
                      const totalStock = product.fulfillmentMethod === 'ADMIN_STOCK' 
                        ? (product.currentStock || 0) 
                        : variantStock;
                      let displayStatus = product.displayStatus || product.status;
                      if (totalStock === 0 && product.status === 'LIVE' && !product.displayStatus?.includes('RETURN')) {
                        displayStatus = 'OUT_OF_STOCK';
                      }
                      const displayConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.DRAFT;
                      
                      return (
                        <div className={`px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full flex items-center gap-0.5 sm:gap-1.5 ${displayConfig.bgColor} ${displayConfig.color}`}>
                          <span className="[&>svg]:w-3 [&>svg]:h-3 sm:[&>svg]:w-4 sm:[&>svg]:h-4">{displayConfig.icon}</span>
                          <span className="text-[10px] sm:text-sm font-medium">{displayConfig.label}</span>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 sm:gap-2">
                      {product.status === 'DRAFT' && (
                        <>
                          <Link
                            href={`/seller/boutique/upload?edit=${product.id}`}
                            className="p-1 sm:p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1 sm:p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            aria-label="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                          </button>
                        </>
                      )}
                      {product.status === 'CONTENT_APPROVED' && (
                        <Link
                          href={`/seller/boutique/ship/${product.id}`}
                          className="px-2 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-lg text-[10px] sm:text-sm font-medium hover:bg-blue-700"
                        >
                          Ship
                        </Link>
                      )}
                      {product.status === 'LIVE' && (() => {
                        const variantStock = product.variants.reduce((sum, v) => sum + v.quantity, 0);
                        const totalStock = product.fulfillmentMethod === 'ADMIN_STOCK' 
                          ? (product.currentStock || 0) 
                          : variantStock;
                        return totalStock > 0 ? (
                          <Link
                            href={`/boutique/${product.slug}`}
                            className="px-2 sm:px-4 py-1 sm:py-2 bg-green-600 text-white rounded-lg text-[10px] sm:text-sm font-medium hover:bg-green-700"
                          >
                            View
                          </Link>
                        ) : null;
                      })()}
                      {product.status === 'REJECTED' && (
                        <Link
                          href={`/seller/boutique/rejected`}
                          className="px-2 sm:px-4 py-1 sm:py-2 bg-red-600 text-white rounded-lg text-[10px] sm:text-sm font-medium hover:bg-red-700"
                        >
                          Details
                        </Link>
                      )}
                      {['IN_RETURN', 'RETURN_REQUESTED', 'RETURN_SHIPPED', 'RETURNED_TO_SELLER'].includes(product.status) && (
                        <Link
                          href={`/seller/boutique/product-details/${product.id}`}
                          className="px-2 sm:px-4 py-1 sm:py-2 bg-orange-600 text-white rounded-lg text-[10px] sm:text-sm font-medium hover:bg-orange-700"
                        >
                          Details
                        </Link>
                      )}
                      {product.status === 'OUT_OF_STOCK' && (
                        <Link
                          href={`/seller/boutique/product-details/out-of-stock/${product.id}`}
                          className="px-2 sm:px-4 py-1 sm:py-2 bg-red-600 text-white rounded-lg text-[10px] sm:text-sm font-medium hover:bg-red-700"
                        >
                          Details
                        </Link>
                      )}
                      {product.status === 'CANCELLED' && (
                        <Link
                          href={`/seller/boutique/upload?edit=${product.id}`}
                          className="px-2 sm:px-4 py-1 sm:py-2 bg-orange-600 text-white rounded-lg text-[10px] sm:text-sm font-medium hover:bg-orange-700"
                        >
                          Fix
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Workflow Info */}
        <div className="mt-6 sm:mt-12 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-6">
          <h3 className="font-bold text-gray-900 mb-2 sm:mb-4 text-sm sm:text-base">📋 How It Works</h3>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-4">
            {[
              { step: 1, title: 'Upload', desc: '3+ images, 2+ videos' },
              { step: 2, title: 'Review', desc: 'Admin reviews content' },
              { step: 3, title: 'Ship', desc: 'Send to warehouse (7 days)' },
              { step: 4, title: 'Verify', desc: 'Admin checks product' },
              { step: 5, title: 'Live!', desc: 'Available for purchase' },
            ].map((item, index) => (
              <div key={item.step} className="text-center">
                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-1 sm:mb-2 text-xs sm:text-base">
                  {item.step}
                </div>
                <h4 className="font-semibold text-gray-900 text-[10px] sm:text-base">{item.title}</h4>
                <p className="text-[9px] sm:text-sm text-gray-500 hidden sm:block">{item.desc}</p>
                {index < 4 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 text-purple-300">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

