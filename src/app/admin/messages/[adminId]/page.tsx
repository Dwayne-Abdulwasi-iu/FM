'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MessageSquare, 
  ArrowLeft,
  Mail,
  Clock,
  ChevronRight,
  BadgeCheck,
  User as UserIcon,
  Search
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserConversation {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  isVerified: boolean
  designerTier: string | null
  conversationStats: {
    totalMessages: number
    unreadCount: number
    lastMessage: {
      preview: string
      createdAt: string
      isFromUser: boolean
      isRead: boolean
    } | null
  }
}

interface AdminData {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface UsersData {
  admin: AdminData
  users: UserConversation[]
  isViewingOwnMessages: boolean
  canSendOnBehalf: boolean
}

interface PageProps {
  params: Promise<{ adminId: string }>
}

const TIER_LABELS: Record<string, string> = {
  'DESIGNER': 'Designer',
  'GOLD_DESIGNER': 'Gold',
  'VIP_DESIGNER': 'VIP',
  'VVIP_DESIGNER': 'VVIP',
}

export default function AdminUsersPage({ params }: PageProps) {
  const { adminId } = use(params)
  const [data, setData] = useState<UsersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/messages/${adminId}/users`)
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
  }, [adminId])

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

  const filteredUsers = data?.users.filter(user => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      (user.name?.toLowerCase().includes(searchLower)) ||
      user.email.toLowerCase().includes(searchLower)
    )
  }) || []

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Failed to load data</p>
          <Link href="/admin/messages" className="text-indigo-600 hover:underline mt-2 inline-block">
            Back to Messages
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/admin/messages" 
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {data.admin.image ? (
              <Image
                src={data.admin.image}
                alt={data.admin.name || 'Admin'}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 font-semibold">
                  {(data.admin.name || data.admin.email)[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {data.isViewingOwnMessages ? 'Your Conversations' : `${data.admin.name || data.admin.email}'s Conversations`}
              </h1>
              <p className="text-sm text-gray-600">
                {data.users.length} user{data.users.length !== 1 ? 's' : ''} messaged
              </p>
            </div>
          </div>
        </div>
        {data.canSendOnBehalf && (
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
            Viewing as Main Admin
          </span>
        )}
      </div>

      {/* Search */}
      {data.users.length > 5 && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      {/* User List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredUsers.map((user) => (
            <Link
              key={user.id}
              href={`/admin/messages/${adminId}/${user.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
            >
              {/* Avatar */}
              <div className="relative">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || 'User'}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                {user.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                    <BadgeCheck className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {user.name || user.email}
                  </h3>
                  {user.designerTier && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {TIER_LABELS[user.designerTier] || user.designerTier}
                    </span>
                  )}
                </div>
                {user.conversationStats.lastMessage ? (
                  <p className="text-sm text-gray-500 truncate">
                    {user.conversationStats.lastMessage.isFromUser ? '' : 'You: '}
                    {user.conversationStats.lastMessage.preview}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No messages</p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center hidden sm:block">
                  <p className="font-semibold text-gray-900">{user.conversationStats.totalMessages}</p>
                  <p className="text-xs text-gray-500">Messages</p>
                </div>
                {user.conversationStats.unreadCount > 0 && (
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {user.conversationStats.unreadCount}
                  </div>
                )}
                {user.conversationStats.lastMessage && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">{formatDate(user.conversationStats.lastMessage.createdAt)}</span>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {search ? 'No users match your search' : 'No conversations yet'}
              </p>
              {!data.isViewingOwnMessages && (
                <p className="text-sm text-gray-400 mt-2">
                  This admin hasn&apos;t messaged any users yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
