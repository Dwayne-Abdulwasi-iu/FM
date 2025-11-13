"use client"
/* eslint-disable @next/next/no-img-element */

import React, { useMemo, useState } from 'react'
import { sanitizePlaceholderImageUrl } from '@/lib/images'

export type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null
  alt: string
  fallbackSrc?: string
}

export default function SafeImage({ src, alt, fallbackSrc = '/images/placeholder-design.svg', className, ...rest }: SafeImageProps) {
  const initial = useMemo(() => sanitizePlaceholderImageUrl(src), [src])
  const [currentSrc, setCurrentSrc] = useState<string>(initial)

  const mergedClass = [className, 'max-w-full', 'block'].filter(Boolean).join(' ')

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={mergedClass}
      onError={(e) => {
        const target = e.currentTarget
        if (target.dataset.fallbackApplied === 'true') return
        target.dataset.fallbackApplied = 'true'
        const next = fallbackSrc || '/images/placeholder-design.svg'
        setCurrentSrc(next.includes('?') ? next : `${next}?fallback=true`)
      }}
      {...rest}
    />
  )
}
