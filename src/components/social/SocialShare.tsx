'use client'

import { useState, useCallback } from 'react'
import { 
  Share2, 
  Twitter, 
  Facebook, 
  Link2, 
  MessageCircle, 
  Mail, 
  Check,
  Instagram,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Pinterest icon as SVG since Lucide doesn't have one
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
  </svg>
)

interface SocialShareProps {
  url: string
  title: string
  description?: string
  imageUrl?: string
  hashtags?: string[]
  via?: string // Twitter handle
  className?: string
  variant?: 'buttons' | 'dropdown' | 'icons'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

interface SharePlatform {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  getUrl: (props: ShareData) => string
  deepLink?: (props: ShareData) => string
}

interface ShareData {
  url: string
  title: string
  description?: string
  imageUrl?: string
  hashtags?: string[]
  via?: string
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: <Twitter className="w-5 h-5" />,
    color: 'bg-black hover:bg-gray-800',
    getUrl: ({ url, title, hashtags, via }) => {
      const params = new URLSearchParams({
        url,
        text: title,
        ...(hashtags?.length && { hashtags: hashtags.join(',') }),
        ...(via && { via }),
      })
      return `https://twitter.com/intent/tweet?${params.toString()}`
    },
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'bg-[#1877F2] hover:bg-[#166FE5]',
    getUrl: ({ url }) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: <PinterestIcon className="w-5 h-5" />,
    color: 'bg-[#E60023] hover:bg-[#CC001F]',
    getUrl: ({ url, title, description, imageUrl }) => {
      const params = new URLSearchParams({
        url,
        description: description || title,
        ...(imageUrl && { media: imageUrl }),
      })
      return `https://pinterest.com/pin/create/button/?${params.toString()}`
    },
    // Pinterest deep link for mobile
    deepLink: ({ url, description, imageUrl }) => {
      const params = new URLSearchParams({
        url,
        description: description || '',
        ...(imageUrl && { imageUrl }),
      })
      return `pinterest://pin/create/button/?${params.toString()}`
    },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    color: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90',
    getUrl: () => '', // Instagram doesn't support direct web sharing
    deepLink: () => 'instagram://story-camera', // Opens Instagram Stories
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'bg-[#25D366] hover:bg-[#20BD5C]',
    getUrl: ({ url, title }) => 
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    deepLink: ({ url, title }) => 
      `whatsapp://send?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    id: 'email',
    name: 'Email',
    icon: <Mail className="w-5 h-5" />,
    color: 'bg-gray-600 hover:bg-gray-700',
    getUrl: ({ url, title, description }) => 
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
        `${description || title}\n\n${url}`
      )}`,
  },
]

const SIZE_CLASSES = {
  sm: 'p-1.5 text-xs',
  md: 'p-2 text-sm',
  lg: 'p-3 text-base',
}

const ICON_SIZE_CLASSES = {
  sm: '[&>svg]:w-4 [&>svg]:h-4',
  md: '[&>svg]:w-5 [&>svg]:h-5',
  lg: '[&>svg]:w-6 [&>svg]:h-6',
}

