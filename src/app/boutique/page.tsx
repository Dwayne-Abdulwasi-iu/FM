'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Star,
  Heart,
  ShoppingBag,
  Grid3X3,
  LayoutGrid,
  X,
  Rocket,
} from 'lucide-react';
import { 
  GENDER_OPTIONS, 
  STYLES, 
  PRODUCT_CONDITION,
  FULFILLMENT_METHOD,
} from '@/lib/boutique/constants';

interface Product {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  thumbnailUrl: string;
  category: { name: string; slug: string };
  brand: string;
  seller: { name: string };
  reviewCount: number;
  avgRating: number | null;
  availableSizes: string[];
  availableColors: { color: string; hex: string }[];
  fulfillmentMethod?: string;
  sellerShippingTime?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

// Loading fallback for Suspense
function BoutiqueLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
    </div>
  );
}

function BoutiqueShopContent() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'large'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedGender, setSelectedGender] = useState(searchParams.get('gender') || '');
  const [selectedStyle, setSelectedStyle] = useState(searchParams.get('style') || '');
  const [selectedCondition, setSelectedCondition] = useState(searchParams.get('condition') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, sortBy, selectedCategory, selectedGender, selectedStyle, selectedCondition, minPrice, maxPrice]);

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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('sort', sortBy);
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedGender) params.set('gender', selectedGender);
      if (selectedStyle) params.set('style', selectedStyle);
      if (selectedCondition) params.set('condition', selectedCondition);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);

      const response = await fetch(`/api/boutique/shop?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedGender('');
    setSelectedStyle('');
    setSelectedCondition('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const hasActiveFilters = selectedCategory || selectedGender || selectedStyle || selectedCondition || minPrice || maxPrice;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
          <h1 className="text-xl sm:text-4xl font-bold mb-1 sm:mb-2">Fashion Boutique</h1>
          <p className="text-purple-100 text-xs sm:text-lg">Verified fashion items, ready to ship</p>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
          <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dresses, bags, shoes..."
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 text-xs sm:text-sm"
                />
              </div>
            </form>

            {/* Sort & View */}
            <div className="flex items-center gap-2 sm:gap-4 w-full md:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 border rounded-lg text-xs sm:text-sm ${
                  hasActiveFilters ? 'border-purple-500 text-purple-600 bg-purple-50' : 'border-gray-200 text-gray-900'
                }`}
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-4 h-4 sm:w-5 sm:h-5 bg-purple-600 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 text-xs sm:text-sm"
                aria-label="Sort products by"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="text-gray-900">{opt.label}</option>
                ))}
              </select>

              <div className="hidden md:flex items-center gap-1 border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('large')}
                  className={`p-1.5 rounded ${viewMode === 'large' ? 'bg-gray-100' : ''}`}
                  aria-label="Large view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                aria-label="Filter by category"
              >
                <option value="" className="text-gray-900">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.slug} className="text-gray-900">{cat.name}</option>
                ))}
              </select>

              <select
                value={selectedGender}
                onChange={(e) => { setSelectedGender(e.target.value); setPage(1); }}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                aria-label="Filter by gender"
              >
                <option value="" className="text-gray-900">All Genders</option>
                {GENDER_OPTIONS.map(g => (
                  <option key={g} value={g} className="text-gray-900">{g}</option>
                ))}
              </select>

              <select
                value={selectedStyle}
                onChange={(e) => { setSelectedStyle(e.target.value); setPage(1); }}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                aria-label="Filter by style"
              >
                <option value="" className="text-gray-900">All Styles</option>
                {STYLES.map(s => (
                  <option key={s} value={s} className="text-gray-900">{s}</option>
                ))}
              </select>

              <select
                value={selectedCondition}
                onChange={(e) => { setSelectedCondition(e.target.value); setPage(1); }}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                aria-label="Filter by condition"
              >
                <option value="" className="text-gray-900">All Conditions</option>
                {Object.entries(PRODUCT_CONDITION).map(([key, label]) => (
                  <option key={key} value={key} className="text-gray-900">{label}</option>
                ))}
              </select>

              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="number"
                  placeholder="Min ₦"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                />
                <input
                  type="number"
                  placeholder="Max ₦"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900"
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1 text-xs sm:text-sm text-purple-600 hover:text-purple-700"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => { setSelectedCategory(''); setPage(1); }}
              className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap ${
                !selectedCategory ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.slug); setPage(1); }}
                className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap ${
                  selectedCategory === cat.slug ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <ShoppingBag className="w-10 h-10 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-semibold text-gray-900">No Products Found</h3>
            <p className="text-xs sm:text-base text-gray-500 mt-1 sm:mt-2">Try adjusting your filters or search terms</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-4">
              Showing {products.length} of {pagination.total} products
            </p>

            <div className={`grid gap-2 sm:gap-3 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {products.map(product => (
                <Link
                  key={product.id}
                  href={`/boutique/${product.slug}`}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  {/* Image */}
                  <div className={`relative ${viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/3]'} bg-gray-100`}>
                    {product.thumbnailUrl ? (
                      <Image
                        src={product.thumbnailUrl}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300" />
                      </div>
                    )}
                    
                    {/* Sale Badge */}
                    {product.salePrice && (
                      <div className="absolute top-1.5 sm:top-3 left-1.5 sm:left-3 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        SALE
                      </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => { e.preventDefault(); }}
                      className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 p-1.5 sm:p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Add to wishlist"
                    >
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                    </button>

                    {/* Available Colors */}
                    {product.availableColors.length > 0 && (
                      <div className="absolute bottom-1.5 sm:bottom-3 left-1.5 sm:left-3 flex gap-0.5 sm:gap-1">
                        {product.availableColors.slice(0, 4).map((c, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: c.hex || '#ccc' }}
                            title={c.color}
                          />
                        ))}
                        {product.availableColors.length > 4 && (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-200 border-2 border-white shadow flex items-center justify-center text-[6px] sm:text-[8px] text-gray-600">
                            +{product.availableColors.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2 sm:p-3">
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">{product.category.name}</p>
                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 mb-1 sm:mb-2">{product.title}</h3>
                    
                    {/* Fulfillment Badge */}
                    {product.fulfillmentMethod === FULFILLMENT_METHOD.SELLER_DIRECT && (
                      <div className="flex items-center gap-1 mb-1 sm:mb-2">
                        <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-700">
                          <Rocket className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          Seller Direct
                        </span>
                        {product.sellerShippingTime && (
                          <span className="text-[10px] sm:text-xs text-gray-500">
                            • {product.sellerShippingTime}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Price */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-sm sm:text-lg font-bold text-purple-600">
                        ₦{(product.salePrice || product.basePrice).toLocaleString()}
                      </span>
                      {product.salePrice && (
                        <span className="text-[10px] sm:text-sm text-gray-400 line-through">
                          ₦{product.basePrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    {product.reviewCount > 0 && (
                      <div className="flex items-center gap-0.5 sm:gap-1 mt-1 sm:mt-2">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] sm:text-sm text-gray-600">
                          {product.avgRating?.toFixed(1)} ({product.reviewCount})
                        </span>
                      </div>
                    )}

                    {/* Sizes */}
                    {product.availableSizes.length > 0 && (
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
                        Sizes: {product.availableSizes.slice(0, 4).join(', ')}
                        {product.availableSizes.length > 4 && '...'}
                      </p>
                    )}

                    {/* Add to Cart Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/boutique/${product.slug}`;
                      }}
                      className="w-full mt-2 sm:mt-3 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-[11px] sm:text-sm flex items-center justify-center gap-1 sm:gap-2"
                    >
                      <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                      Add to Cart
                    </button>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6 sm:mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm ${
                          page === pageNum
                            ? 'bg-purple-600 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Wrap content in Suspense for useSearchParams
export default function BoutiqueShopPage() {
  return (
    <Suspense fallback={<BoutiqueLoading />}>
      <BoutiqueShopContent />
    </Suspense>
  );
}
