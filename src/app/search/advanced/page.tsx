'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Search, 
  Grid, 
  List,
  SlidersHorizontal,
  TrendingUp,
  Star,
  BadgeCheck
} from 'lucide-react'

interface Design {
  id: string
  title: string
  price: number
  imageUrl: string
  thumbnailUrl: string | null
  category: string
  style: string | null
  totalSales: number
  trendingScore: number
  designer: {
    id: string
    name: string | null
    displayName: string | null
    image: string | null
    isVerified: boolean
    verificationBadge: string | null
  }
  _count: {
    reviews: number
    favorites: number
  }
}

interface FilterOptions {
  categories: string[]
  styles: string[]
  garmentTypes: string[]
  seasons: string[]
  occasions: string[]
  targetAudiences: string[]
  colors: string[]
  sortOptions: { value: string; label: string }[]
}

function AdvancedSearchContent() {
  const _router = useRouter()
  const searchParams = useSearchParams()
  
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Filter state
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [style, setStyle] = useState<string[]>([])
  const [colorPalette, setColorPalette] = useState<string[]>([])
  const [garmentType, setGarmentType] = useState('all')
  const [season, setSeason] = useState('all')
  const [occasion, setOccasion] = useState('all')
  const [targetAudience, setTargetAudience] = useState('all')
  const [priceMin, setPriceMin] = useState<number | undefined>()
  const [priceMax, setPriceMax] = useState<number | undefined>()
  const [sortBy, setSortBy] = useState('relevance')
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Load filter options
  useEffect(() => {
    fetchFilterOptions()
  }, [])

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/search/advanced')
      if (response.ok) {
        const data = await response.json()
        setFilterOptions(data.filterOptions)
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error)
    }
  }

  const search = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          category: category !== 'all' ? category : undefined,
          style: style.length > 0 ? style : undefined,
          colorPalette: colorPalette.length > 0 ? colorPalette : undefined,
          garmentType: garmentType !== 'all' ? garmentType : undefined,
          season: season !== 'all' ? season : undefined,
          occasion: occasion !== 'all' ? occasion : undefined,
          targetAudience: targetAudience !== 'all' ? targetAudience : undefined,
          priceMin,
          priceMax,
          sortBy,
          page,
          limit: 12,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDesigns(data.designs)
        setTotalPages(data.pagination.pages)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }, [query, category, style, colorPalette, garmentType, season, occasion, targetAudience, priceMin, priceMax, sortBy, page])

  useEffect(() => {
    search()
  }, [search])

  const clearFilters = () => {
    setCategory('all')
    setStyle([])
    setColorPalette([])
    setGarmentType('all')
    setSeason('all')
    setOccasion('all')
    setTargetAudience('all')
    setPriceMin(undefined)
    setPriceMax(undefined)
    setSortBy('relevance')
    setPage(1)
  }

  const hasActiveFilters = 
    category !== 'all' || 
    style.length > 0 || 
    colorPalette.length > 0 ||
    garmentType !== 'all' ||
    season !== 'all' ||
    occasion !== 'all' ||
    targetAudience !== 'all' ||
    priceMin !== undefined ||
    priceMax !== undefined

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const toggleColor = (color: string) => {
    setColorPalette(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    )
  }

  const toggleStyle = (s: string) => {
    setStyle(prev => 
      prev.includes(s) 
        ? prev.filter(st => st !== s)
        : [...prev, s]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Search designs, designers, styles..."
                className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs sm:text-sm text-black placeholder-gray-500"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort results by"
              className="px-2.5 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm text-black [color:black]"
            >
              {filterOptions?.sortOptions.map((option) => (
                <option key={option.value} value={option.value} className="text-black">
                  {option.label}
                </option>
              ))}
            </select>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
              {hasActiveFilters && (
                <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </button>

            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden" role="group" aria-label="View mode">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                aria-label="Grid view"
                aria-current={viewMode === 'grid' ? 'true' : undefined}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                aria-label="List view"
                aria-current={viewMode === 'list' ? 'true' : undefined}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && filterOptions && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Category */}
                <div>
                  <label htmlFor="filter-category" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Category
                  </label>
                  <select
                    id="filter-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-black [color:black]"
                  >
                    <option value="all" className="text-black">All Categories</option>
                    {filterOptions.categories.map((cat) => (
                      <option key={cat} value={cat} className="text-black">{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Garment Type */}
                <div>
                  <label htmlFor="filter-garment-type" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Garment Type
                  </label>
                  <select
                    id="filter-garment-type"
                    value={garmentType}
                    onChange={(e) => setGarmentType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-black [color:black]"
                  >
                    <option value="all" className="text-black">All Types</option>
                    {filterOptions.garmentTypes.map((type) => (
                      <option key={type} value={type} className="text-black">{type}</option>
                    ))}
                  </select>
                </div>

                {/* Season */}
                <div>
                  <label htmlFor="filter-season" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Season
                  </label>
                  <select
                    id="filter-season"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-black [color:black]"
                  >
                    <option value="all" className="text-black">All Seasons</option>
                    {filterOptions.seasons.map((s) => (
                      <option key={s} value={s} className="text-black">{s}</option>
                    ))}
                  </select>
                </div>

                {/* Occasion */}
                <div>
                  <label htmlFor="filter-occasion" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Occasion
                  </label>
                  <select
                    id="filter-occasion"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-black [color:black]"
                  >
                    <option value="all" className="text-black">All Occasions</option>
                    {filterOptions.occasions.map((o) => (
                      <option key={o} value={o} className="text-black">{o}</option>
                    ))}
                  </select>
                </div>

                {/* Target Audience */}
                <div>
                  <label htmlFor="filter-audience" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Audience
                  </label>
                  <select
                    id="filter-audience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-black [color:black]"
                  >
                    <option value="all" className="text-black">Everyone</option>
                    {filterOptions.targetAudiences.map((a) => (
                      <option key={a} value={a} className="text-black">{a}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Price Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceMin || ''}
                      onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-black placeholder-gray-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceMax || ''}
                      onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-black placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="mt-4">
                <label className="block text-xs sm:text-sm font-medium text-black mb-2">
                  Colors
                </label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => toggleColor(color)}
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition-colors ${
                        colorPalette.includes(color)
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                          : 'border-gray-300 text-black hover:border-gray-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Styles */}
              {filterOptions.styles.length > 0 && (
                <div className="mt-4">
                  <label className="block text-xs sm:text-sm font-medium text-black mb-2">
                    Styles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.styles.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStyle(s)}
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition-colors ${
                          style.includes(s)
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                            : 'border-gray-300 text-black hover:border-gray-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            {total} {total === 1 ? 'design' : 'designs'} found
            {query && <span className="font-medium"> for "{query}"</span>}
          </p>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-300 rounded-t-lg" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-300 rounded" />
                  <div className="h-3 bg-gray-300 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No designs found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters or search term</p>
            <button
              onClick={clearFilters}
              className="text-indigo-600 hover:text-indigo-800"
            >
              Clear all filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {designs.map((design) => (
              <Link
                key={design.id}
                href={`/designs/${design.id}`}
                className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square relative">
                  <Image
                    src={design.thumbnailUrl || design.imageUrl}
                    alt={design.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {design.trendingScore > 100 && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Trending
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 truncate text-sm">{design.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {design.designer.image && (
                      <Image
                        src={design.designer.image}
                        alt={design.designer.displayName || design.designer.name || ''}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-xs text-gray-500 truncate flex items-center gap-1">
                      {design.designer.displayName || design.designer.name}
                      {design.designer.isVerified && (
                        <BadgeCheck className="w-3 h-3 text-blue-500" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-indigo-600 font-semibold text-sm">
                      {formatPrice(design.price)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="w-3 h-3" />
                      {design._count.reviews}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {designs.map((design) => (
              <Link
                key={design.id}
                href={`/designs/${design.id}`}
                className="flex bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow gap-3"
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 relative flex-shrink-0">
                  <Image
                    src={design.thumbnailUrl || design.imageUrl}
                    alt={design.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm text-black line-clamp-1">{design.title}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {design.designer.image && (
                        <Image
                          src={design.designer.image}
                          alt=""
                          width={16}
                          height={16}
                          className="rounded-full flex-shrink-0"
                        />
                      )}
                      <span className="text-xs text-gray-600 line-clamp-1">
                        {design.designer.displayName || design.designer.name}
                      </span>
                      {design.designer.isVerified && (
                        <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-indigo-600">
                      {formatPrice(design.price)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {design.totalSales} sold
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      {design._count.reviews}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdvancedSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading advanced search...</p>
        </div>
      </div>
    }>
      <AdvancedSearchContent />
    </Suspense>
  )
}