export function SocialShare({
  url,
  title,
  description,
  imageUrl,
  hashtags = ['FashionDesign', 'DesignDrop'],
  via = 'designdrop',
  className = '',
  variant = 'buttons',
  size = 'md',
  showLabel = false,
}: SocialShareProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [instagramCopied, setInstagramCopied] = useState(false)

  const handleShare = useCallback(async (platform: SharePlatform) => {
    const shareData: ShareData = {
      url,
      title,
      description,
      imageUrl,
      hashtags,
      via,
    }
    // Special handling for Instagram
    if (platform.id === 'instagram') {
      // Copy link to clipboard for Instagram
      try {
        await navigator.clipboard.writeText(url)
        setInstagramCopied(true)
        setTimeout(() => setInstagramCopied(false), 2000)
        
        // Try to open Instagram app
        if (platform.deepLink) {
          window.location.href = platform.deepLink(shareData)
        }
      } catch {
        // Fallback - just show copied message
        setInstagramCopied(true)
        setTimeout(() => setInstagramCopied(false), 2000)
      }
      return
    }

    // Try deep link on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile && platform.deepLink) {
      window.location.href = platform.deepLink(shareData)
      // Set timeout to fallback to web URL if deep link doesn't work
      setTimeout(() => {
        if (document.hasFocus() && platform.getUrl(shareData)) {
          window.open(platform.getUrl(shareData), '_blank', 'width=600,height=400')
        }
      }, 1500)
      return
    }

    // Open share URL
    const shareUrl = platform.getUrl(shareData)
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400')
    }
  }, [url, title, description, imageUrl, hashtags, via])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [url])

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url,
        })
      } catch {
        // User cancelled or error
      }
    } else {
      setIsOpen(true)
    }
  }, [title, description, url])

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={handleNativeShare}
          className={`flex items-center gap-2 ${SIZE_CLASSES[size]} rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors`}
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
          {showLabel && <span>Share</span>}
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[200px]"
              >
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Share</span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label="Close share menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {SHARE_PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => {
                      handleShare(platform)
                      if (platform.id !== 'instagram') setIsOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <span className={`p-1.5 rounded-lg ${platform.color} text-white`}>
                      {platform.icon}
                    </span>
                    <span className="text-sm font-medium">{platform.name}</span>
                    {platform.id === 'instagram' && instagramCopied && (
                      <span className="text-xs text-green-500 ml-auto">Link copied!</span>
                    )}
                  </button>
                ))}
                <hr className="my-2 border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    handleCopyLink()
                    setTimeout(() => setIsOpen(false), 1000)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                >
                  <span className="p-1.5 rounded-lg bg-gray-500 text-white">
                    {copied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                  </span>
                  <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Icons only variant
  if (variant === 'icons') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {SHARE_PLATFORMS.slice(0, 4).map(platform => (
          <button
            key={platform.id}
            onClick={() => handleShare(platform)}
            className={`${SIZE_CLASSES[size]} ${ICON_SIZE_CLASSES[size]} rounded-full ${platform.color} text-white transition-all hover:scale-110`}
            aria-label={`Share on ${platform.name}`}
            title={platform.name}
          >
            {platform.icon}
          </button>
        ))}
        <button
          onClick={handleCopyLink}
          className={`${SIZE_CLASSES[size]} ${ICON_SIZE_CLASSES[size]} rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-all hover:scale-110`}
          aria-label="Copy link"
          title={copied ? 'Copied!' : 'Copy link'}
        >
          {copied ? <Check /> : <Link2 />}
        </button>
      </div>
    )
  }

  // Default buttons variant
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {SHARE_PLATFORMS.map(platform => (
        <button
          key={platform.id}
          onClick={() => handleShare(platform)}
          className={`flex items-center gap-2 ${SIZE_CLASSES[size]} ${ICON_SIZE_CLASSES[size]} rounded-lg ${platform.color} text-white transition-all hover:scale-105`}
          aria-label={`Share on ${platform.name}`}
        >
          {platform.icon}
          {showLabel && <span className="font-medium">{platform.name}</span>}
        </button>
      ))}
      <button
        onClick={handleCopyLink}
        className={`flex items-center gap-2 ${SIZE_CLASSES[size]} ${ICON_SIZE_CLASSES[size]} rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition-all hover:scale-105`}
        aria-label="Copy link"
      >
        {copied ? <Check /> : <Link2 />}
        {showLabel && <span className="font-medium">{copied ? 'Copied!' : 'Copy Link'}</span>}
      </button>
    </div>
  )
}

// Compact share button for cards
export function ShareButton({
  url,
  title,
  description,
  imageUrl,
  className = '',
}: Omit<SocialShareProps, 'variant' | 'size' | 'showLabel'>) {
  return (
    <SocialShare
      url={url}
      title={title}
      description={description}
      imageUrl={imageUrl}
      variant="dropdown"
      size="sm"
      className={className}
    />
  )
}

