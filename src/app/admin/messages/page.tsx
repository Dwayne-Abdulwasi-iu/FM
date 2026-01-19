'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MessageSquare, 
  Users, 
  ArrowLeft,
  Mail,
  Clock,
  ChevronRight,
  Crown,
  Shield
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AdminStats {
  id: string
  name: string | null
  email: string
  image: string | null
  isMainAdmin: boolean
  stats: {
    conversationCount: number
    totalMessagesSent: number
    unreadReplies: number
    lastMessageAt: string | null
    lastMessagePreview: string | null
  }
}

interface OverviewData {
  isMainAdmin: boolean
  admins: AdminStats[]
  currentAdminId: string
}

export default function AdminMessagesPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/messages/overview')
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        toast.error(result.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
        <div className="animate-pulse">
          <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/4 mb-4 sm:mb-6"></div>
          <div className="h-48 sm:h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-900 text-sm sm:text-base">Failed to load data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
        <Link 
          href="/admin" 
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600" />
            Message Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-900">
            {data.isMainAdmin 
              ? 'View and manage all admin-user conversations'
              : 'Manage your conversations with users'}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-5 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 md:p-3 bg-indigo-100 rounded-lg">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{data.admins.length}</p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-900">Admin{data.admins.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-5 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 md:p-3 bg-green-100 rounded-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                {data.admins.reduce((sum, a) => sum + a.stats.conversationCount, 0)}
              </p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-900">Total Conversations</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-5 border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 md:p-3 bg-amber-100 rounded-lg">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                {data.admins.reduce((sum, a) => sum + a.stats.unreadReplies, 0)}
              </p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-900">Unread Replies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">
            {data.isMainAdmin ? 'Admin Team' : 'Your Messages'}
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {data.admins.map((admin) => (
            <Link
              key={admin.id}
              href={`/admin/messages/${admin.id}`}
              className="flex items-center gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 hover:bg-gray-50 transition"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {admin.image ? (
                  <Image
                    src={admin.image}
                    alt={admin.name || 'Admin'}
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold text-sm sm:text-base md:text-lg">
                      {(admin.name || admin.email)[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {admin.isMainAdmin && (
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-amber-400 rounded-full p-0.5 sm:p-1">
                    <Crown className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                    {admin.name || admin.email}
                  </h3>
                  {admin.id === data.currentAdminId && (
                    <span className="text-[10px] sm:text-xs bg-indigo-100 text-indigo-700 px-1.5 sm:px-2 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-900 truncate">
                  {admin.stats.lastMessagePreview || 'No messages yet'}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm">
                <div className="text-center hidden md:block">
                  <p className="font-semibold text-gray-900">{admin.stats.conversationCount}</p>
                  <p className="text-[10px] sm:text-xs text-gray-900">Conversations</p>
                </div>
                <div className="text-center hidden lg:block">
                  <p className="font-semibold text-gray-900">{admin.stats.totalMessagesSent}</p>
                  <p className="text-[10px] sm:text-xs text-gray-900">Sent</p>
                </div>
                {admin.stats.unreadReplies > 0 && (
                  <div className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                    {admin.stats.unreadReplies}
                  </div>
                )}
                <div className="flex items-center gap-0.5 sm:gap-1 text-gray-500">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                  <span className="text-[10px] sm:text-xs">{formatDate(admin.stats.lastMessageAt)}</span>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </div>
            </Link>
          ))}

          {data.admins.length === 0 && (
            <div className="p-6 sm:p-8 md:p-12 text-center">
              <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto text-gray-300 mb-2 sm:mb-4" />
              <p className="text-gray-900 text-xs sm:text-sm">No messaging activity yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
