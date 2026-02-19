'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useCurrency } from '@/components/CurrencyProvider';

interface Design {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  seller: {
    id: string;
    name: string;
  };
}

interface PODProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  category: string;
  variants: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price: number;
  inStock: boolean;
}

interface Mockup {
  url: string;
  placement: string;
  variantId: string;
}

export default function DesignProductsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { formatPrice } = useCurrency();
  const designId = params.id as string;

  const [design, setDesign] = useState<Design | null>(null);
  const [products, setProducts] = useState<PODProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PODProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [activeMockup, setActiveMockup] = useState<Mockup | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loadingMockups, setLoadingMockups] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Fetch design details
  useEffect(() => {
    async function fetchDesign() {
      try {
        const res = await fetch(`/api/designs/${designId}`);
        if (res.ok) {
          const data = await res.json();
          setDesign(data.design);
        }
      } catch (error) {
        console.error('Failed to fetch design:', error);
      }
    }
    
    if (designId) {
      fetchDesign();
    }
  }, [designId]);

  // Fetch available POD products
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const res = await fetch('/api/pod/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, []);

  // Generate mockups when product is selected
  useEffect(() => {
    async function generateMockups() {
      if (!selectedProduct || !design) return;
      
      setLoadingMockups(true);
      try {
        const res = await fetch('/api/pod/mockups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProduct.id,
            variantIds: selectedVariant ? [selectedVariant.id] : [],
            imageUrl: design.imageUrl
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          setMockups(data.mockups || []);
          if (data.mockups?.length > 0) {
            setActiveMockup(data.mockups[0]);
          }
        }
      } catch (error) {
        console.error('Failed to generate mockups:', error);
      } finally {
        setLoadingMockups(false);
      }
    }
    
    generateMockups();
  }, [selectedProduct, selectedVariant, design]);

  const handleAddToCart = async () => {
    if (!session?.user) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    if (!selectedProduct || !selectedVariant) {
      alert('Please select a product and variant');
      return;
    }

    setAddingToCart(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId,
          quantity,
          podProduct: {
            productId: selectedProduct.id,
            variantId: selectedVariant.id,
            productName: selectedProduct.name,
            variantName: selectedVariant.name,
            price: selectedVariant.price
          }
        })
      });

      if (res.ok) {
        router.push('/cart');
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      alert('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const totalPrice = selectedVariant 
    ? (selectedVariant.price + (design?.price || 0)) * quantity
    : (design?.price || 0) * quantity;

  if (!design) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/designs" className="text-gray-500 hover:text-gray-700">Designs</Link>
            <span className="text-gray-300">/</span>
            <Link href={`/designs/${designId}`} className="text-gray-500 hover:text-gray-700 line-clamp-1 max-w-32">
              {design.title}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-purple-600 font-medium">Products</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Mockup Preview */}
          <div className="space-y-4">
            {/* Main Preview */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
                {loadingMockups ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : activeMockup ? (
                  <Image
                    src={activeMockup.url}
                    alt="Product mockup"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <Image
                      src={design.imageUrl}
                      alt={design.title}
                      fill
                      className="object-contain p-8 opacity-50"
                    />
                    <p className="absolute bottom-4 text-sm">Select a product to see mockup</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mockup Thumbnails */}
            {mockups.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {mockups.map((mockup, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveMockup(mockup)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all
                              ${activeMockup === mockup 
                                ? 'border-purple-600 ring-2 ring-purple-200' 
                                : 'border-gray-200 hover:border-gray-300'}`}
                    aria-label={`View ${mockup.placement} mockup`}
                  >
                    <Image
                      src={mockup.url}
                      alt={`View ${mockup.placement}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Design Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={design.imageUrl}
                    alt={design.title}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{design.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">{design.description}</p>
                  <p className="text-sm text-gray-500 mt-2">by {design.seller.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Product Selection */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Get This Design on Products</h1>
              <p className="text-gray-600 mt-2">
                Choose a product to have this design printed on and shipped directly to you.
              </p>
            </div>

            {/* Product Grid */}
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">1. Choose a Product</h2>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {products.slice(0, 12).map(product => (
                    <button
                      key={product.id}
                      onClick={async () => {
                        setSelectedProduct(product);
                        setSelectedVariant(null);
                        
                        // Fetch variants if not loaded
                        if (product.variants.length === 0 && product.id.startsWith('printful_')) {
                          setLoadingVariants(true);
                          try {
                            const res = await fetch(`/api/pod/products/${product.id}/variants`);
                            if (res.ok) {
                              const data = await res.json();
                              const updatedProduct = { ...product, variants: data.variants || [] };
                              setProducts(prev => prev.map(p => 
                                p.id === product.id ? updatedProduct : p
                              ));
                              setSelectedProduct(updatedProduct);
                              setSelectedVariant(data.variants?.find((v: ProductVariant) => v.inStock) || null);
                            }
                          } catch (error) {
                            console.error('Failed to fetch variants:', error);
                          } finally {
                            setLoadingVariants(false);
                          }
                        } else {
                          setSelectedVariant(product.variants.find(v => v.inStock) || null);
                        }
                      }}
                      className={`p-2 rounded-lg border-2 transition-all
                                ${selectedProduct?.id === product.id
                                  ? 'border-purple-600 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="aspect-square relative bg-gray-100 rounded">
                        <Image
                          src={product.imageUrl || '/placeholder-product.jpg'}
                          alt={product.name}
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                      <p className="text-xs font-medium text-gray-900 mt-1 line-clamp-1">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">${product.basePrice.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Variant Selection */}
            {selectedProduct && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">2. Choose Options</h2>
                
                {loadingVariants ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    <span className="text-sm text-gray-500">Loading options...</span>
                  </div>
                ) : selectedProduct.variants.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No variants available for this product</p>
                ) : (
                  <>
                    {/* Colors */}
                    {selectedProduct.variants.some(v => v.colorHex) && (
                      <div className="mb-4">
                        <label className="text-sm text-gray-600 block mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                          {[...new Map(selectedProduct.variants.map(v => [v.colorHex, v])).values()]
                            .filter(v => v.colorHex)
                            .map(variant => (
                              <button
                                key={variant.id}
                                onClick={() => setSelectedVariant(variant)}
                                disabled={!variant.inStock}
                                title={variant.color || variant.name}
                                className={`w-10 h-10 rounded-full border-2 transition-all disabled:opacity-50
                                          ${selectedVariant?.colorHex === variant.colorHex
                                            ? 'border-purple-600 ring-2 ring-purple-200'
                                            : 'border-gray-200 hover:border-gray-300'}`}
                                style={{ backgroundColor: variant.colorHex }}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Sizes */}
                    {selectedProduct.variants.some(v => v.size) && (
                      <div className="mb-4">
                        <label className="text-sm text-gray-600 block mb-2">Size</label>
                        <div className="flex flex-wrap gap-2">
                          {[...new Map(selectedProduct.variants.map(v => [v.size, v])).values()]
                            .filter(v => v.size)
                            .map(variant => (
                              <button
                                key={variant.id}
                                onClick={() => setSelectedVariant(variant)}
                                disabled={!variant.inStock}
                                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                                          disabled:opacity-50 disabled:cursor-not-allowed
                                          ${selectedVariant?.size === variant.size
                                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                              >
                                {variant.size}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity */}
                    <div className="mb-4">
                      <label className="text-sm text-gray-600 block mb-2">Quantity</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center
                                   hover:bg-gray-50 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center
                                   hover:bg-gray-50 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Price Summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="space-y-2 text-sm">
                {selectedVariant && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Product ({selectedProduct?.name})</span>
                      <span>{formatPrice(selectedVariant.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Design License</span>
                      <span>{formatPrice(design.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity</span>
                      <span>× {quantity}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-purple-600">${totalPrice.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {!selectedVariant && (
                  <div className="flex justify-between text-gray-500">
                    <span>Select a product to see pricing</span>
                  </div>
                )}
              </div>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={!selectedProduct || !selectedVariant || addingToCart}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg
                       hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
            >
              {addingToCart ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </>
              )}
            </button>

            {/* Info */}
            <div className="text-center text-sm text-gray-500">
              <p>🚚 Free shipping on orders over $50</p>
              <p className="mt-1">📦 Printed & shipped by Printful in 3-5 business days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
