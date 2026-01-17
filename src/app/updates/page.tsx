'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sanitizeHtml } from '@/lib/sanitize'
import { 
  Bell, 
  Megaphone, 
  CheckCheck, 
  ArrowLeft,
  Clock,
  Users,
  Star,
  Shield,
  Package,
  Palette,
  Loader2
} from 'lucide-react'

interface Update {
  id: string
  broadcastId: string
  subject: string
  content: string
  targetType: string
  sentAt: string
  from: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

interface Pagination {
  hasMore: boolean
  nextCursor: string | null
}

const TARGET_LABELS: Record<string, { label: string; icon: typeof Users; color: string }> = {
  'ALL': { label: 'Everyone', icon: Users, color: 'bg-blue-100 text-blue-600' },
  'USERS': { label: 'Buyers', icon: Users, color: 'bg-gray-100 text-gray-600' },
  'SELLERS': { label: 'Sellers', icon: Package, color: 'bg-green-100 text-green-600' },
  'DESIGNERS': { label: 'Designers', icon: Palette, color: 'bg-purple-100 text-purple-600' },
  'TIER_SPECIFIC': { label: 'Special Tier', icon: Star, color: 'bg-yellow-100 text-yellow-600' },
  'VERIFIED_ONLY': { label: 'Verified Members', icon: Shield, color: 'bg-indigo-100 text-indigo-600' },
}

export default function UpdatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ hasMore: false, nextCursor: null })
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchUpdates = useCallback(async (cursor?: string) => {
    try {
      const isInitial = !cursor
      if (isInitial) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams({ limit: '20' })
      if (cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/updates?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (isInitial) {
          setUpdates(data.updates || [])
        } else {
          setUpdates(prev => [...prev, ...(data.updates || [])])
        }
        setUnreadCount(data.unreadCount || 0)
        setPagination(data.pagination || { hasMore: false, nextCursor: null })
      }
    } catch (error) {
      console.error('Failed to fetch updates:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (session) {
      fetchUpdates()
    }
  }, [session, fetchUpdates])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loadingMore && pagination.nextCursor) {
          fetchUpdates(pagination.nextCursor)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [pagination, loadingMore, fetchUpdates])

  const markAsRead = async (updateId: string) => {
    try {
      await fetch('/api/updates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateId }),
      })
      // Update local state
      setUpdates(prev => prev.map(u => 
        u.id === updateId ? { ...u, isRead: true, readAt: new Date().toISOString() } : u
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/updates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setUpdates(prev => prev.map(u => ({ ...u, isRead: true, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const openUpdate = (update: Update) => {
    setSelectedUpdate(update)
    if (!update.isRead) {
      markAsRead(update.id)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Updates</h1>
                  <p className="text-sm text-gray-500">Official announcements from the platform</p>
                </div>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <Bell className="w-5 h-5 text-indigo-600" />
            <span className="text-indigo-800 text-sm">
              You have <strong>{unreadCount}</strong> unread update{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Updates List */}
        {updates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Megaphone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No updates yet</h3>
            <p className="text-gray-500">
              You&apos;ll see important announcements and updates from the platform here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {updates.map(update => {
              const targetInfo = TARGET_LABELS[update.targetType] || TARGET_LABELS['ALL']
              const TargetIcon = targetInfo.icon

              return (
                <button
                  key={update.id}
                  onClick={() => openUpdate(update)}
                  className={`w-full text-left bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
                    !update.isRead 
                      ? 'border-indigo-300 ring-1 ring-indigo-100' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {!update.isRead && (
                            <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${targetInfo.color}`}>
                            <TargetIcon className="w-3 h-3" />
                            {targetInfo.label}
                          </span>
                        </div>
                        <h3 className={`font-semibold text-gray-900 mb-1 ${!update.isRead ? '' : 'text-gray-700'}`}>
                          {update.subject}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {update.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(update.sentAt || update.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Infinite scroll trigger / Load more indicator */}
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading more...</span>
                </div>
              )}
              {!pagination.hasMore && updates.length > 0 && (
                <p className="text-sm text-gray-400">You&apos;ve seen all updates</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Update Detail Modal */}
      {selectedUpdate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      (TARGET_LABELS[selectedUpdate.targetType] || TARGET_LABELS['ALL']).color
                    }`}>
                      {(TARGET_LABELS[selectedUpdate.targetType] || TARGET_LABELS['ALL']).label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(selectedUpdate.sentAt || selectedUpdate.createdAt)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedUpdate.subject}</h2>
                  <p className="text-sm text-gray-500 mt-1">From: {selectedUpdate.from}</p>
                </div>
                <button
                  onClick={() => setSelectedUpdate(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div 
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHtml(selectedUpdate.content.replace(/\n/g, '<br>')) 
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedUpdate(null)}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
