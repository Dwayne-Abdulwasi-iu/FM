import { useState } from 'react'
import { Package } from 'lucide-react'

interface ProductImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  containerClassName?: string
  fallbackClassName?: string
}

export function ProductImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center',
  fallbackClassName = 'w-8 h-8 text-gray-400',
}: ProductImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(!!src)

  // If no src or image failed to load, show fallback
  if (!src || !src.trim() || imageError) {
    return (
      <div className={containerClassName}>
        <Package className={fallbackClassName} />
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setImageError(true)}
        onLoad={() => setIsLoading(false)}
        style={{ display: imageError ? 'none' : 'block' }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}
