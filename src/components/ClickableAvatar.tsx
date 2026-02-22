'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import ProfileImageModal from '@/components/ProfileImageModal'

type ClickableAvatarProps = {
  imageUrl?: string | null
  name?: string | null
  sizeClass?: string
  className?: string
  textClass?: string
}

export default function ClickableAvatar({
  imageUrl,
  name,
  sizeClass = 'w-10 h-10',
  className = '',
  textClass = 'text-sm'
}: ClickableAvatarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const fallback = useMemo(() => {
    const value = (name || 'U').trim()
    return value.length > 0 ? value[0].toUpperCase() : 'U'
  }, [name])

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setIsOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            event.stopPropagation()
            setIsOpen(true)
          }
        }}
        className={`${sizeClass} ${className} rounded-full overflow-hidden flex items-center justify-center bg-gray-100 hover:opacity-85 transition-opacity`}
        aria-label={`View ${name || 'user'} profile image`}
      >
        {imageUrl && imageUrl.trim() ? (
          <div className="relative w-full h-full">
            <Image src={imageUrl} alt={name || 'User'} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center">
            <span className={`${textClass} font-semibold text-white`}>{fallback}</span>
          </div>
        )}
      </div>

      <ProfileImageModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        imageUrl={imageUrl || null}
        userName={name || 'User'}
        isOwnProfile={false}
      />
    </>
  )
}
