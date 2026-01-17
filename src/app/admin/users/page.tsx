'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  Users, 
  User as UserIcon, 
  Mail, 
  MessageSquare, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Megaphone,
  BadgeCheck,
  Phone,
  ShoppingBag,
  Package
} from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string | null
  email: string
  phone: string
  displayName: string | null
  image: string | null
  role: string
  isVerified: boolean
  designerTier: string | null
  totalSales: number
  totalEarnings: number
  createdAt: string
  isSeller: boolean
  designCount: number
  orderCount: number
  boutiqueProductCount: number
  boutiqueOrderCount: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const USER_TYPES = [
  { value: 'all', label: 'All Users' },
  { value: 'users', label: 'Buyers Only' },
  { value: 'sellers', label: 'All Sellers' },
  { value: 'designers', label: 'Design Sellers' },
  { value: 'boutique_sellers', label: 'Boutique Sellers' },
]

const DESIGNER_TIERS = [
  { value: '', label: 'All Tiers' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'GOLD_DESIGNER', label: 'Gold Designer' },
  { value: 'VIP_DESIGNER', label: 'VIP Designer' },
  { value: 'VVIP_DESIGNER', label: 'VVIP Designer' },
]

const VERIFICATION_STATUS = [
  { value: '', label: 'All Status' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
]

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [type, setType] = useState('all')
  const [tier, setTier] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        orderId: orderSearch,
        type,
        tier,
        status,
      })

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
        setPagination(prev => ({ ...prev, ...data.pagination }))
      } else {
        toast.error(data.error || 'Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, orderSearch, type, tier, status])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchUsers()
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
      'GOLD_DESIGNER': 'Gold',
      'VIP_DESIGNER': 'VIP',
      'VVIP_DESIGNER': 'VVIP',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[tier] || 'bg-gray-100'}`}>
        {labels[tier] || tier}
      </span>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users, search by name or order ID, and send messages</p>
        </div>
        <button
          onClick={() => setShowBroadcast(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Megaphone className="w-4 h-4" />
          Broadcast Message
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name/Email Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or username..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Order ID Search */}
            <div className="relative">
              <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by order ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Search
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label htmlFor="userTypeFilter" className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                <select
                  id="userTypeFilter"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {USER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="designerTierFilter" className="block text-sm font-medium text-gray-700 mb-1">Designer Tier</label>
                <select
                  id="designerTierFilter"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {DESIGNER_TIERS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="verificationFilter" className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
                <select
                  id="verificationFilter"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {VERIFICATION_STATUS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">{pagination.total} Users</span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Stats</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {user.name || user.displayName || 'Unknown'}
                            </span>
                            {user.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getTierBadge(user.designerTier)}
                            {user.role === 'ADMIN' && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Admin</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {user.isSeller ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Package className="w-4 h-4" />
                            Seller
                          </div>
                        ) : (
                          <span className="text-gray-500">Buyer</span>
                        )}
                        <div className="text-xs text-gray-500 mt-0.5">
                          {user.designCount > 0 && `${user.designCount} designs`}
                          {user.designCount > 0 && user.boutiqueProductCount > 0 && ', '}
                          {user.boutiqueProductCount > 0 && `${user.boutiqueProductCount} products`}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="text-gray-900">₦{user.totalEarnings.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{user.totalSales} sales</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="View Details"
                        >
                          <UserIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}?tab=message`)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Send Message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <BroadcastModal onClose={() => setShowBroadcast(false)} />
      )}
    </div>
  )
}

// Broadcast Modal Component
function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [targetType, setTargetType] = useState('ALL')
  const [targetTier, setTargetTier] = useState('')
  const [sendViaEmail, setSendViaEmail] = useState(true)
  const [sendViaInApp, setSendViaInApp] = useState(true)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ count: number; sampleUsers: { name: string; email: string }[] } | null>(null)

  const TARGET_TYPES = [
    { value: 'ALL', label: 'All Users' },
    { value: 'USERS', label: 'Buyers Only (No uploads)' },
    { value: 'SELLERS', label: 'All Sellers' },
    { value: 'DESIGNERS', label: 'Design Sellers' },
    { value: 'TIER_SPECIFIC', label: 'Specific Tier' },
    { value: 'VERIFIED_ONLY', label: 'Verified Users Only' },
  ]

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetType, targetTier }),
        })
        const data = await response.json()
        if (response.ok) {
          setPreview({ count: data.count, sampleUsers: data.sampleUsers })
        }
      } catch (error) {
        console.error('Error fetching preview:', error)
      }
    }
    fetchPreview()
  }, [targetType, targetTier])

  const handleSend = async () => {
    if (!subject || !content) {
      toast.error('Subject and content are required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          content,
          targetType,
          targetTier: targetType === 'TIER_SPECIFIC' ? targetTier : null,
          sendViaEmail,
          sendViaInApp,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        onClose()
      } else {
        toast.error(data.error || 'Failed to send broadcast')
      }
    } catch (error) {
      console.error('Error sending broadcast:', error)
      toast.error('Failed to send broadcast')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Broadcast Message</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Target Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <select
                id="targetAudience"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {TARGET_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {targetType === 'TIER_SPECIFIC' && (
              <div>
                <label htmlFor="targetTier" className="block text-sm font-medium text-gray-700 mb-1">Designer Tier</label>
                <select
                  id="targetTier"
                  value={targetTier}
                  onChange={(e) => setTargetTier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select tier...</option>
                  <option value="DESIGNER">Designer</option>
                  <option value="GOLD_DESIGNER">Gold Designer</option>
                  <option value="VIP_DESIGNER">VIP Designer</option>
                  <option value="VVIP_DESIGNER">VVIP Designer</option>
                </select>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm text-indigo-800">
                <strong>{preview.count}</strong> users will receive this message
              </p>
              {preview.sampleUsers.length > 0 && (
                <p className="text-xs text-indigo-600 mt-1">
                  Including: {preview.sampleUsers.map(u => u.name || u.email).join(', ')}
                  {preview.count > 5 && ` and ${preview.count - 5} more...`}
                </p>
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your message..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Delivery Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendViaInApp}
                onChange={(e) => setSendViaInApp(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">In-App Notification</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendViaEmail}
                onChange={(e) => setSendViaEmail(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Email</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !subject || !content}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Sending...' : (
              <>
                <Megaphone className="w-4 h-4" />
                Send Broadcast
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
