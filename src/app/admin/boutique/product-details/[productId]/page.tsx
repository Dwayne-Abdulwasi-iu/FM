'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Calendar, Truck, AlertCircle, Play, X } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface ProductMedia {
  id: string;
  url: string;
  type: string;
  sortOrder: number;
}

interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  quantity: number;
  orderCount?: number;
}

interface ProductDetails {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  status: string;
  description: string;
  brand?: string;
  material?: string;
  condition: string;
  careInstructions?: string;
  rejectionReason?: string;
  category?: { id: string; name: string };
  media: ProductMedia[];
  variants?: ProductVariant[];
  createdAt: string;
  sellerId: string;
  seller?: {
    id: string;
    name: string | null;
    email: string;
    displayName: string | null;
  };
  shipment?: {
    id: string;
    status: string;
    adminNotes?: string;
    createdAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    receiptVerifiedAt?: string;
    trackingNumber?: string;
    carrier?: string;
    itemsExpected?: number;
    itemsReceived?: number;
    itemsMissing?: number;
    itemsDamaged?: number;
  };
}

export default function AdminReturnProductDetailsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (authStatus === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/');
      return;
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/boutique/products/${productId}/details`);
        const data = await res.json();

        if (data.product) {
          setProduct(data.product);
          if (data.product.media?.length > 0) {
            const firstImage = data.product.media.find((m: ProductMedia) => m.type === 'IMAGE');
            if (firstImage) {
              setSelectedMediaUrl(firstImage.url);
              setSelectedMediaType('image');
            }
          }
        } else {
          toast.error('Product not found');
          router.push('/admin/warehouse-inventory');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product details');
        router.push('/admin/warehouse-inventory');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const getStatusInfo = () => {
    const statuses: Record<string, { label: string; color: string; bgColor: string }> = {
      'LIVE': { label: 'Live', color: 'text-green-600', bgColor: 'bg-green-100' },
      'REJECTED': { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
      'OUT_OF_STOCK': { label: 'Out of Stock', color: 'text-red-600', bgColor: 'bg-red-100' },
      'IN_RETURN': { label: 'Approved for Return', color: 'text-orange-600', bgColor: 'bg-orange-100' },
      'RETURN_REQUESTED': { label: 'Return Requested', color: 'text-amber-600', bgColor: 'bg-amber-100' },
      'RETURN_SHIPPED': { label: 'Return Shipped', color: 'text-orange-500', bgColor: 'bg-orange-100' },
      'RETURNED_TO_SELLER': { label: 'Returned Successfully', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
      'DRAFT': { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      'PENDING_CONTENT_REVIEW': { label: 'Pending Content Review', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      'CONTENT_APPROVED': { label: 'Content Approved', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      'SHIPPED_TO_ADMIN': { label: 'Shipped to Admin', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      'RECEIVED_BY_ADMIN': { label: 'Received by Admin', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      'VERIFICATION_PASSED': { label: 'Verification Passed', color: 'text-green-600', bgColor: 'bg-green-100' },
      'CANCELLED': { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
      'DELISTED_BY_STORAGE': { label: 'Delisted (Storage)', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      'LIQUIDATED': { label: 'Liquidated', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      'SOLD': { label: 'Sold', color: 'text-gray-600', bgColor: 'bg-gray-100' }
    };
    return statuses[product.status] || { label: product.status, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  const getStatusWarningMessage = () => {
    switch (product.status) {
      case 'REJECTED':
        return 'This product was rejected during content review.';
      case 'IN_RETURN':
      case 'RETURN_REQUESTED':
      case 'RETURN_SHIPPED':
      case 'RETURNED_TO_SELLER':
        return 'This product is currently in return status.';
      case 'OUT_OF_STOCK':
        return 'This product is out of stock.';
      case 'CANCELLED':
        return 'This product has been cancelled.';
      case 'PENDING_CONTENT_REVIEW':
        return 'This product is pending content review.';
      case 'DRAFT':
        return 'This product is still in draft status.';
      case 'DELISTED_BY_STORAGE':
        return 'This product has been delisted by storage.';
      case 'LIQUIDATED':
        return 'This product has been liquidated.';
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <Link
            href="/admin/warehouse-inventory"
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{product.title}</h1>
            <p className={`text-sm sm:text-base font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Media Gallery */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
              {/* Main Media Display */}
              <div className="mb-4 sm:mb-6">
                {selectedMediaType === 'image' && selectedMediaUrl ? (
                  <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={selectedMediaUrl}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : selectedMediaType === 'video' && selectedMediaUrl ? (
                  <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <video
                      src={selectedMediaUrl}
                      controls
                      className="w-full h-full"
                    />
                  </div>
                ) : null}
              </div>

              {/* Media Thumbnails */}
              {product.media.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {product.media.map((media) => (
                    <button
                      key={media.id}
                      onClick={() => {
                        setSelectedMediaUrl(media.url);
                        setSelectedMediaType(media.type === 'VIDEO' ? 'video' : 'image');
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                        selectedMediaUrl === media.url
                          ? 'border-primary-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {media.type === 'IMAGE' ? (
                        <Image
                          src={media.url}
                          alt="Thumbnail"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <>
                          <Image
                            src={media.url}
                            alt="Thumbnail"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-4 sm:space-y-6">
            {/* Price and Category */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm mb-1">Price</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    ₦{product.basePrice.toLocaleString()}
                  </p>
                  {product.salePrice && (
                    <p className="text-sm text-gray-500 line-through">
                      ₦{product.salePrice.toLocaleString()}
                    </p>
                  )}
                </div>
                {product.category && (
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm mb-1">Category</p>
                    <p className="text-sm sm:text-base text-gray-900">{product.category.name}</p>
                  </div>
                )}
                {product.seller && (
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm mb-1">Seller</p>
                    <p className="text-sm sm:text-base text-gray-900">
                      {product.seller.displayName || product.seller.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">{product.seller.email}</p>
                  </div>
                )}
                {getStatusWarningMessage() && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg border ${
                    product.status === 'REJECTED' ? 'bg-red-50 border-red-200' :
                    product.status === 'CANCELLED' ? 'bg-red-50 border-red-200' :
                    product.status === 'OUT_OF_STOCK' ? 'bg-red-50 border-red-200' :
                    'bg-orange-50 border-orange-200'
                  }`}>
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      product.status === 'REJECTED' ? 'text-red-600' :
                      product.status === 'CANCELLED' ? 'text-red-600' :
                      product.status === 'OUT_OF_STOCK' ? 'text-red-600' :
                      'text-orange-600'
                    }`} />
                    <p className={`text-xs sm:text-sm ${
                      product.status === 'REJECTED' ? 'text-red-700' :
                      product.status === 'CANCELLED' ? 'text-red-700' :
                      product.status === 'OUT_OF_STOCK' ? 'text-red-700' :
                      'text-orange-700'
                    }`}>
                      {getStatusWarningMessage()}
                    </p>
                  </div>
                )}
                {product.status === 'REJECTED' && product.rejectionReason && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 font-semibold">Rejection Reason:</p>
                    <p className="text-xs sm:text-sm text-red-700">{product.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            {(product.brand || product.material || product.condition) && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Details</h3>
                <dl className="space-y-2">
                  {product.brand && (
                    <div>
                      <dt className="text-xs sm:text-sm text-gray-600">Brand</dt>
                      <dd className="text-sm sm:text-base text-gray-900">{product.brand}</dd>
                    </div>
                  )}
                  {product.material && (
                    <div>
                      <dt className="text-xs sm:text-sm text-gray-600">Material</dt>
                      <dd className="text-sm sm:text-base text-gray-900">{product.material}</dd>
                    </div>
                  )}
                  {product.condition && (
                    <div>
                      <dt className="text-xs sm:text-sm text-gray-600">Condition</dt>
                      <dd className="text-sm sm:text-base text-gray-900 capitalize">{product.condition}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-4 sm:mt-6 bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Description</h3>
            <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap break-words overflow-hidden">{product.description}</p>
          </div>
        )}

        {/* Return Timeline */}
        {product.shipment && (
          <div className="mt-4 sm:mt-6 bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Return Timeline</h3>
            <div className="space-y-3">
              {/* Return Requested */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-amber-500 rounded-full mt-1.5"></div>
                  <div className="w-0.5 h-12 bg-gray-200"></div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">Return Requested</p>
                  <p className="text-xs text-gray-600">
                    {product.shipment.createdAt 
                      ? new Date(product.shipment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Return Approved */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                  <div className="w-0.5 h-12 bg-gray-200"></div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">Return Approved</p>
                  <p className="text-xs text-gray-600">
                    {product.shipment.receiptVerifiedAt
                      ? new Date(product.shipment.receiptVerifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Shipped Back to Seller */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 ${product.shipment.shippedAt ? 'bg-purple-500' : 'bg-gray-300'} rounded-full mt-1.5`}></div>
                  <div className="w-0.5 h-12 bg-gray-200"></div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">Shipped Back to Seller</p>
                  <p className="text-xs text-gray-600">
                    {product.shipment.shippedAt
                      ? new Date(product.shipment.shippedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Not yet shipped'}
                  </p>
                  {product.shipment.carrier && (
                    <p className="text-xs text-gray-500 mt-1">
                      {product.shipment.carrier}
                      {product.shipment.trackingNumber && ` - ${product.shipment.trackingNumber}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Delivered to Seller */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 ${product.shipment.deliveredAt ? 'bg-green-500' : 'bg-gray-300'} rounded-full mt-1.5`}></div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">Delivered to Seller</p>
                  <p className="text-xs text-gray-600">
                    {product.shipment.deliveredAt
                      ? new Date(product.shipment.deliveredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Not yet delivered'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Notes */}
        {product.shipment?.adminNotes && (
          <div className="mt-4 sm:mt-6 bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Admin Notes</h3>
            <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">{product.shipment.adminNotes}</p>
          </div>
        )}

        {/* Variants & Quantities */}
        {product.variants && product.variants.length > 0 && (
          <div className="mt-4 sm:mt-6 bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Inventory Being Returned</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-2 text-gray-600 font-medium">Size</th>
                    <th className="text-left py-2 px-2 text-gray-600 font-medium">Color</th>
                    <th className="text-center py-2 px-2 text-gray-600 font-medium">Qty Approved to Warehouse</th>
                    <th className="text-center py-2 px-2 text-gray-600 font-medium">Qty Sold</th>
                    <th className="text-center py-2 px-2 text-gray-600 font-medium">Qty Being Returned</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => {
                    const qtySold = variant.orderCount || 0;
                    const qtyReturning = variant.quantity - qtySold;
                    return (
                      <tr key={variant.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-gray-900">{variant.size || '-'}</td>
                        <td className="py-3 px-2 text-gray-900">{variant.color || '-'}</td>
                        <td className="text-center py-3 px-2 text-gray-900 font-medium">{variant.quantity}</td>
                        <td className="text-center py-3 px-2 text-gray-500">{qtySold}</td>
                        <td className={`text-center py-3 px-2 font-medium ${qtyReturning > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {qtyReturning}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
