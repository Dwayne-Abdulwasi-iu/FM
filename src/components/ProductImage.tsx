import { useState } from 'react'
import Image from 'next/image'
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
    <div className={`${containerClassName} relative`}>
      <Image
        src={src || ''}
        alt={alt}
        className={className}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        onError={() => setImageError(true)}
        onLoadingComplete={() => setIsLoading(false)}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}
