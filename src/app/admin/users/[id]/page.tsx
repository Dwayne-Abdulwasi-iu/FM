'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  BadgeCheck,
  Package,
  ShoppingBag,
  Palette,
  MessageSquare,
  Send,
  ExternalLink,
  DollarSign,
  Star,
  Globe,
  Pencil,
  Trash2,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserDetails {
  id: string
  name: string | null
  displayName: string | null
  email: string
  phone: string
  image: string | null
  role: string
  isVerified: boolean
  verificationStatus: string
  designerTier: string | null
  totalSales: number
  totalEarnings: number
  avgRating: number
  trustScore: number
  bio: string | null
  location: string | null
  website: string | null
  createdAt: string
  acceptsCommissions: boolean
  commissionStatus: string
  sellerAccount: {
    bankName: string
    accountName: string
    accountNumber: string
    paystackSubaccountCode: string | null
    createdAt: string
  } | null
}

interface OrderItem {
  id: string
  price: number
  design?: {
    id: string
    title: string
  }
}

interface DesignOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  orderType: string
  paymentMethod: string | null
  createdAt: string
  paidAt: string | null
  customer: {
    id: string
    name: string | null
    email: string
  }
  items: OrderItem[]
}

interface BoutiqueOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  currency: string
  fulfillmentMethod: string
  paymentMethod: string | null
  trackingNumber: string | null
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  buyer: {
    id: string
    name: string | null
    email: string
  }
  product: {
    id: string
    title: string
  }
}

interface Commission {
  id: string
  status: string
  isPaid: boolean
  designerQuote: number | null
  title: string
  description: string
  createdAt: string
  completedAt: string | null
  requesterId: string
  requesterName: string
  requesterEmail: string
}

interface Message {
  id: string
  content: string
  createdAt: string
  readAt: string | null
  sender: {
    id: string
    name: string | null
    role: string
    image: string | null
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AdminUserDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'overview'
  
  const [user, setUser] = useState<UserDetails | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<{
    designs: DesignOrder[]
    pod: DesignOrder[]
    boutique: BoutiqueOrder[]
    commissions: Commission[]
  }>({ designs: [], pod: [], boutique: [], commissions: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Messaging state
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null)

  const fetchUserDetails = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${id}`)
      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setStats(data.stats)
        setOrders(data.orders)
      } else {
        toast.error(data.error || 'Failed to fetch user details')
        if (response.status === 404) {
          router.push('/admin/users')
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
      toast.error('Failed to fetch user details')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/users/${id}/message`)
      const data = await response.json()

      if (response.ok) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [id])

  useEffect(() => {
    fetchUserDetails()
  }, [fetchUserDetails])

