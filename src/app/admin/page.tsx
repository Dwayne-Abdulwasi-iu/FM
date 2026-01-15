'use client'

import { useState, useEffect, ElementType } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Eye,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Search,
  Mail,
  MessageCircle,
  BookOpen
} from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  isVerified: boolean
  createdAt: string
  updatedAt: string
  _count: {
    designs: number
    orders: number
  }
}

interface AdminStats {
  totalUsers: number
  totalDesigns: number
  totalOrders: number
  totalRevenue: number
  platformEarnings: number
  activeUsers: number
  recentSignups: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  platformFee: number
  createdAt: string
  customer: {
    name: string | null
    email: string
  }
}

interface Design {
  id: string
  title: string
  description: string | null
  price: number
  imageUrl: string
  category: string
  isActive: boolean
  createdAt: string
  totalSales: number
  totalRevenue: number
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  isOwned: boolean
  buyingTypes: string
  ownershipPrice: number | null
  designer: {
    name: string | null
    email: string
  }
}

type AdminTabId = 'overview' | 'users' | 'designs' | 'orders' | 'resources' | 'contact' | 'chat' | 'earnings'

// Minimal types for admin lists to reduce `any` usage in state
interface ContactMessage {
  id: string
  subject?: string
  name?: string
  email?: string
  priority?: 'low' | 'medium' | 'high'
  status?: string
  createdAt: string
  message?: string
  user?: { name?: string; email?: string }
}

interface ChatMessage {
  id: string
  message?: string
  isAdmin?: boolean
  createdAt: string
}

