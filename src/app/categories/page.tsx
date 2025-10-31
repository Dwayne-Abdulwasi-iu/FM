"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Grid3X3, List, Search, Filter, TrendingUp } from 'lucide-react'

interface CategoryData {
  name: string
  count: number
  description: string
  icon: string
  color: string

interface CategoryInfo {
  [key: string]: {
    description: string;
    icon: string;
    color: string;
  };
}
export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'count'>('name')

    const categoryInfo: CategoryInfo = React.useMemo(() => ({
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Design Categories</h1>
              <p className="text-gray-600">
                Explore {categories.length} categories with {totalDesigns} total designs
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Switch to grid view"
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                aria-label="Switch to list view"
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'count')}
                title="Sort categories"
                aria-label="Sort categories by name or count"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
              >
                <option value="name">Sort by Name</option>
                <option value="count">Sort by Count</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
                <div className="aspect-video bg-gray-300 rounded-t-lg" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-300 rounded" />
                  <div className="h-3 bg-gray-300 rounded w-2/3" />
                  <div className="h-4 bg-gray-300 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Categories Grid/List */}
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1 max-w-4xl'
            }`}>
              {filteredCategories.map((category) => (
                <div
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${
                    viewMode === 'list' ? 'flex items-center p-6' : 'overflow-hidden'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      {/* Grid View */}
                      <div className={`h-32 bg-gradient-to-br ${category.color} relative`}>
                        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-200" />
                        <div className="absolute top-4 left-4">
                          <span className="text-3xl">{category.icon}</span>
                        </div>
                        <div className="absolute bottom-4 right-4">
                          <div className="bg-white bg-opacity-90 rounded-full px-3 py-1 text-sm font-medium text-gray-900">
                            {category.count} designs
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {category.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {category.count === 0 ? 'No designs yet' : 
                             category.count === 1 ? '1 design' : 
                             `${category.count} designs`}
                          </span>
                          <div className="flex items-center text-indigo-600 text-sm font-medium">
                            Explore
                            <ArrowLeft className="h-4 w-4 ml-1 rotate-180 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* List View */}
                      <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mr-4 flex-shrink-0`}>
                        <span className="text-2xl">{category.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2">
                          {category.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {category.count === 0 ? 'No designs yet' : 
                             category.count === 1 ? '1 design' : 
                             `${category.count} designs`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center text-indigo-600 ml-4">
                        <ArrowLeft className="h-5 w-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredCategories.length === 0 && !loading && (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No categories found</h2>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or browse all categories
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSortBy('name')
                  }}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        )}

        {/* Category Stats */}
        {!loading && categories.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{categories.length}</div>
                <div className="text-sm text-gray-600">Total Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalDesigns}</div>
                <div className="text-sm text-gray-600">Total Designs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(totalDesigns / categories.length) || 0}
                </div>
                <div className="text-sm text-gray-600">Avg per Category</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {categories.filter(c => c.count > 0).length}
                </div>
                <div className="text-sm text-gray-600">Active Categories</div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 text-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-8">
          <TrendingUp className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Don't see your category?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Upload your designs and help us grow new categories. Our platform supports all types of fashion and design content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/upload"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Upload Design
            </Link>
            <Link 
              href="/designs"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Browse All Designs
            </Link>
          </div>
        </div>
      </div>
    </div>
  }
