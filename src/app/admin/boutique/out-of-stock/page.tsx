'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Calendar, TrendingDown, ArrowLeft, Filter, ChevronDown } from 'lucide-react';

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  quantity: number;
  soldOutAt: string | null;
}

interface MediaFile {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  isPrimary: boolean;
}

interface Seller {
  id: string;
  name: string;
  email: string;
}

interface OutOfStockProduct {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  originalQuantity: number;
  currentStock: number;
  outOfStockAt: string;
  createdAt: string;
  imageUrl: string | null;
  media: MediaFile[];
  totalOrders: number;
  fulfillmentMethod: string;
  seller: Seller;
  variants: Variant[];
}

export default function AdminOutOfStockPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<OutOfStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sellerId, setSellerId] = useState('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchProducts();
    }
  }, [page, sellerId, status, session]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `/api/boutique/admin/out-of-stock?page=${page}&limit=20`;
      if (sellerId) {
        url += `&sellerId=${sellerId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch out-of-stock products');
      }

      const data = await response.json();
      setProducts(data.products);
      setTotalPages(data.pagination.totalPages);

      // Extract unique sellers for filter
      if (page === 1) {
        const uniqueSellers = Array.from(
          new Map(data.products.map((p: OutOfStockProduct) => [p.seller.id, p.seller])).values()
        );
        setSellers(uniqueSellers as Seller[]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not recorded';
    const date = new Date(dateString);
    // Check if it's epoch time (Jan 1, 1970)
    if (date.getFullYear() === 1970) return 'Not recorded';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysSinceLaunch = (createdAt: string) => {
    const launch = new Date(createdAt);
    const today = new Date();
    const diff = today.getTime() - launch.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const toggleExpanded = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sold-out products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Out-of-Stock Products</h1>
          <p className="text-gray-600">Monitor all products that have sold out across the marketplace</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Seller</label>
              <select
                value={sellerId}
                onChange={(e) => {
                  setSellerId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Sellers</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} ({seller.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sold Out Products</h3>
            <p className="text-gray-600">There are currently no out-of-stock products in the marketplace.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6 flex flex-col sm:flex-row gap-4">
                  {/* Image */}
                  <div className="w-full sm:w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{product.title}</h3>
                        <p className="text-sm text-gray-500">₦{product.basePrice.toLocaleString()}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                        <TrendingDown className="w-4 h-4" />
                        Sold Out
                      </span>
                    </div>

                    {/* Seller Info */}
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <p className="text-sm">
                        <span className="text-gray-600">Seller: </span>
                        <span className="font-medium text-gray-900">{product.seller.name}</span>
                        <span className="text-gray-500 ml-2">({product.seller.email})</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Fulfillment: <span className="font-medium">{product.fulfillmentMethod}</span>
                      </p>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <p className="text-xs text-gray-600">Original Stock</p>
                        <p className="text-lg font-bold text-gray-900">{product.originalQuantity || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <p className="text-xs text-gray-600">Total Orders</p>
                        <p className="text-lg font-bold text-gray-900">{product.totalOrders}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <p className="text-xs text-gray-600">Days to Sell</p>
                        <p className="text-lg font-bold text-gray-900">{getDaysSinceLaunch(product.createdAt)}</p>
                      </div>
                    </div>

                    {/* Expand Details Button */}
                    <button
                      onClick={() => toggleExpanded(product.id)}
                      className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                      {expandedProducts.has(product.id) ? (
                        <>
                          <ChevronDown className="w-4 h-4 rotate-180" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          View Details
                        </>
                      )}
                    </button>

                    {/* Expanded Details */}
                    {expandedProducts.has(product.id) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {/* Dates Section */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                          <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Timeline
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Listed:</span>
                              <span className="font-medium text-gray-900">{formatDate(product.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sold Out:</span>
                              <span className="font-medium text-gray-900">{formatDate(product.outOfStockAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Variants Section */}
                        {product.variants.length > 0 && (
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg">
                            <p className="text-sm font-semibold text-gray-900 mb-3">Variants Sold Out ({product.variants.length})</p>
                            <div className="space-y-2">
                              {product.variants.map((variant) => (
                                <div
                                  key={variant.id}
                                  className="bg-white p-2 rounded border border-gray-200 flex justify-between items-start text-sm"
                                >
                                  <div>
                                    <span className="font-medium text-gray-900">
                                      {variant.size && <span>{variant.size}</span>}
                                      {variant.size && variant.color && <span> • </span>}
                                      {variant.color && <span>{variant.color}</span>}
                                      {!variant.size && !variant.color && <span>No variant info</span>}
                                    </span>
                                    {variant.quantity !== undefined && (
                                      <p className="text-xs text-gray-500 mt-0.5">Qty: {variant.quantity}</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                    {formatDate(variant.soldOutAt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Media Files Section */}
                        {product.media.length > 0 && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg">
                            <p className="text-sm font-semibold text-gray-900 mb-3">Product Files ({product.media.length})</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {product.media.map((file) => (
                                <a
                                  key={file.id}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white p-2 rounded border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition text-sm flex items-center gap-2"
                                >
                                  <div className="flex-1 min-w-0">
                                    {file.type === 'VIDEO' ? (
                                      <div className="text-xs">
                                        <p className="font-medium text-gray-900 truncate">🎥 Video</p>
                                        <p className="text-gray-500 truncate">{file.url.split('/').pop()}</p>
                                      </div>
                                    ) : (
                                      <div className="text-xs">
                                        <p className="font-medium text-gray-900 truncate">🖼️ Image</p>
                                        <p className="text-gray-500 truncate">{file.url.split('/').pop()}</p>
                                      </div>
                                    )}
                                  </div>
                                  {file.isPrimary && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full whitespace-nowrap">Primary</span>
                                  )}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