interface ChatSession {
  id: string
  user: { name?: string; email?: string }
  _count: { messages: number }
  messages: ChatMessage[]
  status?: string
  createdAt: string
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [designs, setDesigns] = useState<Design[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [designFilter, setDesignFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{ step: number; userId: string; userEmail: string; inputValue?: string } | null>(null)
  const [adminConfirm, setAdminConfirm] = useState<{ step: number; userId: string; userEmail: string; action: 'makeAdmin' | 'removeAdmin' } | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [selectedChatSession, setSelectedChatSession] = useState<ChatSession | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [replyMessage, setReplyMessage] = useState('')
  const [communityStats, setCommunityStats] = useState<Array<{ number: string; label: string }>>([
    { number: "10,000+", label: "Active Designers" },
    { number: "50,000+", label: "Designs Sold" },
    { number: "150+", label: "Countries" },
    { number: "$2M+", label: "Earned by Designers" },
  ])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const fetchData = async () => {
    await fetchAdminData()
  }

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    
    fetchAdminData()
  }, [session, status, router])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000) // Auto-hide after 5 seconds
  }

  const fetchAdminData = async () => {
    try {
      setLoading(true)
        const [statsRes, usersRes, designsRes, ordersRes, contactRes, chatRes, statsSettingsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/designs'),
        fetch('/api/admin/orders'),
        fetch('/api/contact'),
        fetch('/api/customer-care/session'),
        fetch('/api/admin/stats-settings')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }

      if (statsSettingsRes.ok) {
        const statsSettingsData = await statsSettingsRes.json()
        setCommunityStats(statsSettingsData.stats || [
          { number: "10,000+", label: "Active Designers" },
          { number: "50,000+", label: "Designs Sold" },
          { number: "150+", label: "Countries" },
          { number: "$2M+", label: "Earned by Designers" },
        ])
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users)
      }

      if (designsRes.ok) {
        const designsData = await designsRes.json()
        setDesigns(designsData.designs)
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        setOrders(ordersData.orders)
      }

      if (contactRes.ok) {
        const contactData = await contactRes.json()
        setContactMessages(contactData.messages || [])
      }

      if (chatRes.ok) {
        const chatData = await chatRes.json()
        setChatSessions(chatData.sessions || [])
      }
  } catch (error) { console.error(error);
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'verify' | 'unverify' | 'makeAdmin' | 'removeAdmin') => {
    if (action === 'makeAdmin' || action === 'removeAdmin') {
      const user = users.find(u => u.id === userId)
      if (user) {
        setAdminConfirm({ step: 1, userId, userEmail: user.email, action })
      }
      return
    }

    try {
      const response = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })

      if (response.ok) {
        fetchAdminData() // Refresh data
        showNotification('success', `User ${action} completed successfully`)
      } else {
        showNotification('error', `Failed to ${action} user`)
      }
  } catch (error) { console.error(error);
      console.error(`Error ${action} user:`, error)
      showNotification('error', `Error occurred while ${action} user`)
    }
  }

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setDeleteConfirm({ step: 1, userId, userEmail: user.email })
    }
  }

  const confirmDeleteUser = async () => {
    if (!deleteConfirm) return
    
    try {
      console.log('Attempting to delete user:', deleteConfirm.userId)
      const response = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteConfirm.userId, action: 'delete' })
      })

      console.log('Delete response status:', response.status)
      const responseData = await response.json()
      console.log('Delete response data:', responseData)

      if (response.ok) {
        fetchAdminData()
        setDeleteConfirm(null)
        showNotification('success', `User account for ${deleteConfirm.userEmail} has been permanently deleted`)
      } else {
        showNotification('error', `Failed to delete user account: ${responseData.error || 'Unknown error'}`)
      }
  } catch (error) { console.error(error);
      console.error('Error deleting user:', error)
      showNotification('error', 'Network error occurred while deleting user account')
    }
  }

  const confirmAdminAction = async () => {
    if (!adminConfirm) return
    
    try {
      const response = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminConfirm.userId, action: adminConfirm.action })
      })

      if (response.ok) {
        fetchAdminData()
        setAdminConfirm(null)
        showNotification('success', `User ${adminConfirm.action} completed successfully for ${adminConfirm.userEmail}`)
      } else {
        showNotification('error', `Failed to ${adminConfirm.action} user`)
      }
  } catch (error) { console.error(error);
      console.error(`Error ${adminConfirm.action} user:`, error)
      showNotification('error', `Error occurred during ${adminConfirm.action}`)
    }
  }

  const handleDesignAction = async (designId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      const response = await fetch('/api/admin/designs/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId, action })
      })

      if (response.ok) {
        fetchAdminData()
        showNotification('success', `Design ${action} completed successfully`)
      } else {
        showNotification('error', `Failed to ${action} design`)
      }
  } catch (error) { console.error(error);
      console.error(`Error ${action} design:`, error)
      showNotification('error', `Error occurred while ${action} design`)
    }
  }

  const handleDesignApproval = async (designId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/designs/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designId,
          action,
          adminUser: session?.user?.email,
        }),
      })

      if (response.ok) {
        showToast(
          `Design ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
          'success'
        )
        await fetchData()
      } else {
        const error = await response.json()
        showToast(`Failed to ${action} design: ${error.message}`, 'error')
      }
  } catch (error) { console.error(error);
      showToast(`Failed to ${action} design`, 'error')
    }
  }

  const updateContactMessageStatus = async (messageId: string, status: string) => {
    try {
      const response = await fetch(`/api/contact/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
          showNotification('success', `Message marked as ${status.toLowerCase()}`)
        fetchAdminData()
      } else {
        showNotification('error', 'Failed to update message status')
      }
    } catch (error) {
        console.error('Error updating message status:', error)
        showNotification('error', 'Error updating message status')
    }
  }

  const fetchChatMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/customer-care/messages?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error)
    }
  }

  const sendChatReply = async (sessionId: string) => {
    if (!replyMessage.trim()) return

    try {
      const response = await fetch('/api/customer-care/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: replyMessage,
          isAdmin: true
        })
      })

      if (response.ok) {
        setReplyMessage('')
        fetchChatMessages(sessionId)
          showNotification('success', 'Reply sent successfully')
      } else {
        showNotification('error', 'Failed to send reply')
      }
    } catch (error) {
        console.error('Error sending reply:', error)
        showNotification('error', 'Error sending reply')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = userFilter === 'all' || 
                         (userFilter === 'verified' && user.isVerified) ||
                         (userFilter === 'unverified' && !user.isVerified)
    return matchesSearch && matchesFilter
  })

  const filteredDesigns = designs.filter(design => {
    return designFilter === 'all' || 
           (designFilter === 'pending' && design.approvalStatus === 'PENDING') ||
           (designFilter === 'approved' && design.approvalStatus === 'APPROVED') ||
           (designFilter === 'rejected' && design.approvalStatus === 'REJECTED')
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session || session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your fashion marketplace platform</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg shadow-sm p-2.5 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600">Total Users</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-[8px] sm:text-[10px] text-green-600">+{stats.recentSignups} this week</p>
                </div>
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-2.5 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600">Total Designs</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{stats.totalDesigns}</p>
                  <p className="text-[8px] sm:text-[10px] text-blue-600">{stats.activeUsers} sellers</p>
                </div>
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-2.5 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600">Total Revenue</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-[8px] sm:text-[10px] text-green-600">{stats.totalOrders} orders</p>
                </div>
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-2.5 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600">Platform Earnings</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">${stats.platformEarnings.toFixed(2)}</p>
                  <p className="text-[8px] sm:text-[10px] text-purple-600">Commission</p>
                </div>
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-2 sm:space-x-4 px-2 sm:px-6">
              {(
                [
                  { id: 'overview' as AdminTabId, label: 'Overview', icon: Eye },
                  { id: 'users' as AdminTabId, label: 'Users', icon: Users },
                  { id: 'designs' as AdminTabId, label: 'Designs', icon: ShoppingBag },
                  { id: 'orders' as AdminTabId, label: 'Orders', icon: ShoppingBag },
                  { id: 'resources' as AdminTabId, label: 'Resources', icon: BookOpen },
                  { id: 'contact' as AdminTabId, label: 'Messages', icon: Mail },
                  { id: 'chat' as AdminTabId, label: 'Support', icon: MessageCircle },
                  { id: 'earnings' as AdminTabId, label: 'Earnings', icon: DollarSign }
                ] as { id: AdminTabId; label: string; icon: ElementType }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 sm:py-4 px-1 border-b-2 font-medium text-[10px] sm:text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-2.5 sm:p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Community Stats Settings</h3>
                  <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                      {communityStats.map((stat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={stat.number}
                            onChange={(e) => {
                              const newStats = [...communityStats]
                              newStats[idx] = { number: e.target.value, label: stat.label }
                              setCommunityStats(newStats)
                            }}
                            placeholder="Value"
                            className="flex-1 px-2 py-1 text-[8px] sm:text-xs border border-gray-300 rounded text-black placeholder-gray-500"
                          />
                          <span className="text-[8px] sm:text-xs text-gray-600">{stat.label}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/admin/stats-settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ stats: communityStats }),
                          })
                          if (response.ok) {
                            showNotification('success', 'Stats updated successfully')
                          } else {
                            showNotification('error', 'Failed to update stats')
                          }
                        } catch (error) {
                          showNotification('error', 'Error updating stats')
                        }
                      }}
                      className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-[8px] sm:text-xs font-medium"
                    >
                      Save Stats
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Quick Links</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    <Link
                      href="/admin/commission-requests"
                      className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Commission Requests</p>
                          <p className="text-xs text-gray-500">Review &amp; forward to designers</p>
                        </div>
                      </div>
                    </Link>
                    <Link
                      href="/admin/deliveries"
                      className="p-4 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-200 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Physical Deliveries</p>
                          <p className="text-xs text-gray-500">Manage item collection &amp; shipping</p>
                        </div>
                      </div>
                    </Link>
                    <Link
                      href="/admin/resources"
                      className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Resources</p>
                          <p className="text-xs text-gray-500">Manage learning resources</p>
                        </div>
                      </div>
                    </Link>
                    <Link
                      href="/admin/pod"
                      className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-200 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🖨️</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Print-on-Demand</p>
                          <p className="text-xs text-gray-500">Monitor POD orders &amp; providers</p>
                        </div>
                      </div>
                    </Link>
                    <Link
                      href="/admin/pod-webhooks"
                      className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🔧</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">POD Webhooks</p>
                          <p className="text-xs text-gray-500">Configure Printful &amp; Printify webhooks</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Recent Activity</h3>
                  <div className="space-y-2 sm:space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="p-2.5 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">Order #{order.orderNumber}</p>
                          <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                            {order.customer.name || 'Customer'} • {order.customer.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-right">
                            <p className="font-medium text-xs sm:text-sm text-gray-900">${order.totalAmount.toFixed(2)}</p>
                            <p className="text-[8px] sm:text-[9px] text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">User Management</h3>
                  <div className="flex gap-1.5 sm:gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-7 sm:pl-10 pr-2 sm:pr-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-black placeholder-gray-500"
                      />
                    </div>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value as 'all' | 'verified' | 'unverified')}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-black"
                      title="Filter users by verification status"
                      aria-label="Filter users"
                    >
                      <option value="all">All</option>
                      <option value="verified">Verified</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                            <div>
                              <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user.name || 'No name'}</div>
                              <div className="text-[10px] sm:text-xs text-gray-500 truncate">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                            <span className={`inline-flex px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-xs font-semibold rounded-full ${
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                            <span className={`inline-flex px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-xs font-semibold rounded-full ${
                              user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[10px] sm:text-xs text-gray-500">
                            {user._count.designs} designs, {user._count.orders} orders
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[10px] sm:text-xs text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUserAction(user.id, user.isVerified ? 'unverify' : 'verify')}
                                className={`p-1 rounded transition-colors ${
                                  user.isVerified ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50' : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                }`}
                                title={user.isVerified ? 'Unverify user' : 'Verify user'}
                              >
                                {user.isVerified ? <UserX className="w-3 h-3 sm:w-4 sm:h-4" /> : <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />}
                              </button>
                              {user.role !== 'ADMIN' && (
                                <button
                                  onClick={() => handleUserAction(user.id, 'makeAdmin')}
                                  className="p-1 rounded text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors"
                                  title="Make admin"
                                >
                                  <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              )}
                              {user.role === 'ADMIN' && user.id !== session.user?.id && (
                                <button
                                  onClick={() => handleUserAction(user.id, 'removeAdmin')}
                                  className="p-1 rounded text-red-600 hover:text-red-800"
                                  title="Remove admin"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              )}
                              {user.id !== session.user?.id && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1 rounded text-red-600 hover:text-red-800"
                                  title="Delete user account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'designs' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">Design Management</h3>
                  <div className="flex gap-1.5 sm:gap-2">
                    <select
                      value={designFilter}
                      onChange={(e) => setDesignFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm text-black"
                      title="Filter designs by approval status"
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  {filteredDesigns.map((design) => (
                    <div key={design.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square relative">
                        <Image
                          src={design.imageUrl || ''}
                          alt={design.title}
                          width={400}
                          height={400}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `data:image/svg+xml,${encodeURIComponent(`
                              <svg width='400' height='400' xmlns='http://www.w3.org/2000/svg'>
                                <rect width='100%' height='100%' fill='#f3f4f6'/>
                                <text x='50%' y='50%' font-family='Arial' font-size='16' fill='#6b7280' text-anchor='middle' dy='.3em'>
                                  Fashion Design
                                </text>
                              </svg>
                            `)}`;
                          }}
                        />
                        <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] sm:text-xs font-semibold ${
                          design.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          design.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {design.approvalStatus}
                        </div>
                        {!design.isActive && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                            <span className="text-white font-semibold text-xs sm:text-sm">INACTIVE</span>
                          </div>
                        )}
                        {design.isOwned && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[8px] sm:text-xs font-semibold">
                            OWNED
                          </div>
                        )}
                      </div>
                      <div className="p-2 sm:p-3">
                        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{design.title}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate">by {design.designer.name || design.designer.email}</p>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm sm:text-base font-bold text-indigo-600">${design.price.toFixed(2)}</span>
                          <span className="text-[10px] sm:text-xs text-gray-500">{design.totalSales}</span>
                        </div>
                        {design.buyingTypes === 'BOTH' && design.ownershipPrice && (
                          <div className="mb-1">
                            <span className="text-[8px] sm:text-xs text-purple-600 font-medium">
                              Own: ${design.ownershipPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="text-[8px] sm:text-xs text-gray-500 mb-2">
                          {design.buyingTypes}
                        </div>
                        
                        {/* Approval Actions */}
                        {design.approvalStatus === 'PENDING' && (
                          <div className="flex gap-1 mb-1">
                            <button
                              onClick={() => handleDesignApproval(design.id, 'approve')}
                              className="flex-1 px-2 py-0.5 text-[8px] sm:text-xs bg-green-100 text-green-800 hover:bg-green-200 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDesignApproval(design.id, 'reject')}
                              className="flex-1 px-2 py-0.5 text-[8px] sm:text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        
                        <div className="flex gap-1">
                          <Link
                            href={`/designs/${design.id}?admin=true`}
                            className="px-2 py-0.5 text-[8px] sm:text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-200 rounded flex items-center justify-center"
                            title="View design"
                          >
                            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </Link>
                          <button
                            onClick={() => handleDesignAction(design.id, design.isActive ? 'deactivate' : 'activate')}
                            className={`flex-1 px-2 py-0.5 text-[8px] sm:text-xs rounded ${
                              design.isActive 
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {design.isActive ? 'Off' : 'On'}
                          </button>
                          <button
                            onClick={() => handleDesignAction(design.id, 'delete')}
                            className="px-2 py-0.5 text-[8px] sm:text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Order Management</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Order</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[8px] sm:text-xs font-medium text-gray-900">
                            #{order.orderNumber}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[7px] sm:text-[8px] text-gray-600">
                            <div className="font-medium">{order.customer.name}</div>
                            <div className="text-gray-500">{order.customer.email}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[8px] sm:text-xs font-medium text-gray-900">
                            ${order.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[8px] sm:text-xs text-green-600">
                            ${order.platformFee.toFixed(2)}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                            <span className={`inline-flex px-1.5 py-0.5 text-[7px] sm:text-[8px] font-semibold rounded-full ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[7px] sm:text-[8px] text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">Resource Management</h3>
                  <Link
                    href="/admin/resources"
                    className="px-2.5 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-[8px] sm:text-xs"
                  >
                    Manage Resources
                  </Link>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2 sm:mb-3" />
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">Educational Resources</h4>
                  <p className="text-[8px] sm:text-xs text-gray-600 mb-2 leading-tight">
                    Add and manage educational resources for fashion designers including tutorials, guides, and tools.
                  </p>
                  <p className="text-[7px] sm:text-[8px] text-gray-500 mb-3 sm:mb-4 leading-tight">
                    Resources help users learn design fundamentals, color theory, technical drawing, and pattern making.
                  </p>
                  <Link
                    href="/admin/resources"
                    className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-[8px] sm:text-xs"
                  >
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Resource Manager
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Platform Earnings</h3>
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm font-medium text-green-900 mb-1 sm:mb-2">Commission</h4>
                      <p className="text-lg sm:text-2xl font-bold text-green-600">${stats.platformEarnings.toFixed(2)}</p>
                      <p className="text-[8px] sm:text-xs text-green-700">5% of sales</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">Total Volume</h4>
                      <p className="text-lg sm:text-2xl font-bold text-blue-600">${stats.totalRevenue.toFixed(2)}</p>
                      <p className="text-[8px] sm:text-xs text-blue-700">{stats.totalOrders} orders</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm font-medium text-purple-900 mb-1 sm:mb-2">Avg Order</h4>
                      <p className="text-lg sm:text-2xl font-bold text-purple-600">
                        ${stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-[8px] sm:text-xs text-purple-700">Per order</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contact' && (
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">Contact Messages</h3>
                  <div className="text-[8px] sm:text-xs text-gray-600">
                    {contactMessages.length} total
                  </div>
                </div>
                
                {selectedMessage ? (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 p-2 sm:p-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedMessage(null)}
                          className="text-indigo-600 hover:text-indigo-800 text-[8px] sm:text-xs font-medium whitespace-nowrap"
                        >
                          ← Back
                        </button>
                        <div className="flex space-x-1">
                          <select
                            title="Update message status"
                            aria-label="Update message status"
                            value={selectedMessage.status}
                            onChange={(e) => updateContactMessageStatus(selectedMessage.id, e.target.value)}
                            className="px-2 py-0.5 border border-gray-300 rounded text-[8px] sm:text-xs text-black"
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="p-2.5 sm:p-4">
                      <div className="mb-2 sm:mb-3">
                        <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-1">{selectedMessage.subject}</h4>
                          <span className={`px-1.5 py-0.5 text-[7px] sm:text-[8px] font-semibold rounded-full whitespace-nowrap ${
                            selectedMessage.priority === 'high' ? 'bg-red-100 text-red-800' :
                            selectedMessage.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedMessage.priority}
                          </span>
                        </div>
                        <div className="text-[7px] sm:text-[8px] text-gray-600 mb-2 sm:mb-3 space-y-0.5">
                          <div><strong>From:</strong> {selectedMessage.name} ({selectedMessage.email})</div>
                          <div><strong>Sent:</strong> {new Date(selectedMessage.createdAt).toLocaleString()}</div>
                          {selectedMessage.user && (
                            <div><strong>User:</strong> {selectedMessage.user.name} ({selectedMessage.user.email})</div>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                        <h5 className="font-medium text-gray-900 mb-1 text-[8px] sm:text-xs">Message:</h5>
                        <p className="text-gray-700 whitespace-pre-wrap text-[7px] sm:text-[8px]">{selectedMessage.message}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">From</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {contactMessages.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-2 sm:px-3 py-3 sm:py-4 text-center text-[8px] sm:text-xs text-gray-500">
                                No messages
                              </td>
                            </tr>
                          ) : (
                            contactMessages.map((message) => (
                              <tr key={message.id} className="hover:bg-gray-50">
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                                  <div className="text-[8px] sm:text-xs font-medium text-gray-900 truncate max-w-[60px] sm:max-w-xs">
                                    {message.subject}
                                  </div>
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                                  <div className="text-[7px] sm:text-[8px] text-gray-900 font-medium">{message.name}</div>
                                  <div className="text-[7px] sm:text-[8px] text-gray-500">{message.email}</div>
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                                  <span className={`inline-flex px-1 py-0.5 text-[7px] sm:text-[8px] font-semibold rounded-full ${
                                    message.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {message.priority}
                                  </span>
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                                  <span className={`inline-flex px-1 py-0.5 text-[7px] sm:text-[8px] font-semibold rounded-full ${
                                    message.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                                    message.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                    message.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {message.status}
                                  </span>
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[7px] sm:text-[8px] text-gray-500">
                                  {new Date(message.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[8px] sm:text-xs font-medium space-x-1">
                                  <button
                                    onClick={() => setSelectedMessage(message)}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    View
                                  </button>
                                  {message.status === 'OPEN' && (
                                    <button
                                      onClick={() => updateContactMessageStatus(message.id, 'IN_PROGRESS')}
                                      className="text-yellow-600 hover:text-yellow-900"
                                    >
                                      Start
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">Customer Care Chat</h3>
                  <div className="text-[8px] sm:text-xs text-gray-600">
                    {chatSessions.length} active
                  </div>
                </div>
                
                {selectedChatSession ? (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 p-2 sm:p-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedChatSession(null)
                            setChatMessages([])
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-[8px] sm:text-xs font-medium whitespace-nowrap"
                        >
                          ← Back
                        </button>
                        <div className="text-[8px] sm:text-xs text-gray-600 truncate">
                          <strong className="font-medium">{selectedChatSession.user.name || selectedChatSession.user.email}</strong>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-64 sm:h-80 overflow-y-auto p-2 sm:p-3 space-y-2">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] sm:max-w-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-xs ${
                            msg.isAdmin ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-900'
                          }`}>
                            <p>{msg.message}</p>
                            <p className={`text-[7px] mt-0.5 ${
                              msg.isAdmin ? 'text-indigo-100' : 'text-gray-500'
                            }`}>
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-200 p-2 sm:p-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Reply..."
                          className="flex-1 px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder-gray-500 text-[8px] sm:text-xs"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              sendChatReply(selectedChatSession.id)
                            }
                          }}
                        />
                        <button
                          onClick={() => sendChatReply(selectedChatSession.id)}
                          disabled={!replyMessage.trim()}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-[8px] sm:text-xs font-medium whitespace-nowrap"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Last Message</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Started</th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[7px] sm:text-[9px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {chatSessions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-2 sm:px-3 py-3 sm:py-4 text-center text-[8px] sm:text-xs text-gray-500">
                                No sessions
                              </td>
                            </tr>
                          ) : (
                            chatSessions.map((session) => (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                                  <div className="text-[8px] sm:text-xs font-medium text-gray-900">{session.user.name || 'Anon'}</div>
                                  <div className="text-[7px] sm:text-[8px] text-gray-500 truncate max-w-[60px]">{session.user.email}</div>
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[8px] sm:text-xs text-gray-900">
                                  {session._count.messages}
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[7px] sm:text-[8px] text-gray-500">
                                  {session.messages[0] ? (
                                    <div>
                                      <div className="truncate max-w-[80px] sm:max-w-xs">{session.messages[0].message}</div>
                                      <div className="text-[6px] sm:text-[7px] text-gray-400">
                                        {new Date(session.messages[0].createdAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                  ) : (
                                    'No messages'
                                  )}
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                                  <span className={`inline-flex px-1 py-0.5 text-[7px] sm:text-[8px] font-semibold rounded-full ${
                                    session.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                    session.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {session.status}
                                  </span>
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[7px] sm:text-[8px] text-gray-500">
                                  {new Date(session.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[8px] sm:text-xs font-medium">
                                  <button
                                    onClick={() => {
                                      setSelectedChatSession(session)
                                      fetchChatMessages(session.id)
                                    }}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    Join
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete User Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {deleteConfirm.step === 1 ? 'Confirm User Deletion' : 'Final Confirmation'}
            </h3>
            
            {deleteConfirm.step === 1 ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete the account for <strong>{deleteConfirm.userEmail}</strong>?
                </p>
                <p className="text-sm text-red-600 mb-6">
                  This action will permanently delete all user data, designs, and order history.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ ...deleteConfirm, step: 2 })}
                    className="flex-1 px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  <strong>FINAL WARNING:</strong> You are about to permanently delete {deleteConfirm.userEmail}'s account.
                </p>
                <p className="text-sm text-red-600 mb-6">
                  Type "DELETE" to confirm this irreversible action:
                </p>
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-4 text-black placeholder-gray-500"
                  id="delete-confirmation-input"
                  onChange={(e) => {
                    setDeleteConfirm(prev => prev ? {
                      ...prev,
                      inputValue: e.target.value
                    } : null);
                  }}
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    id="final-delete-btn"
                    onClick={confirmDeleteUser}
                    disabled={deleteConfirm?.inputValue?.toUpperCase() !== 'DELETE'}
                    className={`flex-1 px-4 py-2 text-white rounded transition-colors ${
                      deleteConfirm?.inputValue?.toUpperCase() === 'DELETE'
                        ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    DELETE ACCOUNT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Action Confirmation Dialog */}
      {adminConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {adminConfirm.step === 1 ? 'Confirm Admin Action' : 'Final Confirmation'}
            </h3>
            
            {adminConfirm.step === 1 ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to {adminConfirm.action === 'makeAdmin' ? 'grant admin privileges to' : 'remove admin privileges from'} <strong>{adminConfirm.userEmail}</strong>?
                </p>
                <p className="text-sm text-amber-600 mb-6">
                  {adminConfirm.action === 'makeAdmin' 
                    ? 'Admin users will have full platform access and management capabilities.'
                    : 'This user will lose all administrative privileges immediately.'
                  }
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setAdminConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setAdminConfirm({ ...adminConfirm, step: 2 })}
                    className="flex-1 px-4 py-2 text-white bg-amber-600 rounded hover:bg-amber-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  <strong>FINAL CONFIRMATION:</strong> You are about to {adminConfirm.action === 'makeAdmin' ? 'grant admin privileges to' : 'remove admin privileges from'} {adminConfirm.userEmail}.
                </p>
                <p className="text-sm text-amber-600 mb-6">
                  Type "CONFIRM" to proceed:
                </p>
                <input
                  type="text"
                  placeholder="Type CONFIRM to proceed"
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-4 text-black placeholder-gray-500"
                  onChange={(e) => {
                    const confirmBtn = document.getElementById('final-admin-btn') as HTMLButtonElement;
                    if (confirmBtn) {
                      confirmBtn.disabled = e.target.value !== 'CONFIRM';
                    }
                  }}
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => setAdminConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    id="final-admin-btn"
                    onClick={confirmAdminAction}
                    disabled={true}
                    className="flex-1 px-4 py-2 text-white bg-amber-600 rounded hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {adminConfirm.action === 'makeAdmin' ? 'GRANT ADMIN' : 'REMOVE ADMIN'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className={`rounded-lg p-4 shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {notification.type === 'success' ? (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-white hover:text-gray-200"
                title="Close notification"
                aria-label="Close notification"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}