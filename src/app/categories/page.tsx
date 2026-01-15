"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Grid3X3, List, Search, Filter, TrendingUp } from 'lucide-react'

interface CategoryData {
  name: string
  count: number
  description: string
  icon: string
  color: string;
}

interface CategoryInfo {
  [key: string]: {
    description: string;
    icon: string;
    color: string;
  };
}
export default function CategoriesPage() {
  const router = useRouter()
  const [categories, _setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'count'>('name')

    const _categoryInfo: CategoryInfo = React.useMemo(() => ({
      'Fashion Illustrations': {
        description: 'Hand-drawn and digital fashion sketches, croquis, and artistic illustrations',
        icon: '🎨',
        color: 'from-pink-500 to-rose-500'
      },
      'Pattern Designs': {
        description: 'Repeating patterns, textile designs, and surface patterns for fashion',
        icon: '🔲',
        color: 'from-purple-500 to-indigo-500'
      },
      'Digital Designs': {
        description: 'Computer-generated fashion designs, CAD patterns, and digital artwork',
        icon: '💻',
        color: 'from-blue-500 to-cyan-500'
      },
      'Sketches': {
        description: 'Quick fashion sketches, concept drawings, and design development work',
        icon: '✏️',
        color: 'from-green-500 to-emerald-500'
      },
      'Technical Drawings': {
        description: 'Flat drawings, spec sheets, and technical fashion illustrations',
        icon: '📐',
        color: 'from-orange-500 to-red-500'
      },
      'Embroidery Designs': {
        description: 'Embroidery patterns, digitized designs, and decorative motifs',
        icon: '🧵',
        color: 'from-yellow-500 to-orange-500'
      },
      'Print Designs': {
        description: 'Textile prints, fabric designs, and surface pattern collections',
        icon: '🖨️',
        color: 'from-teal-500 to-green-500'
      },
      'Color Palettes': {
        description: 'Fashion color schemes, seasonal palettes, and color trend forecasts',
        icon: '🎨',
        color: 'from-indigo-500 to-purple-500'
      }
    }), [])

  const fetchCategories = React.useCallback(async () => {
    try {
      setLoading(true)
      // Fetch counts for known categories
      // ...existing code...
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const filteredCategories = categories
    .filter((category: CategoryData) => 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a: CategoryData, b: CategoryData) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else {
        return b.count - a.count
      }
    })

  const handleCategoryClick = (categoryName: string) => {
    router.push(`/designs?category=${encodeURIComponent(categoryName)}`)
  }

  const totalDesigns = categories.reduce((sum: number, cat: CategoryData) => sum + cat.count, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-2 sm:mb-3 text-xs sm:text-sm"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Back to Home
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Design Categories</h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Explore {categories.length} categories with {totalDesigns} total designs
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Switch to grid view"
                className={`p-1 sm:p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                aria-label="Switch to list view"
                className={`p-1 sm:p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 sm:pl-10 pr-3 sm:pr-4 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs sm:text-sm text-gray-900 bg-white placeholder-gray-500"
              />
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'count')}
                title="Sort categories"
                aria-label="Sort categories by name or count"
                className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs sm:text-sm text-gray-900 bg-white"
              >
                <option value="name">Name</option>
                <option value="count">Count</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className={`grid gap-2 sm:gap-3 md:gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
                <div className="aspect-video bg-gray-300 rounded-t-lg" />
                <div className="p-2 sm:p-3 space-y-1 sm:space-y-1.5">
                  <div className="h-3 bg-gray-300 rounded" />
                  <div className="h-2 bg-gray-300 rounded w-2/3" />
                  <div className="h-3 bg-gray-300 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Categories Grid/List */}
            <div className={`grid gap-2 sm:gap-3 md:gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                : 'grid-cols-1 max-w-4xl'
            }`}>
              {filteredCategories.map((category) => (
                <div
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${
                    viewMode === 'list' ? 'flex items-center p-3 sm:p-4' : 'overflow-hidden'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      {/* Grid View */}
                      <div className={`h-24 sm:h-28 bg-gradient-to-br ${category.color} relative`}>
                        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-200" />
                        <div className="absolute top-2 left-2">
                          <span className="text-xl sm:text-2xl">{category.icon}</span>
                        </div>
                        <div className="absolute bottom-1.5 right-1.5">
                          <div className="bg-white bg-opacity-90 rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-xs font-medium text-gray-900">
                            {category.count}
                          </div>
                        </div>
                      </div>
                      <div className="p-2 sm:p-3">
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors text-xs sm:text-sm">
                          {category.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2">
                          {category.description}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] sm:text-xs text-gray-500">
                            {category.count === 0 ? 'None' : category.count}
                          </span>
                          <div className="flex items-center text-indigo-600 text-[9px] sm:text-xs font-medium">
                            <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-0.5 rotate-180 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* List View */}
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0`}>
                        <span className="text-lg sm:text-2xl">{category.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-0.5 group-hover:text-indigo-700 transition-colors text-xs sm:text-sm">
                          {category.name}
                        </h3>
                        <p className="text-gray-600 text-[10px] sm:text-xs mb-1">
                          {category.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] sm:text-xs text-gray-500">
                            {category.count === 0 ? 'None' : category.count}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center text-indigo-600 ml-2 sm:ml-4">
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredCategories.length === 0 && !loading && (
              <div className="text-center py-8 sm:py-12">
                <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-2 sm:mb-4" />
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">No categories found</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                  Try adjusting your search or browse all categories
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSortBy('name')
                  }}
                  className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors text-xs sm:text-sm"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        )}

        {/* Category Stats */}
        {!loading && categories.length > 0 && (
          <div className="mt-8 sm:mt-12 bg-white rounded-lg shadow-sm p-3 sm:p-4">
            <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="text-center p-2 sm:p-3">
                <div className="text-lg sm:text-2xl font-bold text-indigo-600">{categories.length}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5">Categories</div>
              </div>
              <div className="text-center p-2 sm:p-3">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{totalDesigns}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5">Designs</div>
              </div>
              <div className="text-center p-2 sm:p-3">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">
                  {Math.round(totalDesigns / categories.length) || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5">Avg</div>
              </div>
              <div className="text-center p-2 sm:p-3">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">
                  {categories.filter(c => c.count > 0).length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5">Active</div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-8 sm:mt-12 text-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 sm:p-6">
          <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-indigo-600 mx-auto mb-2 sm:mb-4" />
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Don't see your category?</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 max-w-2xl mx-auto">
            Upload your designs and help us grow new categories.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
            <Link 
              href="/upload"
              className="inline-flex items-center px-4 sm:px-6 py-1.5 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors text-xs sm:text-sm"
            >
              <TrendingUp className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              Upload Design
            </Link>
            <Link 
              href="/designs"
              className="inline-flex items-center px-4 sm:px-6 py-1.5 sm:py-3 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-xs sm:text-sm"
            >
              Browse All
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
