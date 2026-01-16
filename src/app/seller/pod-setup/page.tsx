'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Design {
  id: string;
  title: string;
  imageUrl: string;
}

interface PODProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  category: string;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Select Design', description: 'Choose which design to sell as POD' },
  { id: 2, title: 'Choose Products', description: 'Select products to print your design on' },
  { id: 3, title: 'Set Pricing', description: 'Configure your markup and pricing' },
  { id: 4, title: 'Review & Publish', description: 'Review and activate your POD products' },
];

export default function PODSetupWizard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [products, setProducts] = useState<PODProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [markup, setMarkup] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState('printful');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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
        }
      } catch (error) {
        console.error('Failed to fetch designs:', error);
      } finally {
        setLoading(false);
      }
    }
    if (session?.user) {
      fetchDesigns();
    }
  }, [session]);

  // Fetch POD products when on step 2
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`/api/pod/products?provider=${provider}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    }
    if (currentStep === 2) {
      fetchProducts();
    }
  }, [currentStep, provider]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedDesign) {
      showToast('Please select a design first', 'error');
      return;
    }
    if (currentStep === 2 && selectedProducts.length === 0) {
      showToast('Please select at least one product', 'error');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handlePublish = async () => {
    if (!selectedDesign || selectedProducts.length === 0) {
      showToast('Please complete all steps', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/pod/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: selectedDesign.id,
          products: selectedProducts.map(productId => {
            const product = products.find(p => p.id === productId);
            return {
              productId,
              productName: product?.name || productId,
              variantIds: [],
              markup,
              enabled: true
            };
          })
        })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast('🎉 POD products published successfully!', 'success');
        setTimeout(() => {
          router.push('/seller/pod-products');
        }, 2000);
      } else {
        showToast(data.message || 'Failed to publish', 'error');
      }
    } catch (error) {
      console.error('Publish error:', error);
      showToast('Failed to publish. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const calculatePrice = (basePrice: number) => {
    return (basePrice * (1 + markup / 100)).toFixed(2);
  };

  const calculateEarnings = (basePrice: number) => {
    const sellingPrice = basePrice * (1 + markup / 100);
    const platformFee = sellingPrice * 0.10; // Simplified - actual uses tier
    return (sellingPrice - basePrice - platformFee).toFixed(2);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white flex items-center gap-3 animate-pulse ${
          toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">POD Setup Wizard</h1>
              <p className="text-gray-600 mt-1">Set up Print-on-Demand products in 4 easy steps</p>
            </div>
            <Link href="/seller/dashboard" className="text-gray-500 hover:text-gray-700">
              ✕ Cancel
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                currentStep > step.id 
                  ? 'bg-green-500 text-white' 
                  : currentStep === step.id 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.id ? '✓' : step.id}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.title}
                </p>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`w-12 sm:w-24 h-1 mx-4 ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 min-h-[400px]">
          
          {/* Step 1: Select Design */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Select Your Design</h2>
              <p className="text-gray-600 mb-6">Choose which design you want to offer as print-on-demand products.</p>
              
              {designs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Designs Yet</h3>
                  <p className="text-gray-600 mb-4">Upload your first design to get started with POD</p>
                  <Link href="/upload" className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700">
                    Upload Design
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {designs.map(design => (
                    <button
                      key={design.id}
                      onClick={() => setSelectedDesign(design)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedDesign?.id === design.id 
                          ? 'border-purple-600 ring-2 ring-purple-200' 
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="aspect-square relative">
                        <Image
                          src={design.imageUrl || '/placeholder-design.jpg'}
                          alt={design.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-sm font-medium text-gray-900 truncate">{design.title}</p>
                      </div>
                      {selectedDesign?.id === design.id && (
                        <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Choose Products */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Products</h2>
              <p className="text-gray-600 mb-4">Select which products you want to print your design on.</p>
              
              {/* Provider Selector */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setProvider('printful')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    provider === 'printful' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Printful
                </button>
                <button
                  onClick={() => setProvider('printify')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    provider === 'printify' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Printify
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                {products.slice(0, 12).map(product => (
                  <button
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all text-left ${
                      selectedProducts.includes(product.id)
                        ? 'border-purple-600 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="aspect-square relative bg-gray-100">
                      {product.imageUrl && (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-contain p-2"
                        />
                      )}
                    </div>
                    <div className="p-3 bg-white">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">Base: ${product.basePrice.toFixed(2)}</p>
                    </div>
                    {selectedProducts.includes(product.id) && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              <p className="mt-4 text-sm text-gray-600">
                {selectedProducts.length} product(s) selected
              </p>
            </div>
          )}

          {/* Step 3: Set Pricing */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Set Your Pricing</h2>
              <p className="text-gray-600 mb-6">Configure your markup percentage. Higher markup = more profit per sale.</p>
              
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Markup Percentage
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={markup}
                    onChange={(e) => setMarkup(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <span className="text-2xl font-bold text-purple-600 w-20">{markup}%</span>
                </div>
                
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Example Pricing (T-Shirt at $15 base):</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base cost (Printful/Printify):</span>
                      <span className="font-medium">$15.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Your markup ({markup}%):</span>
                      <span className="font-medium text-green-600">+${(15 * markup / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Customer pays:</span>
                      <span className="font-bold">${calculatePrice(15)}</span>
                    </div>
                    <div className="flex justify-between text-purple-600">
                      <span>Platform fee (based on tier):</span>
                      <span>~7-10%</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-green-600 font-bold">
                      <span>Your estimated earnings:</span>
                      <span>~${calculateEarnings(15)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    💡 Tip: Commission Tiers
                  </h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Your platform fee decreases as you sell more! Start at 0.1% for your first $100, 
                    then progress through tiers down to 7% at Diamond level.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Publish */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Review & Publish</h2>
              <p className="text-gray-600 mb-6">Review your POD configuration before publishing.</p>
              
              <div className="space-y-6">
                {/* Selected Design */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-20 h-20 relative rounded-lg overflow-hidden">
                    {selectedDesign && (
                      <Image
                        src={selectedDesign.imageUrl || '/placeholder-design.jpg'}
                        alt={selectedDesign.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Design</p>
                    <p className="font-semibold text-gray-900">{selectedDesign?.title}</p>
                  </div>
                </div>

                {/* Selected Products */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Products ({selectedProducts.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map(productId => {
                      const product = products.find(p => p.id === productId);
                      return (
                        <span key={productId} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                          {product?.name || productId}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Pricing</p>
                  <p className="font-semibold text-gray-900">{markup}% markup on all products</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Platform fee varies by your seller tier (0.1% - 10%)
                  </p>
                </div>

                {/* What happens next */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900">What happens next?</h4>
                  <ul className="mt-2 space-y-1 text-sm text-green-800">
                    <li>✓ Your design will be available for POD purchase</li>
                    <li>✓ When customers order, we handle printing & shipping</li>
                    <li>✓ You earn your markup minus platform fee</li>
                    <li>✓ Track all POD orders in your dashboard</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ← Back
          </button>
          
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-8 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400"
            >
              {saving ? 'Publishing...' : '🚀 Publish POD Products'}
            </button>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-2">Need Help?</h3>
          <p className="text-purple-100 mb-4">
            Our POD system handles everything - printing, quality control, packaging, and shipping directly to your customers.
          </p>
          <div className="flex gap-4">
            <Link href="/help?category=pod" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium">
              POD Guide
            </Link>
            <Link href="/contact" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
