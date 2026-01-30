'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heart, ShoppingCart, ArrowLeft, CheckCircle, X, Shield, MessageCircle, Star } from 'lucide-react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import DesignerBadge from '@/components/DesignerBadge'
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { useCurrency } from '@/components/CurrencyProvider'
import SimilarDesigns from '@/components/SimilarDesigns'
import { ShareButton } from '@/components/social/SocialShare'
import { usePriceTest, trackVariantView } from '@/lib/price-test'


interface MediaFile {
  id: string
  fileName: string
  fileUrl: string
  fileType: 'IMAGE' | 'VIDEO'
  mimeType: string
  fileSize: number
  duration: number | null
  accessType: 'FREE' | 'PREMIUM'
  sortOrder: number
}

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  isVerifiedPurchase?: boolean
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface Design {
  id: string
  title: string
  description: string | null
  price: number
  imageUrl: string
  thumbnailUrl: string | null
  category: string
  tags: string | null
  createdAt: string
  avgRating?: number
  // A/B Price Testing fields
  priceTestActive?: boolean
  priceTestVariant?: number | null
  priceTestEndsAt?: string | null
  designer: {
    id: string
    name: string | null
    bio: string | null
    image: string | null
    designerTier?: string | null
    role?: string
    // Commission settings
    acceptsCommissions?: boolean
    commissionStatus?: string
    commissionMinBudget?: number | null
    commissionMaxBudget?: number | null
    commissionTurnaround?: string | null
    commissionTypes?: string[]
  }
  totalSales: number
  totalRevenue: number
  mediaFiles: MediaFile[]
  reviews?: Review[]
  _count?: {
    reviews: number
    favorites: number
  }
}

