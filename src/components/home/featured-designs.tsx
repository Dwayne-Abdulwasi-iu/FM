'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
      // Fetch from admin featured items API for designs only
      const response = await fetch('/api/admin/featured-items?itemType=DESIGN&limit=6')
      if (response.ok) {
        const data = await response.json()
        // Map the API response to Design interface
        setDesigns(data.items?.map((item: any) => ({
          id: item.itemId,
          title: item.title,
          description: null,
          price: item.price || 0,
          imageUrl: item.imageUrl || '',
          category: item.category || 'Design',
          totalSales: 0,
          designer: {
            name: item.seller?.displayName || item.seller?.name,
            email: item.seller?.email || '',
            role: 'seller'
          }
        })) || [])
      } else {
        // Fallback to regular featured designs from old API
        const fallbackResponse = await fetch('/api/designs?featured=true&limit=6')
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          setDesigns(data.designs?.slice(0, 6) || [])
        }
      }
    } catch (error) {
      console.error('Error fetching featured designs:', error)
      // Fallback to old featured API
      try {
        const response = await fetch('/api/designs?featured=true&limit=6')
        if (response.ok) {
          const data = await response.json()
          setDesigns(data.designs?.slice(0, 6) || [])
        }
      } catch (err) {
        console.error('Error fetching fallback designs:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-5 sm:py-8 lg:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 text-center mb-1 sm:mb-2">Featured Designs</h2>
          <p className="text-[9px] sm:text-xs text-gray-700 text-center mb-3 sm:mb-4 lg:mb-6">Discover trending designs from our community</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-2 sm:p-3">
                  <div className="h-3 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded mb-1.5 w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-5 sm:py-8 lg:py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 text-center mb-1 sm:mb-2">Featured Designs</h2>
        <p className="text-[9px] sm:text-xs text-gray-700 text-center mb-3 sm:mb-4 lg:mb-6">Discover trending designs from our community</p>
        
        {designs.length === 0 ? (
          <div className="text-center py-4 sm:py-6">
            <div className="text-gray-500 mb-2">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-[9px] sm:text-xs font-medium text-gray-900 mb-0.5">No designs available yet</h3>
            <p className="text-[8px] sm:text-[9px] text-gray-600 mb-2 sm:mb-3">Be the first to upload and share your designs!</p>
            <Link href="/upload" className="inline-block bg-indigo-700 hover:bg-indigo-800 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors font-medium text-[8px] sm:text-xs">
              Upload Design
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {designs.map((design) => (
              <div key={design.id} className="bg-white rounded-lg shadow-md overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="aspect-square relative">
                  <Image
                    src={design.imageUrl}
                    alt={design.title}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-1.5 sm:p-2.5">
                  <h3 className="font-semibold text-[9px] sm:text-xs mb-0.5 text-gray-900 group-hover:text-indigo-700 line-clamp-1">
                    {design.title}
                  </h3>
                  <p className="text-[8px] sm:text-[9px] text-gray-600 mb-1 sm:mb-2">
                    by {design.designer.name || design.designer.email}
                  </p>
                  <div className="flex justify-between items-center gap-1">
                    <span className="text-xs sm:text-sm font-bold text-gray-900">${design.price.toFixed(2)}</span>
                    <Link 
                      href={`/designs/${design.id}`}
                      className="bg-indigo-700 hover:bg-indigo-800 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition-colors font-medium text-[8px] sm:text-xs whitespace-nowrap"
                    >
                      View
                    </Link>
                  </div>
                  <div className="mt-1 sm:mt-1.5 flex justify-between items-center">
                    <span className="inline-block px-1 sm:px-1.5 py-0.25 bg-indigo-100 text-indigo-800 text-[7px] sm:text-[8px] rounded font-medium">
                      {design.category}
                    </span>
                    {design.totalSales > 0 && (
                      <span className="text-[7px] sm:text-[8px] text-gray-500">
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
          <div className="text-center mt-4 sm:mt-6">
            <Link 
              href="/designs" 
              className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-indigo-700 text-indigo-700 hover:bg-indigo-700 hover:text-white rounded-lg transition-colors font-medium text-[8px] sm:text-xs"
            >
              View All Designs
              <svg className="w-2 h-2 sm:w-3 sm:h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}