'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boutique/shop/${slug}`);
      const data = await response.json();

      if (data.success) {
        setProduct(data.product);
        setRelatedProducts(data.relatedProducts);
        
        // Set default selections
        const sizes = [...new Set(data.product.variants.map((v: Variant) => v.size).filter(Boolean))];
        const colors = [...new Set(data.product.variants.map((v: Variant) => v.color).filter(Boolean))];
        if (sizes.length > 0) setSelectedSize(sizes[0] as string);
        if (colors.length > 0) setSelectedColor(colors[0] as string);
      } else {
        router.push('/boutique');
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
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
        alert('Added to cart!');
      } else {
        alert(data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleFavorite = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    // TODO: Implement favorites API
    setIsFavorite(!isFavorite);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!product) {
    return null;
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
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/boutique" className="hover:text-purple-600">Boutique</Link>
            <span>/</span>
            <Link href={`/boutique?category=${product.category.slug}`} className="hover:text-purple-600">
              {product.category.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900 truncate">{product.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Media Gallery */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden mb-4">
              {allMedia[selectedMedia]?.type === 'VIDEO' ? (
                <video
                  src={allMedia[selectedMedia].url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  src={allMedia[selectedMedia]?.url || product.thumbnailUrl}
                  alt={product.title}
                  fill
                  className="object-contain"
                />
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
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allMedia.map((media, index) => (
                  <button
                    key={media.id}
                    onClick={() => setSelectedMedia(index)}
                    className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                      selectedMedia === index ? 'border-purple-600' : 'border-transparent'
                    }`}
                    aria-label={`View ${media.type === 'VIDEO' ? 'video' : 'image'} ${index + 1}`}
                  >
                    {media.type === 'VIDEO' ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <Image
                        src={media.url}
                        alt={`Thumbnail ${index + 1}`}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Title & Price */}
            <div className="mb-6">
              <p className="text-sm text-purple-600 font-medium mb-1">{product.category.name}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
              
              {product.brand && (
                <p className="text-gray-500 mb-2">by {product.brand}</p>
              )}

              {/* Rating */}
              {product.reviewCount > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i <= (product.avgRating || 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600">{product.avgRating?.toFixed(1)}</span>
                  <span className="text-gray-400">•</span>
                  <a href="#reviews" className="text-purple-600 hover:underline">
                    {product.reviewCount} reviews
                  </a>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-purple-600">
                  ₦{getPrice().toLocaleString()}
                </span>
                {product.salePrice && (
                  <span className="text-xl text-gray-400 line-through">
                    ₦{product.basePrice.toLocaleString()}
                  </span>
                )}
                {product.salePrice && (
                  <span className="px-2 py-1 bg-red-100 text-red-600 text-sm font-medium rounded">
                    {Math.round((1 - product.salePrice / product.basePrice) * 100)}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Size Selection */}
            {availableSizes.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(size => {
                    const hasStock = product.variants.some(v => v.size === size && v.quantity > 0);
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        disabled={!hasStock}
                        className={`px-4 py-2 border rounded-lg transition-colors ${
                          selectedSize === size
                            ? 'border-purple-600 bg-purple-50 text-purple-600'
                            : hasStock
                              ? 'border-gray-200 hover:border-gray-300'
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
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Color: <span className="font-normal text-gray-600">{selectedColor}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(c.color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedColor === c.color
                          ? 'border-purple-600 ring-2 ring-purple-200'
                          : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: c.hex || '#ccc' }}
                      title={c.color}
                    >
                      {selectedColor === c.color && (
                        <Check className={`w-5 h-5 mx-auto ${
                          c.hex === '#FFFFFF' || c.hex === '#FFF' ? 'text-gray-900' : 'text-white'
                        }`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-2 hover:bg-gray-50"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(getMaxQuantity(), q + 1))}
                    className="p-2 hover:bg-gray-50"
                    disabled={quantity >= getMaxQuantity()}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {getMaxQuantity()} available
                </span>
              </div>
            </div>

            {/* Add to Cart & Wishlist */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={addToCart}
                disabled={!isInStock || addingToCart}
                className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {addingToCart ? 'Adding...' : isInStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                onClick={toggleFavorite}
                className={`p-3 border rounded-xl hover:bg-gray-50 ${
                  isFavorite ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-6 h-6 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
              </button>
              <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50" aria-label="Share product">
                <Share2 className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-8">
              <div className="text-center">
                <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Verified Product</p>
              </div>
              <div className="text-center">
                <Truck className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Fast Delivery</p>
              </div>
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Easy Returns</p>
              </div>
            </div>

            {/* Description */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-600 whitespace-pre-line">{product.description}</p>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {product.material && (
                  <div>
                    <span className="text-sm text-gray-500">Material</span>
                    <p className="font-medium">{product.material}</p>
                  </div>
                )}
                {product.condition && (
                  <div>
                    <span className="text-sm text-gray-500">Condition</span>
                    <p className="font-medium">{product.condition}</p>
                  </div>
                )}
                {product.style && (
                  <div>
                    <span className="text-sm text-gray-500">Style</span>
                    <p className="font-medium">{product.style}</p>
                  </div>
                )}
                {product.occasion && (
                  <div>
                    <span className="text-sm text-gray-500">Occasion</span>
                    <p className="font-medium">{product.occasion}</p>
                  </div>
                )}
              </div>

              {product.careInstructions && (
                <div className="mt-4">
                  <span className="text-sm text-gray-500">Care Instructions</span>
                  <p className="font-medium">{product.careInstructions}</p>
                </div>
              )}

              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {product.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews" className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Customer Reviews ({product.reviewCount})
          </h2>

          {product.reviews.length > 0 ? (
            <div className="space-y-6">
              {product.reviews.map(review => (
                <div key={review.id} className="bg-white p-6 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {review.user.image ? (
                          <Image
                            src={review.user.image}
                            alt={review.user.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{review.user.name}</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {review.title && (
                    <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                  )}
                  <p className="text-gray-600">{review.comment}</p>
                  
                  {review.fitFeedback && (
                    <div className="mt-3 px-3 py-2 bg-purple-50 rounded-lg inline-block">
                      <span className="text-sm text-purple-700">Fit: {review.fitFeedback}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No reviews yet. Be the first to review!</p>
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map(p => (
                <Link
                  key={p.id}
                  href={`/boutique/${p.slug}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
