'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SafeImage from '@/components/ui/safe-image'

interface Design {
  id: string
  title: string
  description: string | null
  price: number
  imageUrl: string
  category: string
  totalSales: number
  designer: {
    name: string | null
    email: string
    role: string
  }
}

export function FeaturedDesigns() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedDesigns()
  }, [])

  const fetchFeaturedDesigns = async () => {
    try {
      const response = await fetch('/api/designs?featured=true&userOnly=true')
      if (response.ok) {
        const data = await response.json()
        setDesigns(data.designs.slice(0, 6)) // Show only 6 featured designs
      }
    } catch (error) {
      console.error('Error fetching featured designs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Image sanitization is handled by SafeImage

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Featured Designs</h2>
          <p className="text-gray-700 text-center mb-12">Discover trending and popular fashion designs from our community</p>
          <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 xs:gap-5 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-4 xs:p-5 md:p-6">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Featured Designs</h2>
        <p className="text-gray-700 text-center mb-12">Discover trending and popular fashion designs from our community</p>
        
        {designs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No designs available yet</h3>
            <p className="text-gray-600 mb-6">Be the first to upload and share your fashion designs!</p>
            <Link href="/upload" className="bg-indigo-700 hover:bg-indigo-800 text-white px-6 py-3 rounded-lg transition-colors font-medium">
              Upload Your Design
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 xs:gap-5 md:gap-6">
            {designs.map((design) => (
              <div key={design.id} className="bg-white rounded-lg shadow-md overflow-hidden group hover:shadow-xl transition-shadow">
                <div className="aspect-square relative">
                  <SafeImage
                    src={design.imageUrl}
                    alt={design.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 xs:p-5 md:p-6">
                  <h3 className="font-semibold text-base xs:text-lg mb-2 text-gray-900 group-hover:text-indigo-700 line-clamp-1">
                    {design.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    by {design.designer.name || design.designer.email}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xl xs:text-2xl font-bold text-gray-900">${design.price.toFixed(2)}</span>
                    <Link 
                      href={`/designs/${design.id}`}
                      className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-medium">
                      {design.category}
                    </span>
                    {design.totalSales > 0 && (
                      <span className="text-xs text-gray-500">
                        {design.totalSales} sale{design.totalSales > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {designs.length > 0 && (
          <div className="text-center mt-12">
            <Link 
              href="/designs" 
              className="inline-flex items-center px-6 py-3 border border-indigo-700 text-indigo-700 hover:bg-indigo-700 hover:text-white rounded-lg transition-colors font-medium"
            >
              View All Designs
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}