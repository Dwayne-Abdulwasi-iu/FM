'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';

interface BoutiqueProduct {
  id: string;
  title: string;
  basePrice: number;
  salePrice: number | null;
  status: string;
  createdAt: string;
  submittedAt: string | null;
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
  SOLD: { label: 'Sold', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: <CheckCircle className="w-4 h-4" /> },
  REJECTED: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100', icon: <XCircle className="w-4 h-4" /> },
  CANCELLED: { label: 'Cancelled', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <AlertCircle className="w-4 h-4" /> },
};

export default function SellerBoutiquePage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<BoutiqueProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await fetch(`/api/boutique/seller/products?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products);
        setStatusCounts(data.statusCounts);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      const response = await fetch(`/api/boutique/products/${productId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setProducts(products.filter(p => p.id !== productId));
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Fashion Boutique</h1>
              <p className="text-purple-200 mt-0.5 sm:mt-1 text-xs sm:text-base">Sell physical fashion products with admin verification</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/seller/boutique/orders"
                className="flex items-center gap-1.5 bg-white/20 backdrop-blur text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Orders</span>
              </Link>
              <Link
                href="/seller/boutique/upload"
                className="flex items-center gap-1 sm:gap-2 bg-white text-purple-600 px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:bg-purple-50 transition-colors"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Add Product</span>
                <span className="xs:hidden">Add</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
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
              const statusConfig = STATUS_CONFIG[product.status] || STATUS_CONFIG.DRAFT;
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
                      <span className="text-sm font-bold text-gray-900">₦{product.basePrice.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Info - Desktop */}
                  <div className="hidden sm:block flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                    <p className="text-sm text-gray-500">{product.category.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-lg font-bold text-gray-900">
                        ₦{product.basePrice.toLocaleString()}
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
                    <div className={`px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full flex items-center gap-0.5 sm:gap-1.5 ${statusConfig.bgColor} ${statusConfig.color}`}>
                      <span className="[&>svg]:w-3 [&>svg]:h-3 sm:[&>svg]:w-4 sm:[&>svg]:h-4">{statusConfig.icon}</span>
                      <span className="text-[10px] sm:text-sm font-medium">{statusConfig.label}</span>
                    </div>

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
                      {product.status === 'LIVE' && (
                        <Link
                          href={`/boutique/product/${product.id}`}
                          className="px-2 sm:px-4 py-1 sm:py-2 bg-green-600 text-white rounded-lg text-[10px] sm:text-sm font-medium hover:bg-green-700"
                        >
                          View
                        </Link>
                      )}
                      {product.status === 'REJECTED' && (
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
