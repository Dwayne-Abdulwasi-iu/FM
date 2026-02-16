'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Truck,
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  Plus,
  Play,
  User,
  MessageSquare,
} from 'lucide-react';

interface Media {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  isPrimary: boolean;
}

interface Variant {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  quantity: number;
  priceAdjustment: number;
}

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  fitFeedback: string;
  user: { name: string; image: string };
  createdAt: string;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  basePrice: number;
  salePrice: number | null;
  brand: string;
  material: string;
  careInstructions: string;
  condition: string;
  gender: string;
  style: string;
  occasion: string;
  tags: string[];
  category: { name: string; slug: string };
  thumbnailUrl: string;
  media: Media[];
  variants: Variant[];
  seller: { id: string; name: string; image: string };
  avgRating: number | null;
  reviewCount: number;
  favoriteCount: number;
  reviews: Review[];
}

interface RelatedProduct {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  thumbnailUrl: string;
}

export default function ProductDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [selectedMedia, setSelectedMedia] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuringProduct, setFeaturingProduct] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFit, setReviewFit] = useState<'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE' | ''>('');
  const [userReview, setUserReview] = useState<any>(null);
  const [editingReview, setEditingReview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  useEffect(() => {
    if (product && session?.user?.id) {
      fetchUserReview();
    }
  }, [product?.id, session?.user?.id]);

  const fetchUserReview = async () => {
    if (!product) return;
    try {
      const response = await fetch(`/api/boutique/reviews?productId=${product.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.userReview) {
          setUserReview(data.userReview);
          setReviewRating(data.userReview.rating);
          setReviewTitle(data.userReview.title || '');
          setReviewComment(data.userReview.comment || '');
          setReviewFit(data.userReview.fitRating || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch user review:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/boutique/shop/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('This product is no longer available for purchase.');
        } else {
          setError('Failed to load product details. Please try again later.');
        }
        return;
      }
      
      const data = await response.json();
      console.log('Product data:', data);

      if (data.success && data.product) {
        setProduct(data.product);
        setRelatedProducts(data.relatedProducts || []);
        
        // Set default selections
        const sizes = [...new Set(data.product.variants.map((v: Variant) => v.size).filter(Boolean))];
        const colors = [...new Set(data.product.variants.map((v: Variant) => v.color).filter(Boolean))];
        if (sizes.length > 0) setSelectedSize(sizes[0] as string);
        if (colors.length > 0) setSelectedColor(colors[0] as string);
      } else {
        setError('Failed to load product details. Please try again later.');
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
      setError('Failed to load product details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableVariant = () => {
    if (!product) return null;
    return product.variants.find(v => 
      (!selectedSize || v.size === selectedSize) && 
      (!selectedColor || v.color === selectedColor) &&
      v.quantity > 0
    );
  };

  const getPrice = () => {
    if (!product) return 0;
    const variant = getAvailableVariant();
    const basePrice = product.salePrice || product.basePrice;
    const adjustment = variant?.priceAdjustment || 0;
    return basePrice + adjustment;
  };

  const getMaxQuantity = () => {
    const variant = getAvailableVariant();
    return variant?.quantity || 0;
  };

  const addToCart = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const variant = getAvailableVariant();
    if (!variant) return;

    setAddingToCart(true);
    try {
      const response = await fetch('/api/boutique/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product!.id,
          variantId: variant.id,
          quantity,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Added to cart!');
        setQuantity(1);
      } else {
        toast.error(data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleFavorite = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    // Toggle favorite using API
    try {
      if (!product) {
        toast.error('Product not found');
        return;
      }
      const method = isFavorite ? 'DELETE' : 'POST';
      const res = await fetch(`/api/boutique/favorites?productId=${product.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) throw new Error('Failed to update favorite');
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorite');
    }
  };

  const toggleFeatured = async () => {
    if (!session?.user?.id) {
      router.push('/auth/signin');
      return;
    }
    if (!product || session.user.id !== product.seller.id) {
      toast.error('Only the seller can feature this product');
      return;
    }

    setFeaturingProduct(true);
    try {
      if (isFeatured) {
        // DELETE - pass productId as query param
        const response = await fetch(`/api/seller/featured-boutique-products?productId=${product.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setIsFeatured(false);
          toast.success('Removed from featured');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to remove from featured');
        }
      } else {
        // POST - pass productId in body
        const response = await fetch('/api/seller/featured-boutique-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        });

        if (response.ok) {
          setIsFeatured(true);
          toast.success('Added to featured items!');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to add to featured');
        }
      }
    } catch (error) {
      console.error('Failed to toggle featured:', error);
      toast.error('Failed to update featured status');
    } finally {
      setFeaturingProduct(false);
    }
  };

  const submitReview = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!reviewRating || !reviewComment.trim()) {
      toast.error('Please provide a rating and comment');
      return;
    }

    try {
      setSubmitReviewLoading(true);
      const method = userReview ? 'PATCH' : 'POST';
      const url = userReview 
        ? `/api/boutique/reviews/${userReview.id}`
        : '/api/boutique/reviews';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product!.id,
          rating: reviewRating,
          title: reviewTitle.trim(),
          comment: reviewComment.trim(),
          fitRating: reviewFit || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to submit review');
        return;
      }

      toast.success(userReview ? 'Review updated successfully!' : 'Review submitted successfully!');
      setUserReview(data);
      setShowReviewForm(false);
      setEditingReview(false);
      
      // Refresh product data
      fetchProduct();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitReviewLoading(false);
    }
  };

  const deleteReview = async () => {
    if (!userReview) return;

    try {
      setSubmitReviewLoading(true);
      const response = await fetch(`/api/boutique/reviews/${userReview.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete review');
        return;
      }

      toast.success('Review deleted successfully');
      setUserReview(null);
      setDeleteConfirm(false);
      setReviewRating(5);
      setReviewTitle('');
      setReviewComment('');
      setReviewFit('');
      
      // Refresh product data
      fetchProduct();
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review');
    } finally {
      setSubmitReviewLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Product not found</p>
        <Link href="/boutique" className="text-purple-600 hover:text-purple-700">
          Back to Boutique
        </Link>
      </div>
    );
  }

  const availableSizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
  const availableColors = [...new Set(product.variants.map(v => ({ color: v.color, hex: v.colorHex })).filter(c => c.color))];
  const images = product.media.filter(m => m.type === 'IMAGE');
  const videos = product.media.filter(m => m.type === 'VIDEO');
  const allMedia = [...images, ...videos];
  const variant = getAvailableVariant();
  const isInStock = variant && variant.quantity > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 sm:py-3">
          <nav className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-sm text-black">
            <Link href="/boutique" className="hover:text-purple-600">Boutique</Link>
            <span>/</span>
            <Link href={`/boutique?category=${product.category.slug}`} className="hover:text-purple-600">
              {product.category.name}
            </Link>
            <span>/</span>
            <span className="text-black truncate">{product.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Media Gallery */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-[3/4] bg-gray-100 rounded-xl sm:rounded-2xl overflow-hidden mb-2 sm:mb-4">
              {allMedia[selectedMedia]?.type === 'VIDEO' ? (
                <video
                  src={allMedia[selectedMedia]?.url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : allMedia[selectedMedia]?.url ? (
                <Image
                  src={allMedia[selectedMedia].url}
                  alt={product.title}
                  fill
                  className="object-contain"
                />
              ) : product.thumbnailUrl ? (
                <Image
                  src={product.thumbnailUrl}
                  alt={product.title}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image available
                </div>
              )}

              {/* Navigation Arrows */}
              {allMedia.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedMedia(i => (i - 1 + allMedia.length) % allMedia.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-md hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedMedia(i => (i + 1) % allMedia.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-md hover:bg-white"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allMedia.length > 1 && (
              <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-2">
                {allMedia.map((media, index) => (
                  <button
                    key={media.id}
                    onClick={() => setSelectedMedia(index)}
                    className={`w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                      selectedMedia === index ? 'border-purple-600' : 'border-transparent'
                    }`}
                    aria-label={`View ${media.type === 'VIDEO' ? 'video' : 'image'} ${index + 1}`}
                  >
                    {media.type === 'VIDEO' ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    ) : media.url ? (
                      <Image
                        src={media.url}
                        alt={`Thumbnail ${index + 1}`}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                        —
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Title & Price */}
            <div className="mb-4 sm:mb-6">
              <p className="text-[9px] sm:text-sm text-purple-600 font-semibold mb-0.5 sm:mb-1">{product.category.name}</p>
              <h1 className="text-lg sm:text-3xl font-bold text-black mb-1 sm:mb-2">{product.title}</h1>
              
              {product.brand && (
                <p className="text-[9px] sm:text-base text-black mb-1 sm:mb-2">by {product.brand}</p>
              )}

              {/* Rating */}
              {product.reviewCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${
                          i <= (product.avgRating || 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[8px] sm:text-base text-black">{product.avgRating?.toFixed(1)}</span>
                  <span className="text-gray-400">•</span>
                  <a href="#reviews" className="text-purple-600 hover:underline text-[8px] sm:text-sm">
                    {product.reviewCount} reviews
                  </a>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl font-bold text-purple-600">
                  ₦{getPrice().toLocaleString()}
                </span>
                {product.salePrice && (
                  <span className="text-lg sm:text-xl text-gray-400 line-through">
                    ₦{product.basePrice.toLocaleString()}
                  </span>
                )}
                {product.salePrice && (
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-100 text-red-600 text-[8px] sm:text-sm font-medium rounded">
                    {Math.round((1 - product.salePrice / product.basePrice) * 100)}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Size Selection */}
            {availableSizes.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="font-semibold text-black mb-2 sm:mb-3 text-[11px] sm:text-base">Size</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {availableSizes.map(size => {
                    const hasStock = product.variants.some(v => v.size === size && v.quantity > 0);
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        disabled={!hasStock}
                        className={`px-2.5 sm:px-4 py-1.5 sm:py-2 border rounded-lg transition-colors text-[9px] sm:text-base ${
                          selectedSize === size
                            ? 'border-purple-600 bg-purple-50 text-purple-600'
                            : hasStock
                              ? 'border-gray-200 hover:border-gray-300 text-black'
                              : 'border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {availableColors.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="font-semibold text-black mb-2 sm:mb-3 text-[11px] sm:text-base">
                  Color: <span className="font-normal text-black">{selectedColor}</span>
                </h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {availableColors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(c.color)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
                        selectedColor === c.color
                          ? 'border-purple-600 ring-2 ring-purple-200'
                          : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: c.hex || '#ccc' }}
                      title={c.color}
                    >
                      {selectedColor === c.color && (
                        <Check className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto ${
                          c.hex === '#FFFFFF' || c.hex === '#FFF' ? 'text-gray-900' : 'text-white'
                        }`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-4 sm:mb-6">
              <h3 className="font-semibold text-black mb-2 sm:mb-3 text-[11px] sm:text-base">Quantity</h3>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-1 sm:p-2 hover:bg-gray-50"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                  </button>
                  <span className="w-8 sm:w-12 text-center font-medium text-black text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(getMaxQuantity(), q + 1))}
                    className="p-1 sm:p-2 hover:bg-gray-50"
                    disabled={quantity >= getMaxQuantity()}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                  </button>
                </div>
                <span className="text-[8px] sm:text-sm text-black">
                  {getMaxQuantity()} available
                </span>
              </div>
            </div>

            {/* Add to Cart & Wishlist */}
            <div className="flex gap-2 sm:gap-4 mb-8 sm:mb-12 mt-4 sm:mt-6 sticky bottom-0 sm:relative bg-white py-3 sm:py-0 border-t sm:border-0 z-10">
              <button
                onClick={addToCart}
                disabled={!isInStock || addingToCart}
                className="flex-1 py-3 sm:py-4 bg-purple-600 text-white font-bold rounded-lg sm:rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base sm:text-lg"
              >
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {addingToCart ? 'Adding...' : isInStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                onClick={toggleFavorite}
                className={`p-2 sm:p-3 border rounded-lg sm:rounded-xl hover:bg-gray-50 ${
                  isFavorite ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-black'}`} />
              </button>
              {/* Feature Button - Only show for seller */}
              {session?.user?.id === product?.seller.id && (
                <button
                  onClick={toggleFeatured}
                  disabled={featuringProduct}
                  className={`p-2 sm:p-3 border rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                    isFeatured ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                  }`}
                  aria-label={isFeatured ? 'Remove from featured' : 'Add to featured'}
                  title={isFeatured ? 'Remove from featured items' : 'Add to featured items'}
                >
                  <Star className={`w-5 h-5 sm:w-6 sm:h-6 ${isFeatured ? 'text-yellow-500 fill-yellow-500' : 'text-black'}`} />
                </button>
              )}
              <button className="p-2 sm:p-3 border border-gray-200 rounded-lg sm:rounded-xl hover:bg-gray-50" aria-label="Share product">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl mb-6 sm:mb-8">
              <div className="text-center">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-1 sm:mb-2" />
                <p className="text-[7px] sm:text-xs text-black">Verified Product</p>
              </div>
              <div className="text-center">
                <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-1 sm:mb-2" />
                <p className="text-[7px] sm:text-xs text-black">Fast Delivery</p>
              </div>
              <div className="text-center">
                <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-1 sm:mb-2" />
                <p className="text-[7px] sm:text-xs text-black">Easy Returns</p>
              </div>
            </div>

            {/* Description */}
            <div className="border-t pt-4 sm:pt-6">
              <h3 className="font-semibold text-black mb-2 sm:mb-3 text-[11px] sm:text-base">Description</h3>
              <p className="text-black whitespace-pre-line text-[9px] sm:text-base break-words overflow-hidden w-full">{product.description}</p>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-4">
                {product.material && (
                  <div>
                    <span className="text-[8px] sm:text-sm text-black">Material</span>
                    <p className="font-medium text-[9px] sm:text-base text-black">{product.material}</p>
                  </div>
                )}
                {product.condition && (
                  <div>
                    <span className="text-[8px] sm:text-sm font-medium text-black">Condition</span>
                    <p className="font-semibold text-[9px] sm:text-base text-black">{product.condition}</p>
                  </div>
                )}
                {product.style && (
                  <div>
                    <span className="text-[8px] sm:text-sm font-medium text-black">Style</span>
                    <p className="font-semibold text-[9px] sm:text-base text-black">{product.style}</p>
                  </div>
                )}
                {product.occasion && (
                  <div>
                    <span className="text-[8px] sm:text-sm font-medium text-black">Occasion</span>
                    <p className="font-semibold text-[9px] sm:text-base text-black">{product.occasion}</p>
                  </div>
                )}
              </div>

              {product.careInstructions && (
                <div className="mt-3 sm:mt-4">
                  <span className="text-[8px] sm:text-sm font-medium text-black">Care Instructions</span>
                  <p className="font-semibold text-[9px] sm:text-base text-black">{product.careInstructions}</p>
                </div>
              )}

              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-2 mt-3 sm:mt-4">
                  {product.tags.map(tag => (
                    <span key={tag} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-[8px] sm:text-sm rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews" className="mt-8 sm:mt-12 pt-4 sm:pt-8 border-t">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-black">
              Customer Reviews ({product.reviewCount})
            </h2>
            {session ? (
              !userReview ? (
                <button
                  onClick={() => {
                    setShowReviewForm(!showReviewForm);
                    setEditingReview(false);
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-700 font-medium"
                >
                  {showReviewForm ? 'Cancel' : 'Write a Review'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingReview(!editingReview);
                      setShowReviewForm(!showReviewForm);
                    }}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              )
            ) : (
              <Link
                href="/auth/signin"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-700 font-medium"
              >
                Sign In to Review
              </Link>
            )}
          </div>

          {/* Delete Confirmation */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-black mb-3">Delete Review?</h3>
                <p className="text-gray-700 text-sm mb-6">
                  Are you sure you want to delete your review? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-black font-medium rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteReview}
                    disabled={submitReviewLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitReviewLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Review Form */}
          {showReviewForm && session && (
            <div className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-xl border border-purple-200 mb-6 sm:mb-8">
              <h3 className="font-semibold text-black text-sm sm:text-base mb-3 sm:mb-4">
                {editingReview ? 'Edit Your Review' : 'Share Your Experience'}
              </h3>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Rating */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-black mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        onClick={() => setReviewRating(i)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 sm:w-8 sm:h-8 ${
                            i <= reviewRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="reviewTitle" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Review Title (Optional)
                  </label>
                  <input
                    id="reviewTitle"
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="e.g., Excellent quality and fit!"
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label htmlFor="reviewComment" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Your Review <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reviewComment"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share details about the product quality, fit, delivery, and more..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{reviewComment.length}/500 characters</p>
                </div>

                {/* Fit Feedback */}
                <div>
                  <label htmlFor="reviewFit" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    How does it fit?
                  </label>
                  <select
                    id="reviewFit"
                    value={reviewFit}
                    onChange={(e) => setReviewFit(e.target.value as 'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE' | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select fit (optional)</option>
                    <option value="RUNS_SMALL">Runs Small</option>
                    <option value="TRUE_TO_SIZE">True to Size</option>
                    <option value="RUNS_LARGE">Runs Large</option>
                  </select>
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={submitReview}
                    disabled={submitReviewLoading || !reviewComment.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitReviewLoading ? (editingReview ? 'Updating...' : 'Submitting...') : (editingReview ? 'Update Review' : 'Submit Review')}
                  </button>
                  <button
                    onClick={() => {
                      setShowReviewForm(false);
                      setEditingReview(false);
                    }}
                    className="px-4 py-2 border border-gray-300 text-black text-sm font-medium rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {product.reviews.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {product.reviews.map(review => (
                <div key={review.id} className="bg-white p-3 sm:p-6 rounded-lg sm:rounded-xl border border-gray-200">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        {review.user.image ? (
                          <Image
                            src={review.user.image}
                            alt={review.user.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-black text-[9px] sm:text-base">{review.user.name}</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                i <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[7px] sm:text-sm text-black">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {review.title && (
                    <h4 className="font-semibold text-black mb-1 sm:mb-2 text-[10px] sm:text-base">{review.title}</h4>
                  )}
                  <p className="text-black text-[9px] sm:text-base">{review.comment}</p>
                  
                  {review.fitFeedback && (
                    <div className="mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-2 bg-purple-100 rounded-lg inline-block">
                      <span className="text-[8px] sm:text-sm text-purple-700 font-medium">Fit: {review.fitFeedback}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 bg-white rounded-lg sm:rounded-xl border border-gray-200">
              <MessageSquare className="w-8 sm:w-12 h-8 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
              <p className="text-black text-[9px] sm:text-base">No reviews yet. Be the first to review!</p>
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 sm:mt-12 pt-4 sm:pt-8 border-t">
            <h2 className="text-lg sm:text-2xl font-bold text-black mb-4 sm:mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {relatedProducts.map(p => (
                <Link
                  key={p.id}
                  href={`/boutique/${p.slug}`}
                  className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[3/4] bg-gray-100 relative">
                    {p.thumbnailUrl && (
                      <Image
                        src={p.thumbnailUrl}
                        alt={p.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 line-clamp-1">{p.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-purple-600 font-bold">
                        ₦{(p.salePrice || p.basePrice).toLocaleString()}
                      </span>
                      {p.salePrice && (
                        <span className="text-sm text-gray-400 line-through">
                          ₦{p.basePrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
