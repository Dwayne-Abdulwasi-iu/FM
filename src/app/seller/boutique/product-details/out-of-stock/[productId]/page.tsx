'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Play, Image as _ImageIcon } from 'lucide-react';
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
  category?: { id: string; name: string };
  media: ProductMedia[];
  variants?: ProductVariant[];
  createdAt: string;
  outOfStockAt: string | null;
}

export default function OutOfStockProductDetailsPage() {
  const { status: authStatus } = useSession();
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
  }, [authStatus, router]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/boutique/seller/products/${productId}/out-of-stock`);
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
          router.push('/seller/boutique');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product details');
        router.push('/seller/boutique');
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

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <Link
            href="/seller/boutique"
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{product.title}</h1>
            <p className="text-sm sm:text-base font-semibold text-red-600">Out of Stock</p>
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
                {product.outOfStockAt && (
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm mb-1">Out of Stock Since</p>
                    <p className="text-sm sm:text-base text-gray-900">
                      {new Date(product.outOfStockAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-700">
                    This product is out of stock and not available for purchase.
                  </p>
                </div>
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

        {/* Variants & Quantities */}
        {product.variants && product.variants.length > 0 && (
          <div className="mt-4 sm:mt-6 bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Inventory Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-2 text-gray-600 font-medium">Size</th>
                    <th className="text-left py-2 px-2 text-gray-600 font-medium">Color</th>
                    <th className="text-center py-2 px-2 text-gray-600 font-medium">Total Sent</th>
                    <th className="text-center py-2 px-2 text-gray-600 font-medium">Units Sold</th>
                    <th className="text-center py-2 px-2 text-gray-600 font-medium">Currently Out</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => {
                    const qtySold = variant.orderCount || 0;
                    const currentOut = variant.quantity - qtySold;
                    return (
                      <tr key={variant.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-gray-900">{variant.size || '-'}</td>
                        <td className="py-3 px-2 text-gray-900">{variant.color || '-'}</td>
                        <td className="text-center py-3 px-2 text-gray-900 font-medium">{variant.quantity}</td>
                        <td className="text-center py-3 px-2 text-gray-500">{qtySold}</td>
                        <td className={`text-center py-3 px-2 font-medium ${currentOut > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {currentOut}
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
