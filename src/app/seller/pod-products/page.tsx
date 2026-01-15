'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

interface SelectedProduct {
  productId: string;
  productName: string;
  variantIds: string[];
  markup: number;
  enabled: boolean;
}

const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'All Products' },
  { id: 't-shirts', name: 'T-Shirts' },
  { id: 'hoodies', name: 'Hoodies & Sweatshirts' },
  { id: 'tank-tops', name: 'Tank Tops' },
  { id: 'dresses', name: 'Dresses' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'home-decor', name: 'Home & Living' },
  { id: 'bags', name: 'Bags' },
  { id: 'phone-cases', name: 'Phone Cases' },
];

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in`}>
      <span className="text-xl font-bold">{icon}</span>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">
        ✕
      </button>
    </div>
  );
}

export default function PODProductSelector() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [products, setProducts] = useState<PODProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDesignId, setSelectedDesignId] = useState<string>('');
  const [designs, setDesigns] = useState<{ id: string; title: string; imageUrl: string }[]>([]);
  const [activeProduct, setActiveProduct] = useState<PODProduct | null>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [_loadingVariants, setLoadingVariants] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [provider, setProvider] = useState('printful');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
  };

  // Redirect if not authenticated or not a seller
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch seller's designs
  useEffect(() => {
    async function fetchDesigns() {
      try {
        const res = await fetch('/api/seller/designs');
        if (res.ok) {
          const data = await res.json();
          setDesigns(data.designs || []);
          if (data.designs?.length > 0) {
            setSelectedDesignId(data.designs[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch designs:', error);
      }
    }
    
    if (session?.user) {
      fetchDesigns();
    }
  }, [session]);

  // Fetch POD products
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const url = new URL('/api/pod/products', window.location.origin);
        url.searchParams.set('provider', provider);
        if (selectedCategory !== 'all') {
          url.searchParams.set('category', selectedCategory);
        }
        
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          setConfigured(data.configured);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, [provider, selectedCategory]);

  const toggleProduct = async (product: PODProduct) => {
    // If product has no variants loaded yet, fetch them first
    if (product.variants.length === 0 && product.id.startsWith('printful_')) {
      setLoadingVariants(true);
      try {
        const res = await fetch(`/api/pod/products/${product.id}/variants`);
        if (res.ok) {
          const data = await res.json();
          // Update the product in the products list with variants
          setProducts(prev => prev.map(p => 
            p.id === product.id ? { ...p, variants: data.variants } : p
          ));
          product = { ...product, variants: data.variants };
        }
      } catch (error) {
        console.error('Failed to fetch variants:', error);
      } finally {
        setLoadingVariants(false);
      }
    }

    setSelectedProducts(prev => {
      const existing = prev.find(p => p.productId === product.id);
      if (existing) {
        return prev.filter(p => p.productId !== product.id);
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        variantIds: product.variants.filter(v => v.inStock).map(v => v.id),
        markup: 30, // Default 30% markup
        enabled: true
      }];
    });
  };

  const updateProductMarkup = (productId: string, markup: number) => {
    setSelectedProducts(prev => 
      prev.map(p => p.productId === productId ? { ...p, markup } : p)
    );
  };

  const toggleVariant = (productId: string, variantId: string) => {
    setSelectedProducts(prev => 
      prev.map(p => {
        if (p.productId !== productId) return p;
        const variantIds = p.variantIds.includes(variantId)
          ? p.variantIds.filter(id => id !== variantId)
          : [...p.variantIds, variantId];
        return { ...p, variantIds };
      })
    );
  };

  const handleSave = async () => {
    if (!selectedDesignId) {
      showToast('Please select a design first', 'warning');
      return;
    }

    if (selectedProducts.filter(p => p.enabled).length === 0) {
      showToast('Please select at least one product', 'warning');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/pod/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: selectedDesignId,
          products: selectedProducts.filter(p => p.enabled).map(p => ({
            ...p,
            productName: products.find(prod => prod.id === p.productId)?.name || p.productId
          }))
        })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast(`${data.productCount} POD product(s) saved successfully!`, 'success');
      } else {
        showToast(data.message || 'Failed to save products', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Failed to save products. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isProductSelected = (productId: string) => 
    selectedProducts.some(p => p.productId === productId);

  const getSelectedProduct = (productId: string) =>
    selectedProducts.find(p => p.productId === productId);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
      
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Print-on-Demand Products</h1>
              <p className="text-gray-600 text-sm mt-1">
                Select products to offer with your designs
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {selectedProducts.length} products selected
              </span>
              <button
                onClick={handleSave}
                disabled={saving || selectedProducts.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium 
                         hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
              >
                {saving ? 'Saving...' : 'Save Selection'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Status Banner */}
        {!configured && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-medium text-yellow-800">Demo Mode</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  POD API is not configured. Showing sample products. Add your Printful API key to enable real products.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Design Selector */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Design to Configure
          </label>
          {designs.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {designs.map(design => (
                <button
                  key={design.id}
                  onClick={() => setSelectedDesignId(design.id)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all
                            ${selectedDesignId === design.id 
                              ? 'border-purple-600 ring-2 ring-purple-200' 
                              : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="w-20 h-20 relative bg-gray-100">
                    <Image
                      src={design.imageUrl || '/placeholder-design.jpg'}
                      alt={design.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2 text-xs font-medium text-gray-900 truncate max-w-20">
                    {design.title}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No designs found. Upload a design first to configure POD products.</p>
              <button
                onClick={() => router.push('/upload')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                Upload Design
              </button>
            </div>
          )}
        </div>

        {/* Provider & Category Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Provider Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Provider:</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="printful">Printful</option>
              <option value="printify">Printify</option>
              <option value="gooten">Gooten</option>
              <option value="printivo">Printivo (Africa)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {PRODUCT_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                          ${selectedCategory === category.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">No products found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => {
              const selected = isProductSelected(product.id);
              const selectedData = getSelectedProduct(product.id);
              
              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-all
                            ${selected ? 'border-purple-600 ring-2 ring-purple-100' : 'border-transparent hover:shadow-md'}`}
                >
                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-100">
                    <Image
                      src={product.imageUrl || '/placeholder-product.jpg'}
                      alt={product.name}
                      fill
                      className="object-contain p-4"
                    />
                    {selected && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Base: ${product.basePrice.toFixed(2)} • {product.variants.length} variants
                    </p>

                    {/* Markup Control (when selected) */}
                    {selected && selectedData && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs font-medium text-gray-600">Your Markup</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedData.markup}
                            onChange={(e) => updateProductMarkup(product.id, parseInt(e.target.value))}
                            className="flex-1 accent-purple-600"
                          />
                          <span className="text-sm font-medium text-purple-600 w-12">
                            {selectedData.markup}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Customer pays: ${(product.basePrice * (1 + selectedData.markup / 100)).toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => toggleProduct(product)}
                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors
                                  ${selected
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                      >
                        {selected ? 'Remove' : 'Add Product'}
                      </button>
                      <button
                        onClick={() => {
                          setActiveProduct(product);
                          setShowVariants(true);
                        }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium 
                                 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Variants
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Variant Selection Modal */}
      {showVariants && activeProduct && (
        <VariantModal 
          product={activeProduct}
          onClose={() => setShowVariants(false)}
          isProductSelected={isProductSelected}
          getSelectedProduct={getSelectedProduct}
          toggleProduct={toggleProduct}
          toggleVariant={toggleVariant}
          onVariantsLoaded={(variants) => {
            setProducts(prev => prev.map(p => 
              p.id === activeProduct.id ? { ...p, variants } : p
            ));
            setActiveProduct(prev => prev ? { ...prev, variants } : null);
          }}
        />
      )}
    </div>
  );
}

// Separate component for variant modal to handle async loading
function VariantModal({ 
  product, 
  onClose, 
  isProductSelected,
  getSelectedProduct,
  toggleProduct,
  toggleVariant,
  onVariantsLoaded
}: {
  product: PODProduct;
  onClose: () => void;
  isProductSelected: (id: string) => boolean;
  getSelectedProduct: (id: string) => SelectedProduct | undefined;
  toggleProduct: (product: PODProduct) => void;
  toggleVariant: (productId: string, variantId: string) => void;
  onVariantsLoaded: (variants: ProductVariant[]) => void;
}) {
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants);
  const [loading, setLoading] = useState(product.variants.length === 0);

  useEffect(() => {
    async function fetchVariants() {
      if (product.variants.length > 0) return;
      
      setLoading(true);
      try {
        const res = await fetch(`/api/pod/products/${product.id}/variants`);
        if (res.ok) {
          const data = await res.json();
          setVariants(data.variants || []);
          onVariantsLoaded(data.variants || []);
        }
      } catch (error) {
        console.error('Failed to fetch variants:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVariants();
  }, [product.id, product.variants.length, onVariantsLoaded]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            {loading ? 'Loading variants...' : `${variants.length} variants available`}
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : variants.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No variants available</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {variants.map(variant => {
                const selectedData = getSelectedProduct(product.id);
                const isVariantSelected = selectedData?.variantIds.includes(variant.id);
                
                return (
                  <button
                    key={variant.id}
                    onClick={() => {
                      if (!isProductSelected(product.id)) {
                        toggleProduct({ ...product, variants });
                      }
                      toggleVariant(product.id, variant.id);
                    }}
                    disabled={!variant.inStock}
                    className={`p-4 rounded-lg border-2 transition-all text-left
                              ${!variant.inStock 
                                ? 'opacity-50 cursor-not-allowed border-gray-100'
                                : isVariantSelected 
                                  ? 'border-purple-600 bg-purple-50' 
                                  : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      {variant.colorHex && (
                        <div 
                          className="w-6 h-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: variant.colorHex }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm line-clamp-2">{variant.name}</p>
                        {variant.size && (
                          <p className="text-xs text-gray-500">Size: {variant.size}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">${variant.price.toFixed(2)}</p>
                      </div>
                    </div>
                    {!variant.inStock && (
                      <span className="text-xs text-red-500 mt-1 block">Out of stock</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
