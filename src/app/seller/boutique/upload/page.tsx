'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
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
import { ProductAttributesForm } from '@/components/boutique/product-attributes-form';
import {
  getAttributesForCategory,
  hasCustomAttributes,
} from '@/lib/boutique/product-attributes';
import { 
  STANDARD_SIZES, 
  GENDER_OPTIONS, 
  OCCASIONS, 
  STYLES, 
  PRODUCT_CONDITIONS, 
  BOUTIQUE_DEFAULTS,
  FULFILLMENT_METHOD,
  FULFILLMENT_CONFIG,
  SELLER_TIER_CONFIG,
  NIGERIAN_STATES,
  COMMON_COLORS,
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



function BoutiqueUploadContent() {
  const { status: authStatus } = useSession();
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
  const [pattern, setPattern] = useState('');

  // Media
  const [media, setMedia] = useState<MediaFile[]>([]);

  // Variants
  const [variants, setVariants] = useState<Variant[]>([
    { size: '', color: '', colorHex: '', quantity: 1, priceAdjustment: 0 }
  ]);

  // Fulfillment Method (Seller Direct vs Admin Stock)
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(FULFILLMENT_METHOD.ADMIN_STOCK);
  const [sellerTier, setSellerTier] = useState<SellerTier | null>(null);
  const [boutiqueCommissionInfo, setBoutiqueCommissionInfo] = useState<any>(null);
  const [canDirectShip, setCanDirectShip] = useState(false);
  const [sellerShippingLocations, setSellerShippingLocations] = useState<string[]>([]);
  const [sellerShippingTime, setSellerShippingTime] = useState('2-3 business days');
  const [sellerReturnPolicy, setSellerReturnPolicy] = useState('7-day return policy');

  // Custom product attributes (category-specific: perfume, jewelry, headwear, etc.)
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});

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
      // API returns { success: true, user, boutiqueCommission }
      if (data && data.user) {
        const tier = data.user.designerTier as SellerTier | null;
        setSellerTier(tier);
        setCanDirectShip(canUseDirectShipping(tier));
        setBoutiqueCommissionInfo(data.boutiqueCommission || null)
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
    if (selectedParentCategory?.children && selectedParentCategory.children.length > 0 && !subcategory) errs.push('Subcategory is required');
    if (!condition) errs.push('Condition is required');
    if (!gender) errs.push('Gender is required');
    if (!style) errs.push('Style is required');
    if (!occasion) errs.push('Occasion is required');
    if (!basePrice || parseFloat(basePrice) <= 0) errs.push('Valid price is required');
    const images = media.filter(m => m.type === 'IMAGE');
    const videos = media.filter(m => m.type === 'VIDEO');
    if (images.length < BOUTIQUE_DEFAULTS.minImages) {
      errs.push(`Minimum ${BOUTIQUE_DEFAULTS.minImages} images required (you have ${images.length})`);
    }
    if (videos.length < BOUTIQUE_DEFAULTS.minVideos) {
      errs.push(`Minimum ${BOUTIQUE_DEFAULTS.minVideos} videos required (you have ${videos.length})`);
    }
    // All variants must have size and color selected
    variants.forEach((v, i) => {
      if (!v.size) errs.push(`Variant ${i + 1}: Size is required`);
      if (!v.color) errs.push(`Variant ${i + 1}: Color is required`);
    });
    if (!material) errs.push('Material is required');
    if (!pattern) errs.push('Pattern is required');
    return errs;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setErrors([]);
    
    try {
      // Create or update product
      const productData: Record<string, unknown> = {
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
        // Custom attributes (only if category has them and they're not empty)
        customAttributes: Object.keys(customAttributes).length > 0 ? customAttributes : null,
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

  useEffect(() => {
    if (pattern) {
      console.log('Pattern updated:', pattern);
    }
  }, [pattern]);

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
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/seller/boutique')}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Go back to boutique products"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-base sm:text-xl font-bold text-gray-900">
              {editId ? 'Edit Product' : 'Add Product'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Save className="w-3 h-3 sm:w-4 sm:h-4" />
              {saving ? 'Saving...' : 'Draft'}
            </button>
            <button
              onClick={editId ? handleSubmitForReview : handleSaveDraft}
              disabled={submitting || saving}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg flex items-center gap-1 sm:gap-2 hover:bg-purple-700 text-xs sm:text-sm"
            >
              <Send className="w-3 h-3 sm:w-4 sm:h-4" />
              {editId ? (submitting ? 'Submitting...' : 'Submit') : (saving ? 'Saving...' : 'Save & Continue')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 text-xs sm:text-base">Please fix the following:</h4>
                <ul className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                  {errors.map((error, i) => (
                    <li key={i} className="text-red-700 text-[10px] sm:text-sm">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            <span className="text-green-800 text-xs sm:text-base">{successMessage}</span>
          </div>
        )}

        {/* Fulfillment Method Section */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900">
              🚚 Shipping Method
            </h2>
            {sellerTier && (
              <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${SELLER_TIER_CONFIG[sellerTier]?.bgColor || 'bg-gray-100'}`}>
                <span className="text-xs sm:text-base">{SELLER_TIER_CONFIG[sellerTier]?.badge}</span>
                <span className={`text-[10px] sm:text-sm font-medium ${SELLER_TIER_CONFIG[sellerTier]?.color || 'text-gray-700'}`}>
                  {SELLER_TIER_CONFIG[sellerTier]?.label}
                </span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
            {/* Admin Stock Option */}
            <button
              type="button"
              onClick={() => setFulfillmentMethod(FULFILLMENT_METHOD.ADMIN_STOCK)}
              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all ${
                fulfillmentMethod === FULFILLMENT_METHOD.ADMIN_STOCK
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <span className="text-lg sm:text-2xl">{FULFILLMENT_CONFIG.ADMIN_STOCK.icon}</span>
                <span className="font-semibold text-gray-900 text-xs sm:text-base">{FULFILLMENT_CONFIG.ADMIN_STOCK.label}</span>
              </div>
              <p className="text-[10px] sm:text-sm text-gray-600">{FULFILLMENT_CONFIG.ADMIN_STOCK.description}</p>
              <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-gray-500 hidden sm:block">
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
              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all relative ${
                fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT
                  ? 'border-purple-500 bg-purple-50'
                  : canDirectShip 
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
              }`}
            >
              {!canDirectShip && (
                <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  VIP+
                </div>
              )}
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <span className="text-lg sm:text-2xl">{FULFILLMENT_CONFIG.SELLER_DIRECT.icon}</span>
                <span className="font-semibold text-gray-900 text-xs sm:text-base">{FULFILLMENT_CONFIG.SELLER_DIRECT.label}</span>
              </div>
              <p className="text-[10px] sm:text-sm text-gray-600">{FULFILLMENT_CONFIG.SELLER_DIRECT.description}</p>
              <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                • Lower platform fees ({BOUTIQUE_DEFAULTS.sellerDirect.commissionDiscount}% off)<br/>
                • Ship within {BOUTIQUE_DEFAULTS.sellerDirect.shipDeadlineHours}h of order<br/>
                • You handle returns directly
              </div>
            </button>
          </div>

          {!canDirectShip && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] sm:text-sm text-amber-800">
                  <strong>Unlock Seller Direct!</strong> Reach VIP tier to ship directly.
                </p>
                <p className="text-[10px] sm:text-xs text-amber-700 mt-0.5 sm:mt-1 hidden xs:block">
                  50+ sales • 4.5+ rating • 95%+ on-time
                </p>
              </div>
            </div>
          )}

          {/* Seller Direct Shipping Details */}
          {fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT && canDirectShip && (
            <div className="mt-4 sm:mt-6 border-t pt-4 sm:pt-6">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg">📍</span> Your Shipping Details
              </h3>
              
              {/* Shipping Locations */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Shipping Locations *
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                  {sellerShippingLocations.map((state) => (
                    <span
                      key={state}
                      className="inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] sm:text-sm"
                    >
                      {state}
                      <button
                        type="button"
                        onClick={() => setSellerShippingLocations(sellerShippingLocations.filter(s => s !== state))}
                        className="hover:text-purple-900"
                        aria-label={`Remove ${state} from shipping locations`}
                      >
                        <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
                  className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 text-sm text-gray-900"
                  aria-label="Add shipping location"
                >
                  <option value="" className="text-gray-900">Add a state...</option>
                  {NIGERIAN_STATES.filter(s => !sellerShippingLocations.includes(s)).map((state) => (
                    <option key={state} value={state} className="text-gray-900">{state}</option>
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 text-gray-900"
                  aria-label="Select shipping time"
                >
                  <option value="1-2 business days" className="text-gray-900">1-2 business days</option>
                  <option value="2-3 business days" className="text-gray-900">2-3 business days</option>
                  <option value="3-5 business days" className="text-gray-900">3-5 business days</option>
                  <option value="5-7 business days" className="text-gray-900">5-7 business days</option>
                </select>
              </div>

              {/* Return Policy */}
              <div>
                <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                  Your Return Policy
                </label>
                <select
                  value={sellerReturnPolicy}
                  onChange={(e) => setSellerReturnPolicy(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 text-sm text-gray-900"
                  aria-label="Select return policy"
                >
                  <option value="7-day return policy" className="text-gray-900">7-day return policy</option>
                  <option value="14-day return policy" className="text-gray-900">14-day return policy</option>
                  <option value="30-day return policy" className="text-gray-900">30-day return policy</option>
                  <option value="No returns accepted" className="text-gray-900">No returns (final sale)</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="mt-3 sm:mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-[10px] sm:text-sm text-blue-800">
                  <strong>Important:</strong> Ship orders within{' '}
                  <strong>{BOUTIQUE_DEFAULTS.sellerDirect.shipDeadlineHours}h</strong>.
                  <span className="hidden sm:inline"> Late shipments affect your tier status.</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Media Upload Section */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
            📸 Product Media
            <span className="text-[10px] sm:text-sm font-normal text-gray-500 ml-1 sm:ml-2">
              (Min: {BOUTIQUE_DEFAULTS.minImages} img, {BOUTIQUE_DEFAULTS.minVideos} vid)
            </span>
          </h2>

          {/* Images */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-[10px] sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
              Images ({images.length}/{BOUTIQUE_DEFAULTS.maxImages})
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  <Image
                    src={img.url}
                    alt={`Product image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {img.isPrimary && (
                    <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-purple-600 text-white text-[8px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded">
                      Primary
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 sm:gap-2">
                    {!img.isPrimary && (
                      <button
                        onClick={() => setPrimaryImage(media.indexOf(img))}
                        className="p-1 sm:p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                        title="Set as primary"
                      >
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeMedia(media.indexOf(img))}
                      className="p-1 sm:p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                      aria-label="Remove image"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {images.length < BOUTIQUE_DEFAULTS.maxImages && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-purple-600 transition-colors">
                  <Camera className="w-5 h-5 sm:w-8 sm:h-8 mb-1 sm:mb-2" />
                  <span className="text-[10px] sm:text-sm">Add</span>
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
            <h3 className="text-[10px] sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
              Videos ({videos.length}/{BOUTIQUE_DEFAULTS.maxVideos})
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4">
              {videos.map((vid, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-900 group">
                  <video
                    src={vid.url}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/80 rounded-full flex items-center justify-center">
                      <Video className="w-4 h-4 sm:w-6 sm:h-6 text-gray-800" />
                    </div>
                  </div>
                  <button
                    onClick={() => removeMedia(media.indexOf(vid))}
                    className="absolute top-1 sm:top-2 right-1 sm:right-2 p-1 sm:p-2 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove video"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ))}
              {videos.length < BOUTIQUE_DEFAULTS.maxVideos && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-purple-600 transition-colors">
                  <Video className="w-5 h-5 sm:w-8 sm:h-8 mb-1 sm:mb-2" />
                  <span className="text-[10px] sm:text-sm">Add</span>
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
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">📝 Basic Information</h2>
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                Product Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Elegant Ankara Maxi Dress"
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
              />
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{title.length}/100 (min 10)</p>
            </div>

            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe your product in detail..."
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm text-gray-900 placeholder:text-gray-400"
              />
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{description.length}/1000 (min 50)</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900"
                  aria-label="Select product category"
                  required
                >
                  <option value="" className="text-gray-900">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id} className="text-gray-900">{cat.name}</option>
                  ))}
                </select>
              </div>

              {selectedParentCategory?.children && selectedParentCategory.children.length > 0 && (
                <div>
                  <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900"
                    aria-label="Select product subcategory"
                    required
                  >
                    <option value="" className="text-gray-900">Select subcategory</option>
                    {selectedParentCategory.children.map(sub => (
                      <option key={sub.id} value={sub.slug} className="text-gray-900">{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Brand name"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900"
                  aria-label="Select product condition"
                  required
                >
                  {Object.entries(PRODUCT_CONDITIONS).map(([key, label]) => (
                    <option key={key} value={key} className="text-gray-900">{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Product Attributes Section (conditional by category) */}
            {categoryId && hasCustomAttributes(selectedParentCategory?.slug || '') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-4">
                  {getAttributesForCategory(selectedParentCategory?.slug || '')?.icon}{' '}
                  {getAttributesForCategory(selectedParentCategory?.slug || '')?.label}
                </h3>
                <ProductAttributesForm
                  fields={getAttributesForCategory(selectedParentCategory?.slug || '')?.fields || []}
                  values={customAttributes}
                  onChange={(key, value) => setCustomAttributes({...customAttributes, [key]: value})}
                />
              </div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">💰 Pricing</h2>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Sale Price (₦)</label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Optional"
                min="0"
                className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          {basePrice && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-purple-50 rounded-lg">
              <p className="text-[10px] sm:text-sm text-purple-800">
                {fulfillmentMethod === FULFILLMENT_METHOD.ADMIN_STOCK ? (
                  <>
                    <strong>Commission:</strong>{' '}
                    {boutiqueCommissionInfo ? (
                      <>{boutiqueCommissionInfo.percentage}% ({boutiqueCommissionInfo.tierName})</>
                    ) : (
                      <>Calculating commission...</>
                    )}
                    {' '}• <strong> Earn:</strong>{' '}
                    {boutiqueCommissionInfo ? (
                      <>₦{(parseFloat(basePrice) * (1 - boutiqueCommissionInfo.rate)).toLocaleString()}</>
                    ) : (
                      <>Calculating...</>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Commission:</strong> 7-10% (Tiered - based on your sales) • 
                    <strong> Est. Earn:</strong> ₦{(parseFloat(basePrice) * 0.90).toLocaleString()} - ₦{(parseFloat(basePrice) * 0.93).toLocaleString()}
                  </>
                )}
              </p>

              {fulfillmentMethod === FULFILLMENT_METHOD.ADMIN_STOCK && boutiqueCommissionInfo && (
                <div className="mt-2 text-[10px] sm:text-xs text-gray-600">
                  Progress to next tier: {Math.round(boutiqueCommissionInfo.progressToNextTier)}%{boutiqueCommissionInfo.amountToNextTier ? ` • ${boutiqueCommissionInfo.amountToNextTier} to next tier` : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Variants */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900">📏 Variants</h2>
            <button
              onClick={addVariant}
              className="text-purple-600 hover:text-purple-700 text-[10px] sm:text-sm font-medium flex items-center gap-0.5 sm:gap-1"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              Add
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {variants.map((variant, index) => (
              <div key={index} className="p-3 sm:p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Size</label>
                    <select
                      value={variant.size}
                      onChange={(e) => updateVariant(index, 'size', e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                      aria-label="Select size for this variant"
                    >
                      <option value="" className="text-gray-900">Select</option>
                      {STANDARD_SIZES.map(size => (
                        <option key={size} value={size} className="text-gray-900">{size}</option>
                      ))}
                      <option value="FREE_SIZE" className="text-gray-900">Free Size</option>
                      <option value="CUSTOM" className="text-gray-900">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Color</label>
                    <select
                      value={variant.color}
                      onChange={(e) => {
                        const color = COMMON_COLORS.find(c => c.name === e.target.value);
                        updateVariant(index, 'color', e.target.value);
                        if (color) updateVariant(index, 'colorHex', color.hex);
                      }}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                      aria-label="Select color for this variant"
                    >
                      <option value="" className="text-gray-900">Select</option>
                      {COMMON_COLORS.map(color => (
                        <option key={color.name} value={color.name} className="text-gray-900">{color.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-1">Qty</label>
                    <input
                      type="number"
                      value={variant.quantity}
                      onChange={(e) => updateVariant(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                      aria-label="Quantity for this variant"
                    />
                  </div>

                  <div className="flex items-end">
                    {variants.length > 1 && (
                      <button
                        onClick={() => removeVariant(index)}
                        className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        aria-label="Remove this variant"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">📋 Additional Details</h2>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-2 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                aria-label="Select target gender"
                required
              >
                <option value="" className="text-gray-900">Select</option>
                {GENDER_OPTIONS.map(g => (
                  <option key={g} value={g} className="text-gray-900">{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-2 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                aria-label="Select product style"
                required
              >
                <option value="" className="text-gray-900">Select</option>
                {STYLES.map(s => (
                  <option key={s} value={s} className="text-gray-900">{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Occasion</label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full px-2 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                aria-label="Select product occasion"
              >
                <option value="" className="text-gray-900">Select</option>
                {OCCASIONS.map(o => (
                  <option key={o} value={o} className="text-gray-900">{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Material</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g., 100% Cotton"
                className="w-full px-2 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Pattern</label>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g., Striped, Floral"
                className="w-full px-2 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Care Instructions</label>
            <input
              type="text"
              value={careInstructions}
              onChange={(e) => setCareInstructions(e.target.value)}
              placeholder="e.g., Machine wash cold"
              className="w-full px-2 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] sm:text-sm flex items-center gap-0.5 sm:gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-purple-900" aria-label={`Remove tag ${tag}`}>
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tags"
                className="flex-1 px-2 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 placeholder:text-gray-400"
              />
              <button
                onClick={addTag}
                className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] sm:text-sm text-blue-800">
            <strong>What happens next?</strong>
            <ol className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 list-decimal list-inside">
              <li>Submit for content review</li>
              <li>Team reviews (1-2 days)</li>
              <li>Ship to warehouse within 7 days</li>
              <li>Product goes live!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap content in Suspense for useSearchParams
export default function BoutiqueUploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <BoutiqueUploadContent />
    </Suspense>
  );
}


