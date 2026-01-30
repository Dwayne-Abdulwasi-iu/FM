'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface ReturnedProduct {
  id: string;
  title: string;
  basePrice: number;
  thumbnailUrl?: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  media: Array<{ id: string; url: string; type: string }>;
  category?: { name: string };
  brand?: string;
  material?: string;
  condition: string;
  description: string;
}

export default function SellerReturnedProductsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<ReturnedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
  }, [authStatus, router]);

  useEffect(() => {
    fetchReturnedProducts(true); // Initial load - show loading state
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchReturnedProducts(false);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, minPrice, maxPrice]);

  const fetchReturnedProducts = async (isInitialLoad = false) => {
    try {
      // Only show loading state for initial page load, not for search/filter updates
      if (isInitialLoad) {
        setLoading(true);
      }

      const params = new URLSearchParams();
      params.append('status', 'RETURNED_TO_SELLER');

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (minPrice) {
        params.append('minPrice', minPrice);
      }

      if (maxPrice) {
        params.append('maxPrice', maxPrice);
      }

      const res = await fetch(`/api/boutique/seller/products?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.products || []);
      } else {
        toast.error('Failed to load returned products');
      }
    } catch (error) {
      console.error('Failed to fetch returned products:', error);
      toast.error('Failed to load returned products');
    } finally {
      // Only hide loading if it was an initial load
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading returned products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/seller/boutique"
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Returned Products</h1>
            <p className="text-gray-600 text-sm mt-1">Products that have been marked as returned by admin</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by product name or ID..."
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

        {products.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No returned products yet</p>
            <p className="text-gray-500 text-sm mb-4">
              When admin confirms receipt and marks your products as returned, they'll appear here.
            </p>
            <Link
              href="/seller/boutique"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow hover:shadow-md transition">
                {/* Product Header - Clickable */}
                <button
                  onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                  className="w-full p-4 sm:p-6 text-left hover:bg-gray-50 transition flex items-start gap-4 justify-between"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Product Image */}
                    {product.media && product.media.length > 0 && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        <Image
                          src={product.media[0].url}
                          alt={product.title}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Returned on {new Date(product.createdAt).toLocaleDateString()} • ₦{product.basePrice.toLocaleString()}
                      </p>
                      <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        RETURNED
                      </span>
                    </div>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform ${expandedId === product.id ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded Details */}
                {expandedId === product.id && (
                  <div className="border-t px-4 sm:px-6 py-4 sm:py-6 bg-gray-50 space-y-4">
                    {/* Product Details */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">📦 Product Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Product ID</span>
                          <p className="font-mono text-gray-900 bg-gray-50 p-2 rounded mt-1">{product.id}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Base Price</span>
                          <p className="text-gray-900 mt-1">₦{product.basePrice.toLocaleString()}</p>
                        </div>
                        {product.brand && (
                          <div>
                            <span className="text-gray-600">Brand</span>
                            <p className="text-gray-900 mt-1">{product.brand}</p>
                          </div>
                        )}
                        {product.material && (
                          <div>
                            <span className="text-gray-600">Material</span>
                            <p className="text-gray-900 mt-1">{product.material}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Condition</span>
                          <p className="text-gray-900 mt-1">{product.condition || 'New'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Category</span>
                          <p className="text-gray-900 mt-1">{product.category?.name || 'Not specified'}</p>
                        </div>
                      </div>

                      {product.description && (
                        <div className="mt-4 pt-4 border-t">
                          <span className="text-gray-600 text-sm">Description</span>
                          <p className="text-gray-700 mt-2 whitespace-pre-wrap">{product.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Rejection Reason */}
                    {product.rejectionReason && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Original Rejection Reason</h4>
                        <p className="text-yellow-800 text-sm">{product.rejectionReason}</p>
                      </div>
                    )}

                    {/* Return Status */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-900 mb-2">✓ Product Returned</h4>
                          <p className="text-green-800 text-sm">
                            Your product has been confirmed as returned by our admin team on{' '}
                            <strong>{new Date(product.createdAt).toLocaleDateString()}</strong>.
                          </p>
                          <p className="text-green-800 text-sm mt-2">
                            You can now collect it from the return location specified in your rejection email.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* What Happens Next */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">📋 What Happens Next</h4>
                      <ol className="space-y-2 text-sm text-gray-700">
                        <li className="flex gap-2">
                          <span className="font-semibold text-gray-900 flex-shrink-0">1.</span>
                          <span>Collect your product from the return location specified in your rejection email</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-gray-900 flex-shrink-0">2.</span>
                          <span>Inspect the product to ensure all items are accounted for</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-gray-900 flex-shrink-0">3.</span>
                          <span>You can resubmit the product if issues have been resolved, or</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-gray-900 flex-shrink-0">4.</span>
                          <span>Contact support if you need clarification on the rejection</span>
                        </li>
                      </ol>
                    </div>

                    {/* Product Media Gallery */}
                    {product.media && product.media.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">🖼️ Product Media</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {product.media.map((media) => (
                            <div key={media.id} className="rounded-lg overflow-hidden bg-gray-100">
                              {media.type === 'IMAGE' ? (
                                <div className="relative w-full aspect-square">
                                  <Image
                                    src={media.url}
                                    alt="Product media"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="relative w-full aspect-video bg-gray-800 flex items-center justify-center">
                                  <span className="text-white text-xs">Video</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Support Info */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 mb-2">🆘 Need Help?</h4>
                      <p className="text-orange-800 text-sm mb-3">
                        If you have questions about why your product was rejected or need assistance with resubmission, please contact our support team.
                      </p>
                      <div className="space-y-1 text-sm text-orange-800">
                        <p><strong>Product ID:</strong> <span className="font-mono">{product.id}</span></p>
                        <p><strong>Reference Date:</strong> {new Date(product.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        href="/contact"
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-center"
                      >
                        Contact Support
                      </Link>
                      <Link
                        href="/seller/boutique"
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-center"
                      >
                        Back to Boutique
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
