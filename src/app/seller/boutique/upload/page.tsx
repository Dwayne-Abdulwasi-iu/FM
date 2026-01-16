'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Upload,
  X,
  Plus,
  Trash2,
  Camera,
  Video,
  Save,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { 
  STANDARD_SIZES, 
  GENDER_OPTIONS, 
  OCCASIONS, 
  STYLES, 
  PRODUCT_CONDITION, 
  BOUTIQUE_DEFAULTS,
  FULFILLMENT_METHOD,
  FULFILLMENT_CONFIG,
  SELLER_TIER_CONFIG,
  NIGERIAN_STATES,
  canUseDirectShipping,
  type FulfillmentMethod,
  type SellerTier,
} from '@/lib/boutique/constants';

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface Variant {
  id?: string;
  size: string;
  color: string;
  colorHex: string;
  quantity: number;
  priceAdjustment: number;
}

interface MediaFile {
  id?: string;
  file?: File;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  isPrimary: boolean;
  uploading?: boolean;
}

const COMMON_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#001F3F' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Beige', hex: '#D4A574' },
  { name: 'Gold', hex: '#D4AF37' },
  { name: 'Silver', hex: '#C0C0C0' },
];

export default function BoutiqueUploadPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [style, setStyle] = useState('');
  const [occasion, setOccasion] = useState('');
  const [gender, setGender] = useState('');
  const [condition, setCondition] = useState('NEW');
  const [weight, setWeight] = useState('');

  // Media
  const [media, setMedia] = useState<MediaFile[]>([]);

  // Variants
  const [variants, setVariants] = useState<Variant[]>([
    { size: '', color: '', colorHex: '', quantity: 1, priceAdjustment: 0 }
  ]);

  // Fulfillment Method (Seller Direct vs Admin Stock)
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(FULFILLMENT_METHOD.ADMIN_STOCK);
  const [sellerTier, setSellerTier] = useState<SellerTier | null>(null);
  const [canDirectShip, setCanDirectShip] = useState(false);
  const [sellerShippingLocations, setSellerShippingLocations] = useState<string[]>([]);
  const [sellerShippingTime, setSellerShippingTime] = useState('2-3 business days');
  const [sellerReturnPolicy, setSellerReturnPolicy] = useState('7-day return policy');

  // Selected parent category for subcategory dropdown
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  useEffect(() => {
    fetchCategories();
    fetchSellerTier();
    if (editId) {
      fetchProduct(editId);
    }
  }, [editId]);

  const fetchSellerTier = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      if (data.success && data.user) {
        const tier = data.user.designerTier as SellerTier | null;
        setSellerTier(tier);
        setCanDirectShip(canUseDirectShipping(tier));
      }
    } catch (error) {
      console.error('Failed to fetch seller tier:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/boutique/categories?parentOnly=true');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProduct = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boutique/products/${id}`);
      const data = await response.json();
      
      if (data.success) {
        const p = data.product;
        setTitle(p.title);
        setDescription(p.description || '');
        setCategoryId(p.categoryId);
        setSubcategory(p.subcategory || '');
        setBasePrice(p.basePrice.toString());
        setSalePrice(p.salePrice?.toString() || '');
        setBrand(p.brand || '');
        setMaterial(p.material || '');
        setCareInstructions(p.careInstructions || '');
        setTags(p.tags || []);
        setStyle(p.style || '');
        setOccasion(p.occasion || '');
        setGender(p.gender || '');
        setCondition(p.condition || 'NEW');
        setWeight(p.weight?.toString() || '');
        
        // Set media
        if (p.media && p.media.length > 0) {
          setMedia(p.media.map((m: { id: string; url: string; type: string; isPrimary: boolean }) => ({
            id: m.id,
            url: m.url,
            type: m.type as 'IMAGE' | 'VIDEO',
            isPrimary: m.isPrimary,
          })));
        }
        
        // Set variants
        if (p.variants && p.variants.length > 0) {
          setVariants(p.variants.map((v: { id: string; size: string; color: string; colorHex: string; quantity: number; priceAdjustment: number }) => ({
            id: v.id,
            size: v.size || '',
            color: v.color || '',
            colorHex: v.colorHex || '',
            quantity: v.quantity,
            priceAdjustment: v.priceAdjustment || 0,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const parent = categories.find(c => c.id === catId);
    setSelectedParentCategory(parent || null);
    setSubcategory('');
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO') => {
    const files = e.target.files;
    if (!files) return;

    const currentImages = media.filter(m => m.type === 'IMAGE').length;
    const currentVideos = media.filter(m => m.type === 'VIDEO').length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check limits
      if (type === 'IMAGE' && currentImages + i >= BOUTIQUE_DEFAULTS.maxImages) {
        setErrors([`Maximum ${BOUTIQUE_DEFAULTS.maxImages} images allowed`]);
        break;
      }
      if (type === 'VIDEO' && currentVideos + i >= BOUTIQUE_DEFAULTS.maxVideos) {
        setErrors([`Maximum ${BOUTIQUE_DEFAULTS.maxVideos} videos allowed`]);
        break;
      }

      // Create preview
      const url = URL.createObjectURL(file);
      const newMedia: MediaFile = {
        file,
        url,
        type,
        isPrimary: type === 'IMAGE' && currentImages === 0 && i === 0,
      };
      
      setMedia(prev => [...prev, newMedia]);
    }
    
    // Reset input
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    setMedia(prev => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      
      // If we removed the primary image, make the first image primary
      if (removed.isPrimary && updated.some(m => m.type === 'IMAGE')) {
        const firstImage = updated.find(m => m.type === 'IMAGE');
        if (firstImage) firstImage.isPrimary = true;
      }
      
      return updated;
    });
  };

  const setPrimaryImage = (index: number) => {
    setMedia(prev => prev.map((m, i) => ({
      ...m,
      isPrimary: m.type === 'IMAGE' && i === index,
    })));
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { size: '', color: '', colorHex: '', quantity: 1, priceAdjustment: 0 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const validateForm = (): string[] => {
    const errs: string[] = [];
    
    if (!title || title.length < 10) errs.push('Title must be at least 10 characters');
    if (!description || description.length < 50) errs.push('Description must be at least 50 characters');
    if (!categoryId) errs.push('Category is required');
    if (!basePrice || parseFloat(basePrice) <= 0) errs.push('Valid price is required');
    
    const images = media.filter(m => m.type === 'IMAGE');
    const videos = media.filter(m => m.type === 'VIDEO');
    
    if (images.length < BOUTIQUE_DEFAULTS.minImages) {
      errs.push(`Minimum ${BOUTIQUE_DEFAULTS.minImages} images required (you have ${images.length})`);
    }
    if (videos.length < BOUTIQUE_DEFAULTS.minVideos) {
      errs.push(`Minimum ${BOUTIQUE_DEFAULTS.minVideos} videos required (you have ${videos.length})`);
    }
    
    const validVariants = variants.filter(v => v.size || v.color);
    if (validVariants.length === 0) {
      errs.push('At least one size or color variant is required');
    }
    
    return errs;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setErrors([]);
    
    try {
      // Create or update product
      const productData = {
        title,
        description,
        categoryId,
        subcategory,
        basePrice,
        salePrice: salePrice || null,
        brand,
        material,
        careInstructions,
        tags,
        style,
        occasion,
        gender,
        condition,
        weight: weight || null,
        variants: variants.filter(v => v.size || v.color),
        isDraft: true,
        // Fulfillment method
        fulfillmentMethod,
        sellerShippingLocations: fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT ? sellerShippingLocations : [],
        sellerShippingTime: fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT ? sellerShippingTime : null,
        sellerReturnPolicy: fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT ? sellerReturnPolicy : null,
      };

      const url = editId 
        ? `/api/boutique/products/${editId}`
        : '/api/boutique/products';
      
      const response = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!data.success) {
        setErrors([data.message]);
        return;
      }

      const productId = data.product.id;

      // Upload new media files
      for (const m of media) {
        if (m.file && !m.id) {
          const formData = new FormData();
          formData.append('file', m.file);
          formData.append('type', m.type);
          formData.append('isPrimary', m.isPrimary.toString());

          await fetch(`/api/boutique/products/${productId}/media`, {
            method: 'POST',
            body: formData,
          });
        }
      }

      setSuccessMessage('Draft saved successfully!');
      
      if (!editId) {
        router.push(`/seller/boutique/upload?edit=${productId}`);
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setErrors(['Failed to save draft. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    try {
      // First save the draft
      await handleSaveDraft();

      // Then submit for review
      const response = await fetch(`/api/boutique/products/${editId}/submit`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Product submitted for review! You will be notified once reviewed.');
        setTimeout(() => {
          router.push('/seller/boutique');
        }, 2000);
      } else {
        setErrors(data.errors || [data.message]);
      }
    } catch (error) {
      console.error('Failed to submit for review:', error);
      setErrors(['Failed to submit. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const images = media.filter(m => m.type === 'IMAGE');
  const videos = media.filter(m => m.type === 'VIDEO');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/seller/boutique')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {editId ? 'Edit Product' : 'Add New Product'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {editId && (
              <button
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800">Please fix the following:</h4>
                <ul className="mt-2 space-y-1">
                  {errors.map((error, i) => (
                    <li key={i} className="text-red-700 text-sm">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        {/* Fulfillment Method Section */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              🚚 Shipping Method
            </h2>
            {sellerTier && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${SELLER_TIER_CONFIG[sellerTier]?.bgColor || 'bg-gray-100'}`}>
                <span>{SELLER_TIER_CONFIG[sellerTier]?.badge}</span>
                <span className={`text-sm font-medium ${SELLER_TIER_CONFIG[sellerTier]?.color || 'text-gray-700'}`}>
                  {SELLER_TIER_CONFIG[sellerTier]?.label}
                </span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Admin Stock Option */}
            <button
              type="button"
              onClick={() => setFulfillmentMethod(FULFILLMENT_METHOD.ADMIN_STOCK)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                fulfillmentMethod === FULFILLMENT_METHOD.ADMIN_STOCK
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{FULFILLMENT_CONFIG.ADMIN_STOCK.icon}</span>
                <span className="font-semibold text-gray-900">{FULFILLMENT_CONFIG.ADMIN_STOCK.label}</span>
              </div>
              <p className="text-sm text-gray-600">{FULFILLMENT_CONFIG.ADMIN_STOCK.description}</p>
              <div className="mt-3 text-xs text-gray-500">
                • Physical verification included<br/>
                • Admin handles shipping to buyers<br/>
                • 30 days free storage
              </div>
            </button>
            
            {/* Seller Direct Option */}
            <button
              type="button"
              onClick={() => canDirectShip && setFulfillmentMethod(FULFILLMENT_METHOD.SELLER_DIRECT)}
              disabled={!canDirectShip}
              className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT
                  ? 'border-purple-500 bg-purple-50'
                  : canDirectShip 
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
              }`}
            >
              {!canDirectShip && (
                <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  VIP+ Required
                </div>
              )}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{FULFILLMENT_CONFIG.SELLER_DIRECT.icon}</span>
                <span className="font-semibold text-gray-900">{FULFILLMENT_CONFIG.SELLER_DIRECT.label}</span>
              </div>
              <p className="text-sm text-gray-600">{FULFILLMENT_CONFIG.SELLER_DIRECT.description}</p>
              <div className="mt-3 text-xs text-gray-500">
                • Lower platform fees ({BOUTIQUE_DEFAULTS.sellerDirect.commissionDiscount}% off)<br/>
                • Ship within {BOUTIQUE_DEFAULTS.sellerDirect.shipDeadlineHours}h of order<br/>
                • You handle returns directly
              </div>
            </button>
          </div>

          {!canDirectShip && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800">
                  <strong>Unlock Seller Direct Shipping!</strong> Reach VIP Designer tier to ship directly to customers.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Requirements: 50+ sales • 4.5+ rating • 95%+ on-time delivery • &lt;5% return rate
                </p>
              </div>
            </div>
          )}

          {/* Seller Direct Shipping Details */}
          {fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT && canDirectShip && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-lg">📍</span> Your Shipping Details
              </h3>
              
              {/* Shipping Locations */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Locations (states you can ship to) *
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {sellerShippingLocations.map((state) => (
                    <span
                      key={state}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {state}
                      <button
                        type="button"
                        onClick={() => setSellerShippingLocations(sellerShippingLocations.filter(s => s !== state))}
                        className="hover:text-purple-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !sellerShippingLocations.includes(e.target.value)) {
                      setSellerShippingLocations([...sellerShippingLocations, e.target.value]);
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Add a state...</option>
                  {NIGERIAN_STATES.filter(s => !sellerShippingLocations.includes(s)).map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSellerShippingLocations([...NIGERIAN_STATES])}
                  className="text-sm text-purple-600 hover:text-purple-800 mt-2"
                >
                  + Select all states (Nationwide)
                </button>
              </div>

              {/* Shipping Time */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Shipping Time
                </label>
                <select
                  value={sellerShippingTime}
                  onChange={(e) => setSellerShippingTime(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="1-2 business days">1-2 business days</option>
                  <option value="2-3 business days">2-3 business days</option>
                  <option value="3-5 business days">3-5 business days</option>
                  <option value="5-7 business days">5-7 business days</option>
                </select>
              </div>

              {/* Return Policy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Return Policy
                </label>
                <select
                  value={sellerReturnPolicy}
                  onChange={(e) => setSellerReturnPolicy(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="7-day return policy">7-day return policy</option>
                  <option value="14-day return policy">14-day return policy</option>
                  <option value="30-day return policy">30-day return policy</option>
                  <option value="No returns accepted">No returns (final sale)</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Important:</strong> As a Seller Direct merchant, you must ship orders within{' '}
                  <strong>{BOUTIQUE_DEFAULTS.sellerDirect.shipDeadlineHours} hours</strong>.
                  Late shipments affect your tier status and may result in penalties.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Media Upload Section */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📸 Product Media
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Min: {BOUTIQUE_DEFAULTS.minImages} images, {BOUTIQUE_DEFAULTS.minVideos} videos)
            </span>
          </h2>

          {/* Images */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Images ({images.length}/{BOUTIQUE_DEFAULTS.maxImages})
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  <Image
                    src={img.url}
                    alt={`Product image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {img.isPrimary && (
                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                      Primary
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.isPrimary && (
                      <button
                        onClick={() => setPrimaryImage(media.indexOf(img))}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        title="Set as primary"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeMedia(media.indexOf(img))}
                      className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {images.length < BOUTIQUE_DEFAULTS.maxImages && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-purple-600 transition-colors">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-sm">Add Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMediaUpload(e, 'IMAGE')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Videos */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Videos ({videos.length}/{BOUTIQUE_DEFAULTS.maxVideos})
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {videos.map((vid, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-900 group">
                  <video
                    src={vid.url}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                      <Video className="w-6 h-6 text-gray-800" />
                    </div>
                  </div>
                  <button
                    onClick={() => removeMedia(media.indexOf(vid))}
                    className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {videos.length < BOUTIQUE_DEFAULTS.maxVideos && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-purple-600 transition-colors">
                  <Video className="w-8 h-8 mb-2" />
                  <span className="text-sm">Add Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleMediaUpload(e, 'VIDEO')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📝 Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Elegant Ankara Maxi Dress with Puff Sleeves"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters (min 10)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe your product in detail: materials, fit, occasions, care instructions..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/1000 characters (min 50)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {selectedParentCategory?.children && selectedParentCategory.children.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select subcategory</option>
                    {selectedParentCategory.children.map(sub => (
                      <option key={sub.id} value={sub.slug}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand (optional)</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Brand name"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {Object.entries(PRODUCT_CONDITION).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💰 Pricing</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (₦)</label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Optional discount price"
                min="0"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {basePrice && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Platform Commission:</strong> 15% • 
                <strong> You'll Earn:</strong> ₦{(parseFloat(basePrice) * 0.85).toLocaleString()} per sale
              </p>
            </div>
          )}
        </div>

        {/* Variants */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">📏 Size & Color Variants</h2>
            <button
              onClick={addVariant}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Variant
            </button>
          </div>

          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                    <select
                      value={variant.size}
                      onChange={(e) => updateVariant(index, 'size', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">Select</option>
                      {STANDARD_SIZES.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                      <option value="FREE_SIZE">Free Size</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                    <select
                      value={variant.color}
                      onChange={(e) => {
                        const color = COMMON_COLORS.find(c => c.name === e.target.value);
                        updateVariant(index, 'color', e.target.value);
                        if (color) updateVariant(index, 'colorHex', color.hex);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">Select</option>
                      {COMMON_COLORS.map(color => (
                        <option key={color.name} value={color.name}>{color.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={variant.quantity}
                      onChange={(e) => updateVariant(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    {variants.length > 1 && (
                      <button
                        onClick={() => removeVariant(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 Additional Details</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              >
                <option value="">Select</option>
                {GENDER_OPTIONS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              >
                <option value="">Select</option>
                {STYLES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Occasion</label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              >
                <option value="">Select</option>
                {OCCASIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g., 100% Cotton"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Care Instructions</label>
            <input
              type="text"
              value={careInstructions}
              onChange={(e) => setCareInstructions(e.target.value)}
              placeholder="e.g., Machine wash cold, tumble dry low"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-purple-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tags for better discovery"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>What happens next?</strong>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>Submit your product for content review</li>
              <li>Our team reviews your images and videos (1-2 business days)</li>
              <li>Once approved, ship your product to our warehouse within 7 days</li>
              <li>We verify the physical product matches your listing</li>
              <li>Your product goes live for buyers to purchase!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
