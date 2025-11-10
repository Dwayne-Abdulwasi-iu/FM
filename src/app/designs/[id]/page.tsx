'use client'

import { useState, useEffect, useCallback } from 'react'
import SafeImage from '@/components/ui/safe-image'
import { sanitizePlaceholderImageUrl } from '@/lib/images'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Heart, ShoppingCart, ArrowLeft, Share2, CheckCircle, X, Shield } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { formatPriceLocalized, type SupportedCurrency } from '@/lib/currency'
// import ProtectedContent from '@/components/ProtectedContent'

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

interface Design {
  id: string
  title: string
  description: string | null
  price: number
  ownershipPrice: number | null
  buyingTypes: string
  isOwned: boolean
  imageUrl: string
  thumbnailUrl: string | null
  category: string
  tags: string | null
  createdAt: string
  designer: {
    id: string
    name: string | null
    bio: string | null
    image: string | null
  }
  totalSales: number
  totalRevenue: number
  mediaFiles: MediaFile[]
}

export default function DesignPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [design, setDesign] = useState<Design | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [hasAccess, setHasAccess] = useState(false)
  const [currency, setCurrency] = useState<SupportedCurrency>('USD')
  const [locale, setLocale] = useState<string>('en-US')

  // Check if admin is viewing this page
  const isAdminViewing = (searchParams?.get('admin') === 'true') && session?.user?.role === 'ADMIN'
  
  // Redirect non-admin users who try to access admin mode
  useEffect(() => {
    if (searchParams?.get('admin') === 'true' && session && session.user?.role !== 'ADMIN') {
      // Remove the admin parameter and redirect
      const newSearchParams = new URLSearchParams(searchParams?.toString() ?? '')
      newSearchParams.delete('admin')
      const newUrl = newSearchParams.toString() 
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname
      router.replace(newUrl)
    }
  }, [searchParams, session, router])

  const checkAccess = useCallback(async (designId: string) => {
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
  }, [session])

  const fetchDesign = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/designs/${id}`)
      if (response.ok) {
        const data = await response.json()
        setDesign(data.design)
      } else {
        console.error('Design not found')
      }
    } catch (error) {
      console.error('Failed to fetch design:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = params?.id
    if (id) {
      fetchDesign(id as string)
      checkAccess(id as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, checkAccess])

  // load favorite state
  useEffect(() => {
    const loadFav = async () => {
      if (!params?.id) return
      try {
        if (session?.user?.id) {
          const res = await fetch('/api/favorites')
          if (res.ok) {
            const data = await res.json()
            const found = (data.items || []).some((i: { id: string }) => i.id === params.id)
            setIsFavorited(!!found)
          }
        } else {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('wishlist') : null
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) setIsFavorited(parsed.some((p: { id: string }) => p.id === params?.id))
          }
        }
      } catch {
        // ignore
      }
    }
    loadFav()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, session?.user?.id])

  const toggleFavorite = async () => {
    if (!design) return
    try {
      if (session?.user?.id) {
        if (isFavorited) {
          await fetch(`/api/favorites?designId=${design.id}`, { method: 'DELETE' })
          setIsFavorited(false)
          toast.success('Removed from wishlist')
        } else {
          await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designId: design.id }) })
          setIsFavorited(true)
          toast.success('Added to wishlist')
        }
      } else {
        // guest: persist to localStorage
        const raw = typeof window !== 'undefined' ? localStorage.getItem('wishlist') : null
  let parsed: Array<{ id: string; title?: string; imageUrl?: string; price?: number; designerName?: string | null }> = []
        if (raw) {
          try { parsed = JSON.parse(raw) } catch { parsed = [] }
        }
        if (isFavorited) {
          const updated = parsed.filter(p => p.id !== design.id)
          localStorage.setItem('wishlist', JSON.stringify(updated))
          setIsFavorited(false)
          toast.success('Removed from wishlist')
        } else {
          const entry = { id: design.id, title: design.title, imageUrl: design.thumbnailUrl || design.imageUrl, price: design.price, designerName: design.designer?.name || null }
          parsed.unshift(entry)
          localStorage.setItem('wishlist', JSON.stringify(parsed))
          setIsFavorited(true)
          toast.success('Added to wishlist')
        }
      }

      // notify header flyout to refresh
      window.dispatchEvent(new Event('wishlistUpdated'))
    } catch {
      console.error('Toggle favorite error')
      toast.error('Failed to update wishlist')
    }
  }

  // Infer locale/currency from API
  useEffect(() => {
    const loadLocale = async () => {
      try {
        const res = await fetch('/api/locale', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setLocale(data.locale || 'en-US')
          setCurrency((data.currency === 'NGN' ? 'NGN' : 'USD'))
        }
      } catch {
        // ignore
      }
    }
    loadLocale()
  }, [])

  const handleAddToCart = async (purchaseType: 'REGULAR' | 'OWNERSHIP' = 'REGULAR') => {
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
          purchaseType
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

  const formatPrice = (priceUSD: number) => formatPriceLocalized(priceUSD, currency, locale)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Image sanitization handled by SafeImage; poster uses shared sanitizer

  const getTags = (tags: string | string[] | null) => {
    if (!tags) return []
    // If tags are already an array (some APIs return string[]), normalize and return
    if (Array.isArray(tags)) {
      return tags.map(t => (t == null ? '' : String(t).trim())).filter(Boolean)
    }

    // Normalize anything that isn't an array by coercing to a string first.
    // This avoids calling `.split` on non-string values directly.
    try {
      const coerced = Array.isArray(tags) ? '' : String(tags)
      return coerced.split(',').map(tag => tag.trim()).filter(Boolean)
    } catch {
      return []
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        {/* Admin Viewing Banner */}
        {isAdminViewing && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <span className="text-red-800 font-medium">Admin Moderation Mode</span>
                <p className="text-red-600 text-sm mt-1">
                  You are viewing this design with full admin privileges. All premium content is accessible for moderation purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-600 mr-3" />
              <span className="text-red-800 font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800"
              aria-label="Close error message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Media Gallery */}
          <div className="space-y-4">
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
                      poster={sanitizePlaceholderImageUrl(design.thumbnailUrl) || undefined}
                    >
                      <source src={selectedFile.fileUrl} type={selectedFile.mimeType} />
                      Your browser does not support the video tag.
                    </video>
                  )
                } else {
                  return (
                    <SafeImage
                      src={selectedFile.fileUrl}
                      alt={selectedFile.fileName}
                      className="w-full h-full object-cover cursor-zoom-in"
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
                  <div className="grid grid-cols-4 gap-2">
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
                            <SafeImage
                              src={file.fileUrl}
                              alt={file.fileName}
                              className="w-full h-full object-cover"
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
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{design.title}</h1>
              <p className="text-2xl font-bold text-indigo-600">{formatPrice(design.price)}</p>
            </div>

            {/* Designer Info */}
            <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                {design.designer.image ? (
                  <SafeImage src={design.designer.image} alt={design.designer.name || ''} className="w-12 h-12 rounded-full" />
                ) : (
                  <span className="text-gray-500 font-semibold">
                    {(design.designer.name || 'A')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{design.designer.name || 'Anonymous'}</h3>
                {design.designer.bio && (
                  <p className="text-sm text-gray-600">{design.designer.bio}</p>
                )}
              </div>
            </div>

            {/* Description */}
            {design.description && (
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{design.description}</p>
              </div>
            )}

            {/* Tags */}
            {design.tags && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {getTags(design.tags).map((tag) => (
                    <span 
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Category and Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-1">Category</h3>
                <p className="text-gray-700">{design.category}</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-1">Sales</h3>
                <p className="text-gray-700">{design.totalSales} sold</p>
              </div>
            </div>

            {/* Media Files Info */}
            {design.mediaFiles && design.mediaFiles.length > 0 && (
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Included Media</h3>
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
            <div className="space-y-4">
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleAddToCart('REGULAR')}
                    disabled={addingToCart}
                    className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {addingToCart ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <ShoppingCart className="h-5 w-5" />
                    )}
                    {addingToCart ? 'Adding...' : 'Add Regular'}
                  </button>

                  <button
                    onClick={toggleFavorite}
                    className={`p-3 border rounded-lg hover:bg-gray-50 ${isFavorited ? 'border-red-200 bg-red-50' : 'border-gray-300'}`}
                    aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`h-5 w-5 ${isFavorited ? 'text-red-500' : 'text-gray-600'}`} />
                  </button>
                
                <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50" aria-label="Share design">
                  <Share2 className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 text-center">
                Digital download • Instant access after purchase
              </p>

              {/* Purchase Options */}
              {design && (
                <div className="grid gap-4">
                  {(design.buyingTypes === 'REGULAR' || design.buyingTypes === 'BOTH') && (
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">Regular License</h4>
                          <p className="text-sm text-gray-600">Standard commercial use, multiple buyers allowed</p>
                        </div>
                        <span className="text-lg font-bold text-indigo-600">
                          {formatPrice(design.price)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddToCart('REGULAR')}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        Add Regular to Cart
                      </button>
                    </div>
                  )}

                  {(design.buyingTypes === 'OWNERSHIP' || design.buyingTypes === 'BOTH') && !design.isOwned && !!design.ownershipPrice && (
                    <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h4 className="font-semibold text-purple-900">Exclusive Ownership</h4>
                          <p className="text-sm text-purple-700">Exclusive rights, branding allowed; design becomes unavailable</p>
                        </div>
                        <span className="text-lg font-bold text-purple-600">
                          {formatPrice(design.ownershipPrice)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddToCart('OWNERSHIP')}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium"
                      >
                        Purchase Exclusive Rights
                      </button>
                    </div>
                  )}

                  {design.isOwned && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <p className="text-sm text-yellow-800 font-medium">
                        This design has been exclusively purchased and is no longer available for ownership
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="text-sm text-gray-500">
              <p>Uploaded on {formatDate(design.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}