export default function DesignPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [design, setDesign] = useState<Design | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [hasAccess, setHasAccess] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [togglingWishlist, setTogglingWishlist] = useState(false)
  const [buyingNow, setBuyingNow] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  
  // POD State
  const [podProducts, setPodProducts] = useState<Array<{
    id: string;
    productId: string;
    productName: string;
    provider: string;
    markup: number;
    estimatedPrice: number;
  }>>([])
  const [hasPOD, setHasPOD] = useState(false)
  const [selectedPODProduct, setSelectedPODProduct] = useState<string | null>(null)
  const [addingPODToCart, setAddingPODToCart] = useState(false)
  const [showPODSection, setShowPODSection] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  
  // A/B Price Testing - get the price to show this user
  const priceTest = usePriceTest(
    {
      designId: design?.id || '',
      originalPrice: design?.price || 0,
      variantPrice: design?.priceTestVariant,
      isTestActive: design?.priceTestActive,
    },
    session?.user?.id
  )
  
  // Track view when user sees the design with a price test
  useEffect(() => {
    if (design?.priceTestActive && priceTest.isTestActive) {
      trackVariantView(design.id, priceTest.variant)
    }
  }, [design?.id, design?.priceTestActive, priceTest.isTestActive, priceTest.variant])

  // Check if admin is viewing this page via ?admin=true
  const isAdminViewing = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === 'true' && session?.user?.role === 'ADMIN'

  // Redirect non-admin users who try to access admin mode
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === 'true' && session && session.user?.role !== 'ADMIN') {
      // Remove the admin parameter and redirect
      params.delete('admin')
      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname
      router.replace(newUrl)
    }
  }, [session, router])

  useEffect(() => {
    if (params.id) {
      fetchDesign(params.id as string)
      checkAccess(params.id as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Separate useEffect for wishlist - re-runs when session loads
  useEffect(() => {
    if (params.id && session?.user) {
      const checkWishlistStatus = async () => {
        try {
          const response = await fetch(`/api/wishlist?designId=${params.id}`)
          if (response.ok) {
            const data = await response.json()
            setIsWishlisted(data.isWishlisted || false)
          }
        } catch (error) {
          console.error('Failed to check wishlist:', error)
        }
      }
      checkWishlistStatus()
      
      // Check if user can review (has purchased and hasn't reviewed yet)
      const checkReviewEligibility = async () => {
        try {
          const response = await fetch(`/api/designs/${params.id}/reviews/eligibility`)
          if (response.ok) {
            const data = await response.json()
            setCanReview(data.canReview || false)
            setHasReviewed(data.hasReviewed || false)
          }
        } catch (error) {
          console.error('Failed to check review eligibility:', error)
        }
      }
      checkReviewEligibility()
    } else {
      setIsWishlisted(false)
      setCanReview(false)
    }
  }, [params.id, session?.user])

  const toggleWishlist = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!design) return

    setTogglingWishlist(true)
    try {
      const response = await fetch('/api/wishlist', {
        method: isWishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: design.id }),
      })

      if (response.ok) {
        setIsWishlisted(!isWishlisted)
        setSuccessMessage(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist!')
        setTimeout(() => setSuccessMessage(null), 2000)
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error)
      setErrorMessage('Failed to update wishlist')
      setTimeout(() => setErrorMessage(null), 2000)
    } finally {
      setTogglingWishlist(false)
    }
  }

  const checkAccess = async (designId: string) => {
    if (!session) return
    
    try {
      const response = await fetch(`/api/designs/${designId}/access`)
      if (response.ok) {
        const data = await response.json()
        setHasAccess(data.hasAccess)
      }
    } catch (error) {
      console.error('Failed to check access:', error)
    }
  }

  const fetchDesign = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/designs/${id}`)
      if (response.ok) {
        const data = await response.json()
        setDesign(data.design)
        
        // Only fetch POD products for Digital Designs category
        if (data.design?.category === 'Digital Designs') {
          fetchPODProducts(id)
        }
      } else {
        console.error('Design not found')
      }
    } catch (error) {
      console.error('Failed to fetch design:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPODProducts = async (designId: string) => {
    try {
      const response = await fetch(`/api/designs/${designId}/pod-products`)
      if (response.ok) {
        const data = await response.json()
        setHasPOD(data.hasPOD)
        setPodProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch POD products:', error)
    }
  }

  const handleAddPODToCart = async (productId: string) => {
    if (!session) {
      router.push('/api/auth/signin')
      return
    }

    setAddingPODToCart(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    
    try {
      const product = podProducts.find(p => p.productId === productId)
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designId: design?.id,
          quantity: 1,
          purchaseType: 'POD',
          podProductId: productId,
          podProductName: product?.productName,
          podProvider: product?.provider,
          price: product?.estimatedPrice
        })
      })

      if (response.ok) {
        setSuccessMessage(`${product?.productName} added to cart!`)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const error = await response.json()
        setErrorMessage(`Failed to add to cart: ${error.message}`)
      }
    } catch (error) {
      console.error('Add POD to cart error:', error)
      setErrorMessage('Failed to add to cart')
    } finally {
      setAddingPODToCart(false)
    }
  }

  const handleAddToCart = async () => {
    if (!session) {
      router.push('/api/auth/signin')
      return
    }

    setAddingToCart(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designId: design?.id,
          quantity: 1,
          // Include A/B test variant if active
          ...(priceTest.isTestActive && {
            variant: priceTest.variant,
            testPrice: priceTest.price,
          }),
        })
      })

      if (response.ok) {
        setSuccessMessage('Added to cart successfully!')
        // Auto-clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const error = await response.json()
        setErrorMessage(`Failed to add to cart: ${error.message}`)
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      setErrorMessage('Failed to add to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    if (!session) {
      router.push('/api/auth/signin')
      return
    }

    setBuyingNow(true)
    setErrorMessage(null)
    
    try {
      // First add to cart
      const cartResponse = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designId: design?.id,
          quantity: 1,
          // Include A/B test variant if active
          ...(priceTest.isTestActive && {
            variant: priceTest.variant,
            testPrice: priceTest.price,
          }),
        })
      })

      if (cartResponse.ok) {
        // Then redirect to cart for checkout
        router.push('/cart')
      } else {
        const error = await cartResponse.json()
        setErrorMessage(`Failed to process: ${error.message}`)
      }
    } catch (error) {
      console.error('Buy now error:', error)
      setErrorMessage('Failed to process purchase')
    } finally {
      setBuyingNow(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!session || !design) return
    
    setSubmittingReview(true)
    setErrorMessage(null)
    
    try {
      const response = await fetch(`/api/designs/${design.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || null
        })
      })

      if (response.ok) {
        setSuccessMessage('Review submitted successfully!')
        setShowReviewForm(false)
        setHasReviewed(true)
        setCanReview(false)
        setReviewComment('')
        setReviewRating(5)
        // Refresh design to show new review
        fetchDesign(design.id)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const error = await response.json()
        setErrorMessage(`Failed to submit review: ${error.message}`)
      }
    } catch (error) {
      console.error('Submit review error:', error)
      setErrorMessage('Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const { formatPrice } = useCurrency()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTags = (tags: string | string[] | null) => {
    if (!tags) return []
    // Handle both string (comma-separated) and array formats
    if (Array.isArray(tags)) {
      return tags.map(tag => tag.trim()).filter(Boolean)
    }
    if (typeof tags === 'string') {
      return tags.split(',').map(tag => tag.trim()).filter(Boolean)
    }
    return []
  }

  const getAccessibleMediaFiles = () => {
    if (!design?.mediaFiles) return []
    
    // Admin viewing mode grants full access for moderation
    if (isAdminViewing || hasAccess || design.designer.id === session?.user?.id) {
      // User has access, is admin, or is the designer - show all files
      return design.mediaFiles.sort((a, b) => a.sortOrder - b.sortOrder)
    } else {
      // Only show free files - premium files are completely hidden
      return design.mediaFiles
        .filter(file => file.accessType === 'FREE')
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }
  }

  const getLockedPremiumFiles = () => {
    if (!design?.mediaFiles || isAdminViewing || hasAccess || design.designer.id === session?.user?.id) {
      return []
    }
    return design.mediaFiles
      .filter(file => file.accessType === 'PREMIUM')
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!design) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Design Not Found</h1>
          <button 
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-800"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO: JSON-LD Structured Data */}
      <ProductJsonLd
        name={design.title}
        description={design.description || `Fashion design by ${design.designer.name}`}
        image={design.imageUrl}
        price={design.price}
        currency="USD"
        url={typeof window !== 'undefined' ? window.location.href : ''}
        seller={{
          name: design.designer.name || 'Designer',
        }}
        rating={design._count?.reviews ? {
          value: design.avgRating || 0,
          count: design._count.reviews,
        } : undefined}
        category={design.category}
        sku={design.id}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: typeof window !== 'undefined' ? window.location.origin : '' },
          { name: 'Designs', url: typeof window !== 'undefined' ? `${window.location.origin}/categories` : '' },
          { name: design.category, url: typeof window !== 'undefined' ? `${window.location.origin}/categories/${design.category.toLowerCase()}` : '' },
          { name: design.title, url: typeof window !== 'undefined' ? window.location.href : '' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-2 sm:mb-3 text-xs sm:text-sm"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Back
        </button>

        {/* Admin Viewing Banner */}
        {isAdminViewing && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2 sm:gap-3">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-red-800 font-medium text-xs sm:text-sm">Admin Moderation Mode</span>
                <p className="text-red-600 text-[10px] sm:text-xs mt-0.5">
                  You are viewing this design with full admin privileges. All premium content is accessible for moderation purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 font-medium text-xs sm:text-sm">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 ml-2"
              aria-label="Close success message"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
              <span className="text-red-800 font-medium text-xs sm:text-sm">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800 ml-2"
              aria-label="Close error message"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Media Gallery */}
          <div className="space-y-2 sm:space-y-3">
            {/* Main Media Display */}
            <div className="aspect-square bg-white rounded-lg shadow-sm overflow-hidden">
              {(() => {
                const accessibleFiles = getAccessibleMediaFiles()
                const lockedFiles = getLockedPremiumFiles()
                const selectedFile = accessibleFiles[selectedMediaIndex]
                
                if (!selectedFile && accessibleFiles.length === 0 && lockedFiles.length > 0) {
                  // Only premium content available, show lock screen
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
                      <div className="text-center p-8">
                        <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <span className="text-purple-600 text-3xl">🔒</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Content</h3>
                        <p className="text-gray-600 mb-4">This design contains {lockedFiles.length} premium file{lockedFiles.length > 1 ? 's' : ''}</p>
                        <p className="text-sm text-gray-500">Purchase to unlock all content</p>
                      </div>
                    </div>
                  )
                }
                
                if (!selectedFile) {
                  // Show placeholder if no accessible media
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <span className="text-gray-400 text-xl">🎨</span>
                        </div>
                        <p className="text-gray-500">No preview available</p>
                      </div>
                    </div>
                  )
                }

                if (selectedFile.fileType === 'VIDEO') {
                  return (
                    <video 
                      controls
                      className="w-full h-full object-cover"
                      poster={design.thumbnailUrl || undefined}
                    >
                      <source src={selectedFile.fileUrl} type={selectedFile.mimeType} />
                      Your browser does not support the video tag.
                    </video>
                  )
                } else {
                  return (
                    <Image
                      src={selectedFile.fileUrl}
                      alt={selectedFile.fileName}
                      width={800}
                      height={600}
                      className="w-full h-full object-cover cursor-zoom-in"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = `data:image/svg+xml;charset=UTF-8,%3Csvg width='800' height='600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='800' height='600' fill='%23f3f4f6'/%3E%3Ctext x='400' y='300' text-anchor='middle' font-family='Arial' font-size='24' fill='%236b7280'%3E${selectedFile.fileName}%3C/text%3E%3C/svg%3E`
                      }}
                    />
                  )
                }
              })()}
            </div>

            {/* Media Thumbnails */}
            {(() => {
              const accessibleFiles = getAccessibleMediaFiles()
              const lockedFiles = getLockedPremiumFiles()
              const totalFiles = accessibleFiles.length + lockedFiles.length
              
              if (totalFiles > 1) {
                return (
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {/* Accessible Files */}
                    {accessibleFiles.map((file, index) => {
                      const isSelected = accessibleFiles[selectedMediaIndex]?.id === file.id
                      
                      return (
                        <div
                          key={file.id}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedMediaIndex(index)}
                        >
                          {file.fileType === 'VIDEO' ? (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                              <div className="text-white text-xs font-medium">
                                {file.duration ? formatDuration(file.duration) : 'VIDEO'}
                              </div>
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                <div className="w-6 h-6 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                                  <div className="w-0 h-0 border-l-[6px] border-l-gray-700 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ml-1"></div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Image
                              src={file.fileUrl}
                              alt={file.fileName}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = `data:image/svg+xml;charset=UTF-8,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='100' y='100' text-anchor='middle' font-family='Arial' font-size='12' fill='%236b7280'%3EIMG%3C/text%3E%3C/svg%3E`
                              }}
                            />
                          )}
                          
                          <div className="absolute top-1 right-1">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Locked Premium Files */}
                    {lockedFiles.map((file) => (
                      <div
                        key={`locked-${file.id}`}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
                      >
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
                          <div className="text-center">
                            <div className="text-purple-600 text-lg mb-1">🔒</div>
                            <div className="text-xs text-purple-800 font-medium">
                              {file.fileType === 'VIDEO' ? 'VIDEO' : 'IMAGE'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center">
                          <div className="text-purple-900 text-xs font-bold">PREMIUM</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            })()}

            {/* Media Info */}
            {(() => {
              const accessibleFiles = getAccessibleMediaFiles()
              const selectedFile = accessibleFiles[selectedMediaIndex]
              
              if (selectedFile) {
                return (
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{selectedFile.fileName}</h4>
                        <p className="text-sm text-gray-500">
                          {selectedFile.fileType} • {formatFileSize(selectedFile.fileSize)}
                          {selectedFile.duration && ` • ${formatDuration(selectedFile.duration)}`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedFile.accessType === 'FREE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedFile.accessType}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            })()}
          </div>

          {/* Details */}
          <div className="space-y-2 sm:space-y-3">
            <div>
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-0.5">{design.title}</h1>
              <p className="text-base sm:text-lg font-bold text-indigo-600">
                {formatPrice(priceTest.price)}
                {priceTest.isTestActive && priceTest.variant === 'B' && priceTest.price !== design.price && (
                  <span className="ml-2 text-sm text-gray-400 line-through">{formatPrice(design.price)}</span>
                )}
              </p>
            </div>

            {/* Designer Info */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                {design.designer.image ? (
                  <Image src={design.designer.image} alt={design.designer.name || ''} width={48} height={48} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
                ) : (
                  <span className="text-gray-500 font-semibold text-xs sm:text-sm">
                    {(design.designer.name || 'A')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{design.designer.name || 'Anonymous'}</h3>
                  <DesignerBadge tier={design.designer.designerTier} size="sm" />
                </div>
                {design.designer.bio && (
                  <p className="text-[10px] sm:text-xs text-gray-600 truncate">{design.designer.bio}</p>
                )}
              </div>
            </div>

            {/* Description */}
            {design.description && (
              <div className="p-2 sm:p-3 bg-white rounded-lg shadow-sm">
                <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1">Description</h3>
                <p className="text-gray-700 text-xs sm:text-sm whitespace-pre-wrap">{design.description}</p>
              </div>
            )}

            {/* Tags */}
            {design.tags && (
              <div>
                <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1">Tags</h3>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {getTags(design.tags).map((tag, index) => (
                    <span 
                      key={index}
                      className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] sm:text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Category and Stats */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 bg-white rounded shadow-sm">
                <h3 className="font-semibold text-gray-900 text-[10px] mb-0.5">Category</h3>
                <p className="text-gray-700 text-[11px] sm:text-xs">{design.category}</p>
              </div>
              <div className="p-1.5 sm:p-2 bg-white rounded shadow-sm">
                <h3 className="font-semibold text-gray-900 text-[10px] mb-0.5">Sales</h3>
                <p className="text-gray-700 text-[11px] sm:text-xs">{design.totalSales}</p>
              </div>
            </div>

            {/* Media Files Info */}
            {design.mediaFiles && design.mediaFiles.length > 0 && (
              <div className="p-2 sm:p-3 bg-white rounded shadow-sm">
                <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-2">Included Media</h3>
                <div className="grid grid-cols-1 gap-2">
                  {/* Accessible Files */}
                  {getAccessibleMediaFiles().map((file) => (
                    <div 
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                          file.fileType === 'VIDEO' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {file.fileType === 'VIDEO' ? '▶' : '🖼'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.fileSize)}
                            {file.duration && ` • ${formatDuration(file.duration)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          file.accessType === 'FREE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {file.accessType}
                        </span>
                        <span className="text-xs text-green-600">✓</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Locked Premium Files */}
                  {getLockedPremiumFiles().map((file) => (
                    <div 
                      key={`locked-${file.id}`}
                      className="flex items-center justify-between p-2 rounded bg-purple-50 border border-purple-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium bg-purple-100 text-purple-800">
                          🔒
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.fileSize)}
                            {file.duration && ` • ${formatDuration(file.duration)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          PREMIUM
                        </span>
                        <span className="text-xs text-purple-600">🔒</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  {getAccessibleMediaFiles().length} accessible • {' '}
                  {getLockedPremiumFiles().length} locked premium files
                  {getLockedPremiumFiles().length > 0 && (
                    <span className="text-purple-600 font-medium"> • Purchase to unlock all content</span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="flex-1 bg-indigo-600 text-white py-2 sm:py-2.5 px-2 sm:px-4 rounded text-xs sm:text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  {addingToCart ? (
                    <div className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 border-1.5 border-white border-t-transparent rounded-full" />
                  ) : (
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                  <span className="hidden sm:inline">{addingToCart ? 'Adding...' : 'Add to Cart'}</span>
                  <span className="sm:hidden">{addingToCart ? 'Adding' : 'Cart'}</span>
                </button>
                
                <button 
                  onClick={toggleWishlist}
                  disabled={togglingWishlist}
                  className={`p-2 sm:p-3 border rounded transition-colors disabled:opacity-50 ${
                    isWishlisted 
                      ? 'bg-pink-50 border-pink-300 hover:bg-pink-100' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`} 
                  aria-label={isWishlisted ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${isWishlisted ? 'text-pink-500 fill-pink-500' : 'text-gray-600'}`} />
                </button>
                
                <ShareButton
                  url={typeof window !== 'undefined' ? window.location.href : ''}
                  title={`${design.title} by ${design.designer.name || 'Designer'} | DesignDrop`}
                  description={design.description || `Check out this amazing fashion design on DesignDrop`}
                  imageUrl={design.imageUrl}
                  className="p-1"
                />

              </div>

              {/* Buy Now Button */}
              <button
                onClick={handleBuyNow}
                disabled={buyingNow}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded text-xs sm:text-sm hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 font-semibold"
              >
                {buyingNow ? (
                  <div className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 border-1.5 border-white border-t-transparent rounded-full" />
                ) : (
                  <>💳</>
                )}
                <span className="text-xs sm:text-sm">{buyingNow ? 'Processing...' : `Buy Now • ${formatPrice(design.price)}`}</span>
              </button>

              {/* Commission Design - Only show if designer accepts commissions */}
              {session?.user?.id !== design.designer.id && design.designer.acceptsCommissions && design.designer.commissionStatus === 'OPEN' && (
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      if (!session) {
                        // Include callback URL so user returns to commission page after login
                        const callbackUrl = encodeURIComponent(`/commission-request?design=${design.id}`)
                        router.push(`/auth/signin?callbackUrl=${callbackUrl}`)
                        return
                      }
                      router.push(`/commission-request?design=${design.id}`)
                    }}
                    className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-xs sm:text-sm hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 font-medium"
                  >
                    <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Request Custom Commission</span>
                    <span className="sm:hidden">Commission</span>
                  </button>
                  
                  {/* Commission Info */}
                  <div className="text-xs text-gray-500 space-y-1">
                    {(design.designer.commissionMinBudget || design.designer.commissionMaxBudget) && (
                      <p className="flex items-center gap-1">
                        <span>💰 Budget range:</span>
                        <span className="font-medium text-gray-700">
                          {design.designer.commissionMinBudget && design.designer.commissionMaxBudget
                            ? `$${design.designer.commissionMinBudget} - $${design.designer.commissionMaxBudget}`
                            : design.designer.commissionMinBudget
                              ? `From $${design.designer.commissionMinBudget}`
                              : `Up to $${design.designer.commissionMaxBudget}`
                          }
                        </span>
                      </p>
                    )}
                    {design.designer.commissionTurnaround && (
                      <p className="flex items-center gap-1">
                        <span>⏱️ Turnaround:</span>
                        <span className="font-medium text-gray-700">{design.designer.commissionTurnaround}</span>
                      </p>
                    )}
                    {design.designer.commissionTypes && design.designer.commissionTypes.length > 0 && (
                      <p className="flex items-center gap-1">
                        <span>🎨 Types:</span>
                        <span className="font-medium text-gray-700">{design.designer.commissionTypes.join(', ')}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show when designer is busy but accepts commissions */}
              {session?.user?.id !== design.designer.id && design.designer.acceptsCommissions && design.designer.commissionStatus === 'BUSY' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-amber-700 text-sm font-medium">⏳ Designer is currently busy with commissions</p>
                  <p className="text-amber-600 text-xs mt-1">Check back later or browse their other designs</p>
                </div>
              )}

              {/* POD Products Section - Only show for Digital Designs category with POD configured */}
              {design.category === 'Digital Designs' && hasPOD && podProducts.length > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
                  <button
                    onClick={() => setShowPODSection(!showPODSection)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🖨️</span>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">Get This on Physical Products</h3>
                        <p className="text-xs text-gray-600">{podProducts.length} products available • T-shirts, mugs, posters & more</p>
                      </div>
                    </div>
                    <span className={`text-gray-500 transition-transform ${showPODSection ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  
                  {showPODSection && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-gray-600">
                        Get this design printed on real products! We handle printing and ship directly to you.
                      </p>
                      
                      <div className="grid gap-2">
                        {podProducts.map((product) => (
                          <div 
                            key={product.productId}
                            className={`p-3 bg-white rounded-lg border-2 transition-all cursor-pointer ${
                              selectedPODProduct === product.productId 
                                ? 'border-cyan-500 ring-2 ring-cyan-200' 
                                : 'border-gray-200 hover:border-cyan-300'
                            }`}
                            onClick={() => setSelectedPODProduct(
                              selectedPODProduct === product.productId ? null : product.productId
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                  {product.productId.includes('shirt') || product.productId.includes('tee') ? '👕' :
                                   product.productId.includes('mug') ? '☕' :
                                   product.productId.includes('poster') ? '🖼️' :
                                   product.productId.includes('hoodie') ? '🧥' :
                                   product.productId.includes('bag') ? '👜' : '📦'}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{product.productName}</p>
                                  <p className="text-xs text-gray-500">via {product.provider}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-cyan-600">${product.estimatedPrice.toFixed(2)}</p>
                                <p className="text-xs text-gray-400">+ shipping</p>
                              </div>
                            </div>
                            
                            {selectedPODProduct === product.productId && (
                              <div className="mt-3 pt-3 border-t">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAddPODToCart(product.productId)
                                  }}
                                  disabled={addingPODToCart}
                                  className="w-full py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  {addingPODToCart ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                  ) : (
                                    <ShoppingCart className="h-4 w-4" />
                                  )}
                                  {addingPODToCart ? 'Adding...' : 'Add to Cart'}
                                </button>
                                <p className="text-xs text-gray-500 text-center mt-2">
                                  Requires shipping address at checkout
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/50 p-2 rounded-lg">
                        <span>ℹ️</span>
                        <span>Physical products are printed on-demand and shipped within 3-7 business days</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-sm text-gray-500 text-center">
                {hasPOD ? 'Digital download OR physical products available' : 'Digital download • Instant access after purchase'}
              </p>
            </div>

            {/* Additional Info */}
            <div className="text-sm text-gray-500">
              <p>Uploaded on {formatDate(design.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Customer Reviews
              {design._count?.reviews ? (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({design._count.reviews} {design._count.reviews === 1 ? 'review' : 'reviews'})
                </span>
              ) : null}
            </h2>
            
            {/* Write Review Button */}
            {canReview && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Write a Review
              </button>
            )}
            
            {/* Average Rating Display */}
            {design.avgRating && design.avgRating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(design.avgRating || 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {design.avgRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Sales Count Badge */}
          {design.totalSales > 0 && (
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              {design.totalSales} {design.totalSales === 1 ? 'customer' : 'customers'} bought this design
            </div>
          )}

          {/* Review Form */}
          {showReviewForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Write Your Review</h3>
              
              {/* Star Rating Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= reviewRating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 hover:text-yellow-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {reviewRating === 1 && 'Poor'}
                    {reviewRating === 2 && 'Fair'}
                    {reviewRating === 3 && 'Good'}
                    {reviewRating === 4 && 'Very Good'}
                    {reviewRating === 5 && 'Excellent'}
                  </span>
                </div>
              </div>
              
              {/* Comment Textarea */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review (Optional)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this design..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reviewComment.length}/500 characters
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingReview ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
                <button
                  onClick={() => {
                    setShowReviewForm(false)
                    setReviewComment('')
                    setReviewRating(5)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Already Reviewed Notice */}
          {hasReviewed && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700 text-sm">You have already reviewed this design. Thank you!</span>
            </div>
          )}

          {/* Reviews List */}
          {design.reviews && design.reviews.length > 0 ? (
            <div className="space-y-4">
              {design.reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {review.user.image ? (
                        <Image
                          src={review.user.image}
                          alt={review.user.name || 'User'}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium">
                          {(review.user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {review.user.name || 'Anonymous'}
                        </span>
                        {review.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 text-sm">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No reviews yet</p>
              <p className="text-sm mt-1">Be the first to review this design after purchase</p>
            </div>
          )}
        </div>
      </div>

      {/* Similar Designs Section */}
      <div className="mt-8">
        <SimilarDesigns 
          designId={design.id} 
          category={design.category}
          designerId={design.designer.id}
          limit={4}
        />
      </div>
    </div>
  )
}