'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  MapPin, 
  Globe, 
  Calendar, 
  Star, 
  Users, 
  ShoppingBag,
  BadgeCheck,
  Award,
  ExternalLink,
  Instagram,
  Twitter,
  MessageCircle,
  Settings,
  Grid,
  Heart
} from 'lucide-react'

interface Designer {
  id: string
  name: string | null
  displayName: string | null
  image: string | null
  coverImage: string | null
  bio: string | null
  website: string | null
  location: string | null
  specialties: string[]
  experience: string | null
  portfolioUrl: string | null
  socialLinks: {
    instagram?: string
    twitter?: string
    behance?: string
    dribbble?: string
  } | null
  isVerified: boolean
  verificationBadge: string | null
  verificationStatus: string
  createdAt: string
  profileViews: number
  totalSales: number
  avgRating: number
  isFollowing: boolean
  followersCount: number
  followingCount: number
  designsCount: number
  reviewsCount: number
  designs: {
    id: string
    title: string
    thumbnailUrl: string | null
    imageUrl: string
    price: number
    totalSales: number
  }[]
}

export default function DesignerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'designs' | 'about'>('designs')

  const isOwnProfile = session?.user?.id === params.id

  useEffect(() => {
    if (params.id) {
      fetchDesigner(params.id as string)
    }
  }, [params.id])

  const fetchDesigner = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${id}`)
      if (response.ok) {
        const data = await response.json()
        setDesigner(data.user)
      } else {
        router.push('/404')
      }
    } catch (error) {
      console.error('Failed to fetch designer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!designer) return

    setFollowLoading(true)
    try {
      const method = designer.isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/users/${designer.id}/follow`, { method })
      
      if (response.ok) {
        const data = await response.json()
        setDesigner(prev => prev ? {
          ...prev,
          isFollowing: data.isFollowing,
          followersCount: data.followersCount,
        } : null)
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getBadgeIcon = (badge: string | null) => {
    switch (badge) {
      case 'TOP_SELLER':
        return <Award className="w-5 h-5 text-yellow-500" />
      case 'VERIFIED_PRO':
        return <BadgeCheck className="w-5 h-5 text-blue-500" />
      case 'RISING_STAR':
        return <Star className="w-5 h-5 text-purple-500" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-300" />
          <div className="max-w-6xl mx-auto px-4 -mt-16">
            <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white" />
            <div className="mt-4 h-8 bg-gray-300 rounded w-48" />
            <div className="mt-2 h-4 bg-gray-300 rounded w-96" />
          </div>
        </div>
      </div>
    )
  }

  if (!designer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Designer not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-indigo-600 to-purple-700">
        {designer.coverImage && (
          <Image
            src={designer.coverImage}
            alt="Cover"
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Profile Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                {designer.image ? (
                  <Image
                    src={designer.image}
                    alt={designer.displayName || designer.name || 'Designer'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {(designer.displayName || designer.name || 'D')[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {designer.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow">
                  <BadgeCheck className="w-6 h-6 text-blue-500" />
                </div>
              )}
            </div>

            {/* Name & Actions */}
            <div className="mt-4 sm:mt-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {designer.displayName || designer.name || 'Anonymous Designer'}
                    </h1>
                    {getBadgeIcon(designer.verificationBadge)}
                  </div>
                  {designer.location && (
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {designer.location}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 sm:mt-0 flex gap-3">
                  {isOwnProfile ? (
                    <Link
                      href="/profile/edit"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      Edit Profile
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                          designer.isFollowing
                            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        {followLoading ? 'Loading...' : designer.isFollowing ? 'Following' : 'Follow'}
                      </button>
                      {/* Message button - Admin only */}
                      {session?.user?.role === 'ADMIN' && (
                        <Link 
                          href={`/admin/commission-requests?designerId=${designer.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-900"
                        >
                          <MessageCircle className="w-4 h-4" />
                          View Requests
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-900">{designer.designsCount}</span>
              <span className="text-gray-600">Designs</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-900">{designer.followersCount}</span>
              <span className="text-gray-600">Followers</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-900">{designer.followingCount}</span>
              <span className="text-gray-600">Following</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-900">{designer.totalSales}</span>
              <span className="text-gray-600">Sales</span>
            </div>
            {designer.avgRating > 0 && (
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-semibold text-gray-900">{designer.avgRating.toFixed(1)}</span>
                <span className="text-gray-600">({designer.reviewsCount} reviews)</span>
              </div>
            )}
          </div>

          {/* Bio */}
          {designer.bio && (
            <p className="mt-4 text-gray-600 max-w-2xl">{designer.bio}</p>
          )}

          {/* Social Links */}
          <div className="mt-4 flex flex-wrap gap-3">
            {designer.website && (
              <a
                href={designer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
            {designer.socialLinks?.instagram && (
              <a
                href={designer.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-pink-600"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </a>
            )}
            {designer.socialLinks?.twitter && (
              <a
                href={designer.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-400"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </a>
            )}
            {designer.portfolioUrl && (
              <a
                href={designer.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
              >
                <ExternalLink className="w-4 h-4" />
                Portfolio
              </a>
            )}
          </div>

          {/* Specialties */}
          {designer.specialties && designer.specialties.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {designer.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('designs')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'designs'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="w-4 h-4 inline-block mr-2" />
              Designs
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'about'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              About
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {activeTab === 'designs' && (
            <div>
              {designer.designs.length === 0 ? (
                <div className="text-center py-12">
                  <Grid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No designs yet</p>
                  {isOwnProfile && (
                    <Link
                      href="/upload"
                      className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Upload Your First Design
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {designer.designs.map((design) => (
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
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-gray-900 truncate text-sm">
                            {design.title}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {formatPrice(design.price)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {design.totalSales} sold
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {designer.designsCount > 6 && (
                    <div className="mt-8 text-center">
                      <Link
                        href={`/designs?userId=${designer.id}`}
                        className="inline-flex items-center gap-2 px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50"
                      >
                        View All Designs
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-2xl">
              <div className="space-y-6">
                {designer.experience && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Experience</h3>
                    <p className="text-gray-600">{designer.experience}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Member Since</h3>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(designer.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {designer.profileViews > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Profile Views</h3>
                    <p className="text-gray-600">{designer.profileViews.toLocaleString()} views</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
