'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface FollowButtonProps {
  designerId: string
  initialFollowing?: boolean
  initialFollowerCount?: number
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function FollowButton({
  designerId,
  initialFollowing = false,
  initialFollowerCount = 0,
  showCount = true,
  size = 'md'
}: FollowButtonProps) {
  const { data: session } = useSession()
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)
  const [loading, setLoading] = useState(false)

  const handleFollow = async () => {
    if (!session?.user?.id) {
      // Redirect to login
      window.location.href = `/auth/signin?callbackUrl=${window.location.pathname}`
      return
    }

    if (session.user.id === designerId) {
      return // Can't follow yourself
    }

    setLoading(true)

    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/seller/follow?designerId=${designerId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsFollowing(false)
          setFollowerCount(data.followerCount)
        }
      } else {
        // Follow
        const response = await fetch('/api/seller/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designerId })
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsFollowing(true)
          setFollowerCount(data.followerCount)
        }
      }
    } catch (error) {
      console.error('Follow error:', error)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base'
  }

  // Don't show follow button for own profile
  if (session?.user?.id === designerId) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleFollow}
        disabled={loading}
        className={`
          ${sizeClasses[size]}
          font-medium rounded-full transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isFollowing
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }
        `}
      >
        {loading ? (
          <span className="inline-block animate-spin">↻</span>
        ) : isFollowing ? (
          <span className="group-hover:hidden">Following</span>
        ) : (
          'Follow'
        )}
      </button>
      
      {showCount && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {followerCount.toLocaleString()} {followerCount === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  )
}
