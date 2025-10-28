'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  Edit, 
  Trash2, 
  Shield,
  UserCheck,
  UserX,
  Calendar,
  Search,
  Filter,
  Download,
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

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'designs' | 'orders' | 'resources' | 'contact' | 'chat' | 'earnings'>('overview')
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
  const [contactMessages, setContactMessages] = useState<any[]>([])
  const [chatSessions, setChatSessions] = useState<any[]>([])
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [selectedChatSession, setSelectedChatSession] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [replyMessage, setReplyMessage] = useState('')

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
      const [statsRes, usersRes, designsRes, ordersRes, contactRes, chatRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/designs'),
        fetch('/api/admin/orders'),
        fetch('/api/contact'),
        fetch('/api/customer-care/session')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your fashion marketplace platform</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-xs text-green-600">+{stats.recentSignups} this week</p>
                </div>
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Designs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDesigns}</p>
                  <p className="text-xs text-blue-600">{stats.activeUsers} active sellers</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-xs text-green-600">{stats.totalOrders} orders</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Platform Earnings (5%)</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.platformEarnings.toFixed(2)}</p>
                  <p className="text-xs text-purple-600">Commission earned</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'users', label: 'User Management', icon: Users },
                { id: 'designs', label: 'Design Management', icon: ShoppingBag },
                { id: 'orders', label: 'Order Management', icon: ShoppingBag },
                { id: 'resources', label: 'Resources', icon: BookOpen },
                { id: 'contact', label: 'Contact Messages', icon: Mail },
                { id: 'chat', label: 'Customer Care', icon: MessageCircle },
                { id: 'earnings', label: 'Earnings Report', icon: DollarSign }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customer.name} - {order.customer.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${order.totalAmount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <div className="flex space-x-4">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder-gray-500"
                      />
                    </div>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black"
                      title="Filter users by verification status"
                      aria-label="Filter users"
                    >
                      <option value="all">All Users</option>
                      <option value="verified">Verified</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name || 'No name'}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user._count.designs} designs, {user._count.orders} orders
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleUserAction(user.id, user.isVerified ? 'unverify' : 'verify')}
                                className={`p-1 rounded ${
                                  user.isVerified ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'
                                }`}
                                title={user.isVerified ? 'Unverify user' : 'Verify user'}
                              >
                                {user.isVerified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              {user.role !== 'ADMIN' && (
                                <button
                                  onClick={() => handleUserAction(user.id, 'makeAdmin')}
                                  className="p-1 rounded text-purple-600 hover:text-purple-800"
                                  title="Make admin"
                                >
                                  <Shield className="w-4 h-4" />
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
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Design Management</h3>
                  <div className="flex space-x-2">
                    <select
                      value={designFilter}
                      onChange={(e) => setDesignFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-black"
                      title="Filter designs by approval status"
                    >
                      <option value="all">All Designs</option>
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDesigns.map((design) => (
                    <div key={design.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="aspect-square relative">
                        <img
                          src={design.imageUrl}
                          alt={design.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `data:image/svg+xml,${encodeURIComponent(`
                              <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
                                <rect width="100%" height="100%" fill="#f3f4f6"/>
                                <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#6b7280" text-anchor="middle" dy=".3em">
                                  Fashion Design
                                </text>
                              </svg>
                            `)}`;
                          }}
                        />
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${
                          design.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          design.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {design.approvalStatus}
                        </div>
                        {!design.isActive && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                            <span className="text-white font-semibold">INACTIVE</span>
                          </div>
                        )}
                        {design.isOwned && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                            OWNED
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 truncate">{design.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">by {design.designer.name || design.designer.email}</p>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-bold text-indigo-600">${design.price.toFixed(2)}</span>
                          <span className="text-sm text-gray-500">{design.totalSales} sales</span>
                        </div>
                        {design.buyingTypes === 'BOTH' && design.ownershipPrice && (
                          <div className="mb-2">
                            <span className="text-sm text-purple-600 font-medium">
                              Ownership: ${design.ownershipPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mb-3">
                          Buying Type: {design.buyingTypes}
                        </div>
                        
                        {/* Approval Actions */}
                        {design.approvalStatus === 'PENDING' && (
                          <div className="flex space-x-2 mb-2">
                            <button
                              onClick={() => handleDesignApproval(design.id, 'approve')}
                              className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-800 hover:bg-green-200 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDesignApproval(design.id, 'reject')}
                              className="flex-1 px-3 py-1 text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <Link
                            href={`/designs/${design.id}?admin=true`}
                            className="px-3 py-1 text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-200 rounded flex items-center gap-1"
                            title="View full design details (admin access)"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Link>
                          <button
                            onClick={() => handleDesignAction(design.id, design.isActive ? 'deactivate' : 'activate')}
                            className={`flex-1 px-3 py-1 text-xs rounded ${
                              design.isActive 
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {design.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDesignAction(design.id, 'delete')}
                            className="px-3 py-1 text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Management</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Fee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{order.orderNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.customer.name} ({order.customer.email})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${order.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            ${order.platformFee.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Resource Management</h3>
                  <Link
                    href="/admin/resources"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Manage Resources
                  </Link>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Educational Resources</h4>
                  <p className="text-gray-600 mb-4">
                    Add and manage educational resources for fashion designers including tutorials, guides, tools, and references.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Resources help users learn design fundamentals, color theory, technical drawing, pattern making, and more.
                  </p>
                  <Link
                    href="/admin/resources"
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Go to Resource Manager
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Earnings Report</h3>
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-green-900">Total Commission Earned</h4>
                      <p className="text-3xl font-bold text-green-600">${stats.platformEarnings.toFixed(2)}</p>
                      <p className="text-sm text-green-700">5% of all sales</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-blue-900">Total Sales Volume</h4>
                      <p className="text-3xl font-bold text-blue-600">${stats.totalRevenue.toFixed(2)}</p>
                      <p className="text-sm text-blue-700">{stats.totalOrders} orders processed</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-purple-900">Average Order Value</h4>
                      <p className="text-3xl font-bold text-purple-600">
                        ${stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-sm text-purple-700">Per transaction</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contact' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Messages</h3>
                  <div className="text-sm text-gray-600">
                    {contactMessages.length} total messages
                  </div>
                </div>
                
                {selectedMessage ? (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedMessage(null)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          ← Back to messages
                        </button>
                        <div className="flex space-x-2">
                          <select
                            value={selectedMessage.status}
                            onChange={(e) => updateContactMessageStatus(selectedMessage.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm text-black"
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{selectedMessage.subject}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedMessage.priority === 'high' ? 'bg-red-100 text-red-800' :
                            selectedMessage.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedMessage.priority} priority
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          From: <strong>{selectedMessage.name}</strong> ({selectedMessage.email})
                          <br />
                          Sent: {new Date(selectedMessage.createdAt).toLocaleString()}
                          {selectedMessage.user && (
                            <><br />User Account: <strong>{selectedMessage.user.name}</strong> ({selectedMessage.user.email})</>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Message:</h5>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {contactMessages.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                No contact messages yet
                              </td>
                            </tr>
                          ) : (
                            contactMessages.map((message) => (
                              <tr key={message.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                    {message.subject}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{message.name}</div>
                                  <div className="text-sm text-gray-500">{message.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    message.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {message.priority}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    message.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                                    message.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                    message.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {message.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(message.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => setSelectedMessage(message)}
                                    className="text-indigo-600 hover:text-indigo-900 mr-3"
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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Care Chat Sessions</h3>
                  <div className="text-sm text-gray-600">
                    {chatSessions.length} active sessions
                  </div>
                </div>
                
                {selectedChatSession ? (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedChatSession(null)
                            setChatMessages([])
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          ← Back to chat sessions
                        </button>
                        <div className="text-sm text-gray-600">
                          Chat with: <strong>{selectedChatSession.user.name || selectedChatSession.user.email}</strong>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-96 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            msg.isAdmin ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-900'
                          }`}>
                            <p className="text-sm">{msg.message}</p>
                            <p className={`text-xs mt-1 ${
                              msg.isAdmin ? 'text-indigo-100' : 'text-gray-500'
                            }`}>
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-200 p-4">
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder-gray-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              sendChatReply(selectedChatSession.id)
                            }
                          }}
                        />
                        <button
                          onClick={() => sendChatReply(selectedChatSession.id)}
                          disabled={!replyMessage.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Message</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {chatSessions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                No active chat sessions
                              </td>
                            </tr>
                          ) : (
                            chatSessions.map((session) => (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{session.user.name || 'Anonymous'}</div>
                                  <div className="text-sm text-gray-500">{session.user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {session._count.messages} messages
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {session.messages[0] ? (
                                    <div>
                                      <div className="truncate max-w-xs">{session.messages[0].message}</div>
                                      <div className="text-xs text-gray-400">
                                        {new Date(session.messages[0].createdAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                  ) : (
                                    'No messages yet'
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    session.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                    session.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {session.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(session.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => {
                                      setSelectedChatSession(session)
                                      fetchChatMessages(session.id)
                                    }}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    Join Chat
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