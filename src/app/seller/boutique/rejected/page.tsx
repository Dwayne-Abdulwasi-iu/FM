'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Calendar, Truck, AlertCircle, Play, X } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface ProductMedia {
  id: string;
  url: string;
  type: string; // 'IMAGE' or 'VIDEO'
  order: number;
  sortOrder: number;
}

interface RejectedProduct {
  id: string;
  title: string;
  basePrice: number;
  category?: { name: string };
  brand?: string;
  material?: string;
  condition: string;
  description: string;
  createdAt: string;
  rejectionReason?: string;
  media: ProductMedia[];
  shipment?: {
    id: string;
    status: string;
    courier?: string;
    trackingNumber?: string;
    disputeNotes: string | null;
    itemsMissing?: number;
    itemsDamaged?: number;
  };
}

export default function SellerRejectedProductsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<RejectedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return
    }
  }, [authStatus, router]);

  useEffect(() => {
    fetchRejectedProducts(true); // Initial load - show loading state
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchRejectedProducts(false);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, minPrice, maxPrice]);

  const fetchRejectedProducts = async (isInitialLoad = false) => {
    try {
      // Only show loading state for initial page load, not for search/filter updates
      if (isInitialLoad) {
        setLoading(true);
      }

      const params = new URLSearchParams();
      params.append('status', 'REJECTED');

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
        // Fetch additional details for each product
        const productsWithDetails = await Promise.all(
          data.products.map(async (product: RejectedProduct) => {
            try {
              const detailRes = await fetch(`/api/boutique/seller/products/${product.id}/rejection-details`);
              const detailData = await detailRes.json();
              return {
                ...product,
                shipment: detailData.shipment,
                category: product.category,
                brand: product.brand,
                material: product.material,
                condition: product.condition,
                description: product.description,
                media: product.media || [],
              };
            } catch (error) {
              console.error('Failed to fetch rejection details:', error);
              return {
                ...product,
                media: product.media || [],
              };
            }
          })
        );

        setProducts(productsWithDetails);
      } else {
        toast.error('Failed to load rejected products');
      }
    } catch (error) {
      console.error('Failed to fetch rejected products:', error);
      toast.error('Failed to load rejected products');
    } finally {
      setLoading(false);
    }
  };

  const parseReturnDate = (disputeNotes: string | null | undefined): string | null => {
    if (!disputeNotes) return null;
    const match = disputeNotes.match(/Return scheduled for (\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const parseReason = (disputeNotes: string | null | undefined): string | null => {
    if (!disputeNotes) return null;
    const match = disputeNotes.match(/Reason: (.+)$/m);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rejected products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/seller/boutique"
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Rejected Products</h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-0.5">Review rejection reasons and scheduled returns</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="space-y-2 sm:space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by product name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 pl-9 sm:pl-10 border border-gray-200 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <svg className="absolute left-2.5 sm:left-3 top-2 sm:top-2.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Price Range Filter */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="text-[10px] sm:text-xs text-gray-600 font-medium block mb-1">Min Price ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs text-gray-600 font-medium block mb-1">Max Price ($)</label>
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
          <div className="bg-white rounded-xl p-6 sm:p-8 text-center">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-gray-600 mb-3">No rejected products</p>
            <Link
              href="/seller/boutique"
              className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-xs sm:text-sm"
            >
              View All Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => {
              const returnDate = parseReturnDate(product.shipment?.disputeNotes);
              const reason = parseReason(product.shipment?.disputeNotes);
              const isExpanded = expandedId === product.id;

              return (
                <div key={product.id} className="bg-white rounded-xl shadow hover:shadow-md transition">
                  {/* Product Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : product.id)}
                    className="w-full p-2 sm:p-3 text-left hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <h3 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2">{product.title}</h3>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-600">
                          Rejected on {new Date(product.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-xs sm:text-sm text-gray-900">${product.basePrice.toFixed(2)}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded-full">
                          REJECTED
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t px-3 sm:px-4 py-3 sm:py-4 bg-gray-50 space-y-3">
                      {/* Email Notification */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-semibold text-xs sm:text-sm text-blue-900 mb-1">📧 Email Notification</h4>
                        <p className="text-blue-800 text-[10px] sm:text-xs">
                          An email has been sent to your registered email address with details about this rejection, the scheduled return pickup date, and instructions on what to do next.
                        </p>
                      </div>

                      {/* Product Details Section */}
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 mb-2">📦 Product Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs">
                          <div>
                            <span className="text-gray-600">Product ID</span>
                            <p className="font-mono text-gray-900 bg-gray-50 p-1.5 rounded mt-0.5 text-[9px] sm:text-[10px]">{product.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Product Name</span>
                            <p className="font-semibold text-gray-900 mt-0.5">{product.title}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Base Price</span>
                            <p className="text-gray-900 mt-0.5">${product.basePrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Category</span>
                            <p className="text-gray-900 mt-0.5">{product.category?.name || 'Not specified'}</p>
                          </div>
                          {product.brand && (
                            <div>
                              <span className="text-gray-600">Brand</span>
                              <p className="text-gray-900 mt-0.5">{product.brand}</p>
                            </div>
                          )}
                          {product.material && (
                            <div>
                              <span className="text-gray-600">Material</span>
                              <p className="text-gray-900 mt-0.5">{product.material}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Condition</span>
                            <p className="text-gray-900 mt-0.5">{product.condition || 'New'}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Submitted Date</span>
                            <p className="text-gray-900 mt-0.5">{new Date(product.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {product.description && (
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-gray-600 text-[10px] sm:text-xs">Description</span>
                            <p className="text-gray-700 text-[10px] sm:text-xs mt-1 whitespace-pre-wrap">{product.description}</p>
                          </div>
                        )}
                      </div>

                      {/* Product Media Gallery */}
                      {product.media && product.media.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <h4 className="font-semibold text-xs sm:text-sm text-gray-900 mb-2">🖼️ Product Files & Media</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {product.media.map((media) => (
                              <button
                                key={media.id}
                                onClick={() => {
                                  setSelectedMediaUrl(media.url);
                                  setSelectedMediaType(media.type.toLowerCase() as 'image' | 'video');
                                }}
                                className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 hover:shadow-lg transition"
                              >
                                {media.type === 'IMAGE' ? (
                                  <div className="relative w-full aspect-square">
                                    <Image
                                      src={media.url}
                                      alt="Product media"
                                      fill
                                      className="object-cover group-hover:scale-110 transition duration-300"
                                    />
                                  </div>
                                ) : (
                                  <div className="relative w-full aspect-video bg-gray-800 flex items-center justify-center">
                                    <Play className="w-8 h-8 text-white fill-white" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"></div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fullscreen Media Viewer */}
                      {selectedMediaUrl && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => {
                          setSelectedMediaUrl(null);
                          setSelectedMediaType(null);
                        }}>
                          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedMediaUrl(null);
                                setSelectedMediaType(null);
                              }}
                              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2"
                              aria-label="Close fullscreen media viewer"
                            >
                              <X className="w-6 h-6" />
                            </button>
                            {selectedMediaType === 'image' ? (
                              <div className="relative w-full aspect-auto">
                                <Image
                                  src={selectedMediaUrl}
                                  alt="Full size preview"
                                  width={1200}
                                  height={800}
                                  className="w-full h-auto rounded-lg"
                                />
                              </div>
                            ) : (
                              <video
                                src={selectedMediaUrl}
                                controls
                                autoPlay
                                className="w-full h-auto rounded-lg bg-black"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <h4 className="font-semibold text-xs sm:text-sm text-red-900 mb-1">❌ Rejection Reason</h4>
                          <p className="text-red-800 text-[10px] sm:text-xs">{reason}</p>
                        </div>
                      )}

                      {/* Discrepancy Info */}
                      {(product.shipment?.itemsMissing !== undefined || product.shipment?.itemsDamaged !== undefined) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <h4 className="font-semibold text-xs sm:text-sm text-yellow-900 mb-2">⚠️ Discrepancy Details</h4>
                          <div className="space-y-2">
                            {product.shipment?.itemsMissing !== undefined && (
                              <div className="flex justify-between items-center text-[10px] sm:text-xs">
                                <span className="text-yellow-800">Missing Items:</span>
                                <span className="font-semibold text-yellow-900 px-2 py-0.5 bg-yellow-100 rounded text-[10px] sm:text-xs">{product.shipment.itemsMissing}</span>
                              </div>
                            )}
                            {product.shipment?.itemsDamaged !== undefined && (
                              <div className="flex justify-between items-center text-[10px] sm:text-xs">
                                <span className="text-yellow-800">Damaged Items:</span>
                                <span className="font-semibold text-yellow-900 px-2 py-0.5 bg-yellow-100 rounded text-[10px] sm:text-xs">{product.shipment.itemsDamaged}</span>
                              </div>
                            )}
                            <p className="text-yellow-800 text-[10px] sm:text-xs pt-1.5 border-t border-yellow-200">
                              These discrepancies were detected during verification. Your product is being returned due to these issues.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Shipment Info */}
                      {product.shipment && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <h4 className="font-semibold text-xs sm:text-sm text-purple-900 mb-2">🚚 Shipment Information</h4>
                          <div className="space-y-1 text-[10px] sm:text-xs">
                            <div className="flex justify-between">
                              <span className="text-purple-800">Shipment ID:</span>
                              <span className="font-mono text-[9px] sm:text-[10px] bg-white px-1.5 py-0.5 rounded">{product.shipment.id}</span>
                            </div>
                            {product.shipment.courier && (
                              <div className="flex justify-between">
                                <span className="text-purple-800">Courier:</span>
                                <span className="text-purple-900">{product.shipment.courier}</span>
                              </div>
                            )}
                            {product.shipment.trackingNumber && (
                              <div className="flex justify-between">
                                <span className="text-purple-800">Tracking Number:</span>
                                <span className="font-mono text-[9px] sm:text-[10px] bg-white px-1.5 py-0.5 rounded">{product.shipment.trackingNumber}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-purple-800">Status:</span>
                              <span className="font-semibold text-purple-900">{product.shipment.status}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Return Status */}
                      {product.shipment?.status === 'RETURN_SCHEDULED' && returnDate && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Truck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-xs sm:text-sm text-blue-900 mb-1">📅 Return Scheduled</h4>
                              <div className="flex items-center gap-2 text-blue-800 text-[10px] sm:text-xs mb-1">
                                <Calendar className="w-4 h-4" />
                                <span>Pickup Date: <span className="font-semibold">{new Date(returnDate).toLocaleDateString()}</span></span>
                              </div>
                              <p className="text-blue-800 text-[10px] sm:text-xs">
                                Our courier will collect the item from your warehouse on this date. Please ensure the product is properly packaged and ready for return.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Return & Next Steps */}
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 mb-2">📋 Return & Next Steps</h4>
                        <p className="text-[10px] sm:text-xs text-gray-700 mb-2">
                          Your product failed verification and is being returned to you. You cannot edit these products - they must be shipped back entirely.
                        </p>
                        <ol className="space-y-1 text-[10px] sm:text-xs text-gray-700">
                          {product.shipment?.status === 'RETURN_SCHEDULED' ? (
                            <>
                              <li className="flex gap-2">
                                <span className="font-semibold text-gray-900 flex-shrink-0">1.</span>
                                <span>Prepare your product for return shipment</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-gray-900 flex-shrink-0">2.</span>
                                <span>Ensure it's packaged securely on the scheduled pickup date</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-gray-900 flex-shrink-0">3.</span>
                                <span>Our courier will collect it and provide a tracking number</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-gray-900 flex-shrink-0">4.</span>
                                <span>Once we receive and verify it, your product status will be updated</span>
                              </li>
                            </>
                          ) : (
                            <>
                              <li className="flex gap-2">
                                <span className="font-semibold text-gray-900 flex-shrink-0">1.</span>
                                <span>Contact admin to schedule a return pickup</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-gray-900 flex-shrink-0">2.</span>
                                <span>Prepare the entire shipment for return to us</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-gray-900 flex-shrink-0">3.</span>
                                <span>We'll arrange pickup once you confirm readiness</span>
                              </li>
                            </>
                          )}
                        </ol>
                      </div>

                      {/* Support Contact Info */}
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <h4 className="font-semibold text-xs sm:text-sm text-orange-900 mb-1">🆘 Contacting Support</h4>
                        <p className="text-orange-800 text-[10px] sm:text-xs mb-2">
                          If you need to contact our support team about this rejection or return, please have the following information ready:
                        </p>
                        <ul className="space-y-1 text-[10px] sm:text-xs text-orange-800">
                          <li className="flex items-center gap-2">
                            <span className="font-semibold">Product ID:</span>
                            <span className="font-mono text-[9px] sm:text-[10px] bg-white px-1.5 py-0.5 rounded">{product.id}</span>
                          </li>
                          {product.shipment?.id && (
                            <li className="flex items-center gap-2">
                              <span className="font-semibold">Shipment ID:</span>
                              <span className="font-mono text-[9px] sm:text-[10px] bg-white px-1.5 py-0.5 rounded">{product.shipment.id}</span>
                            </li>
                          )}
                          <li className="flex items-center gap-2">
                            <span className="font-semibold">Rejection Date:</span>
                            <span className="bg-white px-1.5 py-0.5 rounded">{new Date(product.createdAt).toLocaleDateString()}</span>
                          </li>
                        </ul>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Link
                          href="/seller/boutique/shipments"
                          className="flex-1 px-3 py-1.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-center text-xs sm:text-sm"
                        >
                          View Shipments
                        </Link>
                        <Link
                          href="/contact"
                          className="flex-1 px-3 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-center text-xs sm:text-sm"
                        >
                          Contact Support
                        </Link>
                      </div>
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
