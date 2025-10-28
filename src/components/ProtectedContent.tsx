'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Lock, ShoppingCart, Crown, Download, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProtectedContentProps {
  designId: string
  children: React.ReactNode
  previewContent?: React.ReactNode
}

interface AccessCheck {
  hasAccess: boolean
  reason: string
  accessType?: 'owner' | 'regular' | 'ownership' | 'admin'
  design?: {
    id: string
    title: string
    price: number
    ownershipPrice?: number
    buyingTypes: string
    isOwned: boolean
  }
}

export default function ProtectedContent({ designId, children, previewContent }: ProtectedContentProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [accessCheck, setAccessCheck] = useState<AccessCheck | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch(`/api/designs/${designId}/access`)
        const data = await response.json()
        setAccessCheck(data)
      } catch (error) {
        console.error('Access check failed:', error)
        setAccessCheck({
          hasAccess: false,
          reason: 'Failed to verify access'
        })
      } finally {
        setLoading(false)
      }
    }

    if (designId) {
      checkAccess()
    }
  }, [designId, session])

  const handleDownload = async () => {
    if (!accessCheck?.design) return
    
    try {
      const response = await fetch(`/api/designs/${designId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${accessCheck.design.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_files.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Download failed. Please try again.')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Download failed. Please try again.')
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: accessCheck?.design?.title || 'Fashion Design',
      text: 'Check out this amazing fashion design!',
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Share error:', error)
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard!')
      } catch (clipboardError) {
        alert('Sharing failed. Please copy the URL manually.')
      }
    }
  }

  const handleAddToCart = async (purchaseType: 'REGULAR' | 'OWNERSHIP') => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designId,
          quantity: 1,
          purchaseType
        }),
      })

      if (response.ok) {
        router.push('/cart')
      } else {
        console.error('Failed to add to cart')
      }
    } catch (error) {
      console.error('Add to cart error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  // User has access - show full content
  if (accessCheck?.hasAccess) {
    return (
      <div className="protected-content select-none">
        {/* Content protection overlay */}
        <div 
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="select-none"
        >
          {children}
        </div>
        
        {/* Access info */}
        <div className={`mt-6 p-4 border rounded-lg ${
          accessCheck.accessType === 'admin' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {accessCheck.accessType === 'admin' && (
                <Lock className="h-5 w-5 text-red-600 mr-2" />
              )}
              {accessCheck.accessType === 'owner' && (
                <Crown className="h-5 w-5 text-yellow-600 mr-2" />
              )}
              {accessCheck.accessType === 'ownership' && (
                <Crown className="h-5 w-5 text-purple-600 mr-2" />
              )}
              <span className={`text-sm font-medium ${
                accessCheck.accessType === 'admin' ? 'text-red-800' : 'text-green-800'
              }`}>
                {accessCheck.accessType === 'admin' && 'Admin Access - Content Moderation'}
                {accessCheck.accessType === 'owner' && 'You own this design'}
                {accessCheck.accessType === 'regular' && 'Regular access granted'}
                {accessCheck.accessType === 'ownership' && 'Exclusive ownership access'}
              </span>
            </div>
            
            {(accessCheck.accessType === 'ownership' || accessCheck.accessType === 'admin') && (
              <div className="flex space-x-2">
                <button
                  onClick={handleDownload}
                  className={`inline-flex items-center px-3 py-1 text-xs rounded hover:opacity-80 transition-colors ${
                    accessCheck.accessType === 'admin'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {accessCheck.accessType === 'admin' ? 'Admin Download' : 'Download'}
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Share
                </button>
              </div>
            )}
          </div>
          {accessCheck.accessType === 'admin' && (
            <div className="mt-2 text-xs text-red-600">
              ⚠️ Admin preview mode: You can view all content for moderation purposes.
            </div>
          )}
        </div>
      </div>
    )
  }

  // User doesn't have access - show locked content
  return (
    <div className="relative">
      {/* Preview content with blur overlay */}
      <div className="relative">
        {previewContent ? (
          <div className="filter blur-sm pointer-events-none">
            {previewContent}
          </div>
        ) : (
          <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
            <Lock className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Lock overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="text-center text-white p-6">
            <Lock className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Premium Content</h3>
            <p className="text-sm opacity-90 mb-6">
              Purchase this design to access full details, high-resolution images, and additional content.
            </p>
          </div>
        </div>
      </div>

      {/* Purchase options */}
      {accessCheck?.design && (
        <div className="mt-6 space-y-4">
          {!session && (
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">
                Sign in to purchase this design
              </p>
              <button
                onClick={() => router.push('/auth/signin')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Sign In
              </button>
            </div>
          )}

          {session && (
            <div className="grid gap-4">
              {/* Regular Purchase Option */}
              {(accessCheck.design.buyingTypes === 'REGULAR' || accessCheck.design.buyingTypes === 'BOTH') && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">Regular License</h4>
                      <p className="text-sm text-gray-600">Standard commercial use, multiple buyers allowed</p>
                    </div>
                    <span className="text-xl font-bold text-indigo-600">
                      ${accessCheck.design.price.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddToCart('REGULAR')}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium flex items-center justify-center"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </button>
                </div>
              )}

              {/* Ownership Purchase Option */}
              {(accessCheck.design.buyingTypes === 'OWNERSHIP' || accessCheck.design.buyingTypes === 'BOTH') && 
               !accessCheck.design.isOwned && accessCheck.design.ownershipPrice && (
                <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-semibold text-purple-900 flex items-center">
                        <Crown className="h-4 w-4 mr-1" />
                        Exclusive Ownership
                      </h4>
                      <p className="text-sm text-purple-700">
                        Exclusive rights, branding allowed, design becomes unavailable to others
                      </p>
                    </div>
                    <span className="text-xl font-bold text-purple-600">
                      ${accessCheck.design.ownershipPrice.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddToCart('OWNERSHIP')}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Purchase Exclusive Rights
                  </button>
                </div>
              )}

              {/* Already owned message */}
              {accessCheck.design.isOwned && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <Crown className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-yellow-800 font-medium">
                    This design has been exclusively purchased and is no longer available
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}