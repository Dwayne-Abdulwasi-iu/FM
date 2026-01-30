'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Star, Shield, TrendingUp } from 'lucide-react'

interface SellerBadge {
  id: string
  name: string
  email: string
  image: string | null
  isVerified: boolean
  verificationBadge: string | null
  totalSales: number
  avgRating: number
}

export default function AdminSellerBadgesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sellers, setSellers] = useState<SellerBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [badgeFilter, setBadgeFilter] = useState<string>('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
      return
    }
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchSellers()
  }, [session, status, badgeFilter])

  const fetchSellers = async () => {
    try {
      setLoading(true)
      let url = '/api/admin/seller-badges'
      if (badgeFilter) {
        url += `?badge=${badgeFilter}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch sellers')
      const data = await res.json()
      setSellers(data.sellers || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load sellers')
    } finally {
      setLoading(false)
    }
  }

  const handleBadgeChange = async (sellerId: string, badge: string | null) => {
    try {
      const res = await fetch(`/api/admin/seller-badges/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationBadge: badge })
      })
      if (!res.ok) throw new Error('Failed to update badge')
      toast.success('Seller badge updated')
      fetchSellers()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update badge')
    }
  }

  const getBadgeColor = (badge: string | null) => {
    switch (badge) {
      case 'VERIFIED_SELLER':
        return 'bg-blue-100 text-blue-900 border-blue-300'
      case 'TOP_SELLER':
        return 'bg-purple-100 text-purple-900 border-purple-300'
      case 'BESTSELLER':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300'
      case 'TRENDING':
        return 'bg-pink-100 text-pink-900 border-pink-300'
      default:
        return 'bg-gray-100 text-gray-900 border-gray-300'
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Seller Badges</h1>
            </div>
            <p className="text-sm text-gray-600">Manage seller verification and achievement badges</p>
          </div>

          {/* Filter */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <select
              value={badgeFilter}
              onChange={(e) => setBadgeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="">All Sellers</option>
              <option value="VERIFIED_SELLER">Verified Sellers</option>
              <option value="TOP_SELLER">Top Sellers</option>
              <option value="BESTSELLER">Bestsellers</option>
              <option value="TRENDING">Trending</option>
            </select>
          </div>

          {/* Sellers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
            {sellers.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No sellers found</p>
              </div>
            ) : (
              sellers.map((seller) => (
                <div key={seller.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex items-start gap-3 mb-3">
                    {seller.image ? (
                      <img
                        src={seller.image}
                        alt={seller.name || 'Seller'}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                        {(seller.name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{seller.name}</p>
                      <p className="text-xs text-gray-500 truncate">{seller.email}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">Sales</p>
                      <p className="text-sm font-semibold text-gray-900">{seller.totalSales}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <p className="text-sm font-semibold text-gray-900">{seller.avgRating.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Badge Selector */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Badge</p>
                    <select
                      value={seller.verificationBadge || ''}
                      onChange={(e) => handleBadgeChange(seller.id, e.target.value || null)}
                      className={`w-full px-2 py-1 text-xs rounded border ${getBadgeColor(seller.verificationBadge)}`}
                    >
                      <option value="">None</option>
                      <option value="VERIFIED_SELLER">Verified Seller</option>
                      <option value="TOP_SELLER">Top Seller</option>
                      <option value="BESTSELLER">Bestseller</option>
                      <option value="TRENDING">Trending</option>
                    </select>
                  </div>

                  {/* Current Badge Display */}
                  {seller.verificationBadge && (
                    <div className="mt-3 pt-3 border-t">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getBadgeColor(seller.verificationBadge)}`}>
                        {seller.verificationBadge.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