  useEffect(() => {
    if (activeTab === 'message') {
      fetchMessages()
    }
  }, [activeTab, fetchMessages])

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    setSendingMessage(true)
    try {
      const response = await fetch(`/api/admin/users/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages([...messages, data.message])
        setNewMessage('')
        toast.success('Message sent')
      } else {
        toast.error(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleEditMessage = (msg: Message) => {
    setEditingMessage(msg)
    setEditContent(msg.content)
  }

  const saveMessageEdit = async () => {
    if (!editingMessage || !editContent.trim()) return

    setSavingEdit(true)
    try {
      const response = await fetch(`/api/admin/users/${id}/message`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messageId: editingMessage.id,
          content: editContent 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(messages.map(m => 
          m.id === editingMessage.id ? { ...m, content: editContent } : m
        ))
        setEditingMessage(null)
        toast.success('Message updated')
      } else {
        toast.error(data.error || 'Failed to update message')
      }
    } catch (error) {
      console.error('Error updating message:', error)
      toast.error('Failed to update message')
    } finally {
      setSavingEdit(false)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    setDeletingMessage(messageId)
    try {
      const response = await fetch(`/api/admin/users/${id}/message?messageId=${messageId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(messages.filter(m => m.id !== messageId))
        toast.success('Message deleted')
      } else {
        toast.error(data.error || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    } finally {
      setDeletingMessage(null)
    }
  }

  const getTierBadge = (tier: string | null) => {
    if (!tier) return null
    const colors: Record<string, string> = {
      'DESIGNER': 'bg-gray-100 text-gray-800',
      'GOLD_DESIGNER': 'bg-yellow-100 text-yellow-800',
      'VIP_DESIGNER': 'bg-purple-100 text-purple-800',
      'VVIP_DESIGNER': 'bg-indigo-100 text-indigo-800',
    }
    const labels: Record<string, string> = {
      'DESIGNER': 'Designer',
      'GOLD_DESIGNER': 'Gold Designer',
      'VIP_DESIGNER': 'VIP Designer',
      'VVIP_DESIGNER': 'VVIP Designer',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${colors[tier] || 'bg-gray-100'}`}>
        {labels[tier] || tier}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-green-100 text-green-800',
      'PROCESSING': 'bg-blue-100 text-blue-800',
      'SHIPPED': 'bg-purple-100 text-purple-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'REFUNDED': 'bg-gray-100 text-gray-800',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'REVISION': 'bg-orange-100 text-orange-800',
      'ACCEPTED': 'bg-green-100 text-green-800',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 py-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/4 mb-4 sm:mb-6"></div>
          <div className="h-48 sm:h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-3 py-4 sm:p-6">
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-gray-900">User not found</p>
          <Link href="/admin/users" className="text-sm sm:text-base text-indigo-600 hover:underline mt-2 inline-block">
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'designs', label: `Design Orders (${stats.totalDesignOrders || 0})` },
    { id: 'pod', label: `POD Orders (${stats.totalPodOrders || 0})` },
    { id: 'boutique', label: `Boutique (${stats.totalBoutiqueOrders || 0})` },
    { id: 'commissions', label: `Commissions (${stats.totalCommissions || 0})` },
    { id: 'message', label: 'Message' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => router.push('/admin/users')}
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-900 hover:text-indigo-600 mb-3 sm:mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Back to Users
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                {user.image ? (
                  <img src={user.image} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover" />
                ) : (
                  <span className="text-lg sm:text-2xl font-bold text-indigo-600">
                    {(user.name || user.email)[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-base sm:text-2xl font-bold text-gray-900 truncate">
                    {user.name || user.displayName || 'Unknown User'}
                  </h1>
                  {user.isVerified && <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />}
                  {user.role === 'ADMIN' && (
                    <span className="text-[10px] sm:text-xs bg-red-100 text-red-800 px-1.5 sm:px-2 py-0.5 rounded">Admin</span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-4 mt-1 flex-wrap">
                  {getTierBadge(user.designerTier)}
                  {user.acceptsCommissions && (
                    <span className={`text-[10px] sm:text-xs ${user.commissionStatus === 'OPEN' ? 'text-green-600' : 'text-gray-900'}`}>
                      Commissions: {user.commissionStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right flex sm:block items-center gap-3 sm:gap-0 border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">₦{user.totalEarnings.toLocaleString()}</div>
              <div className="text-xs sm:text-sm text-gray-900">{user.totalSales} total sales</div>
              {user.avgRating > 0 && (
                <div className="flex items-center sm:justify-end gap-1 mt-0.5 sm:mt-1">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs sm:text-sm text-gray-900">{user.avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-3 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-900">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-900">
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{user.phone}</span>
            </div>
            {user.location && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-gray-900">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">{user.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-900">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            {user.website && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-gray-900">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-indigo-600 hover:underline truncate">
                  {user.website}
                </a>
              </div>
            )}
          </div>

          {/* Bank Details (if seller) */}
          {user.sellerAccount && (
            <div className="mt-3 sm:mt-4 p-2.5 sm:p-4 bg-gray-50 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">Bank Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-4 text-xs sm:text-sm">
                <div className="text-gray-900">
                  <span className="text-gray-600">Bank:</span> {user.sellerAccount.bankName}
                </div>
                <div className="text-gray-900">
                  <span className="text-gray-600">Account:</span> {user.sellerAccount.accountNumber}
                </div>
                <div className="text-gray-900">
                  <span className="text-gray-600">Name:</span> {user.sellerAccount.accountName}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6">
        <nav className="flex gap-1 sm:gap-4 overflow-x-auto pb-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-900 hover:text-indigo-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6">
              <div className="bg-indigo-50 rounded-lg p-2.5 sm:p-4 text-center">
                <Palette className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-indigo-600" />
                <div className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalDesigns}</div>
                <div className="text-xs sm:text-sm text-gray-900">Designs</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2.5 sm:p-4 text-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-green-600" />
                <div className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalBoutiqueProducts}</div>
                <div className="text-xs sm:text-sm text-gray-900">Boutique</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2.5 sm:p-4 text-center">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-blue-600" />
                <div className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {(stats.totalDesignOrders || 0) + (stats.totalPodOrders || 0) + (stats.totalBoutiqueOrders || 0)}
                </div>
                <div className="text-xs sm:text-sm text-gray-900">Orders</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-2.5 sm:p-4 text-center">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-purple-600" />
                <div className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">₦{user.totalEarnings.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-gray-900">Earnings</div>
              </div>
            </div>

            {user.bio && (
              <div className="mt-4 sm:mt-6">
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">Bio</h3>
                <p className="text-xs sm:text-sm text-gray-900">{user.bio}</p>
              </div>
            )}
          </div>
        )}

        {/* Design Orders Tab */}
        {activeTab === 'designs' && (
          <div className="overflow-x-auto">
            {orders.designs.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs sm:text-sm text-gray-900">No design orders yet</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs sm:text-sm text-gray-900">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Order #</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Customer</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">Items</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Amount</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Status</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.designs.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className="font-mono text-[10px] sm:text-sm text-gray-900">{order.orderNumber}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{order.customer.name || 'Unknown'}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 truncate max-w-[100px] sm:max-w-none">{order.customer.email}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                        <span className="truncate block max-w-[150px]">{order.items.map(item => item.design?.title).join(', ')}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm text-gray-900">₦{order.totalAmount.toLocaleString()}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* POD Orders Tab */}
        {activeTab === 'pod' && (
          <div className="overflow-x-auto">
            {orders.pod.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs sm:text-sm text-gray-900">No POD orders yet</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs sm:text-sm text-gray-900">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Order #</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Customer</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">Product</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Amount</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Status</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.pod.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className="font-mono text-[10px] sm:text-sm text-gray-900">{order.orderNumber}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{order.customer.name || 'Unknown'}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 truncate max-w-[100px] sm:max-w-none">{order.customer.email}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                        <span className="truncate block max-w-[150px]">{order.items.map(item => item.design?.title).join(', ')}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm text-gray-900">₦{order.totalAmount.toLocaleString()}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Boutique Orders Tab */}
        {activeTab === 'boutique' && (
          <div className="overflow-x-auto">
            {orders.boutique.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs sm:text-sm text-gray-900">No boutique orders yet</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs sm:text-sm text-gray-900">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Order #</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Buyer</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">Product</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Amount</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Status</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">Tracking</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.boutique.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className="font-mono text-[10px] sm:text-sm text-gray-900">{order.orderNumber}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{order.buyer.name || 'Unknown'}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 truncate max-w-[100px] sm:max-w-none">{order.buyer.email}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                        <span className="truncate block max-w-[150px]">{order.product.title}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm text-gray-900">
                        {order.currency === 'NGN' ? '₦' : '$'}{order.total.toLocaleString()}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                        {order.trackingNumber || '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <div className="overflow-x-auto">
            {orders.commissions.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs sm:text-sm text-gray-900">No commissions yet</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs sm:text-sm text-gray-900">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">ID</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Client</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">Title</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Quote</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3">Status</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">Paid</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.commissions.map(commission => (
                    <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className="font-mono text-[10px] sm:text-sm text-gray-900">{commission.id.slice(-8)}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{commission.requesterName || 'Unknown'}</div>
                        <div className="text-[10px] sm:text-xs text-gray-600 truncate max-w-[100px] sm:max-w-none">{commission.requesterEmail}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 max-w-xs truncate hidden sm:table-cell">{commission.title}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm text-gray-900">
                        {commission.designerQuote ? `₦${commission.designerQuote.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">{getStatusBadge(commission.status)}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
                        {commission.isPaid ? (
                          <span className="text-green-600 text-[10px] sm:text-sm">✓ Paid</span>
                        ) : (
                          <span className="text-gray-400 text-[10px] sm:text-sm">Unpaid</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Message Tab */}
        {activeTab === 'message' && (
          <div className="flex flex-col h-[350px] sm:h-[500px]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-900 py-8 sm:py-12">
                  <MessageSquare className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3 sm:mb-4" />
                  <p className="text-xs sm:text-sm">No messages yet. Start a conversation with this user.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender.role === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="group relative">
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-2 sm:p-3 ${
                          msg.sender.role === 'ADMIN'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-xs sm:text-sm">{msg.content}</p>
                        <p className={`text-[10px] sm:text-xs mt-1 ${msg.sender.role === 'ADMIN' ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {/* Edit/Delete buttons for admin messages */}
                      {msg.sender.role === 'ADMIN' && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => handleEditMessage(msg)}
                            className="p-1 bg-white rounded-full shadow-md text-gray-600 hover:text-indigo-600"
                            title="Edit message"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingMessage === msg.id}
                            className="p-1 bg-white rounded-full shadow-md text-gray-600 hover:text-red-600 disabled:opacity-50"
                            title="Delete message"
                          >
                            {deletingMessage === msg.id ? (
                              <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-3 sm:p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-gray-900"
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{sendingMessage ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Message Modal */}
        {editingMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Edit Message</h3>
                <button
                  onClick={() => setEditingMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="p-3 sm:p-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-xs sm:text-sm text-gray-900"
                  placeholder="Enter message..."
                />
              </div>
              <div className="p-3 sm:p-4 border-t border-gray-200 flex gap-2 sm:gap-3">
                <button
                  onClick={() => setEditingMessage(null)}
                  className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMessageEdit}
                  disabled={savingEdit || !editContent.trim()}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  {savingEdit ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
