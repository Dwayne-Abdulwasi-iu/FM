'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { sanitizeHtml } from '@/lib/sanitize'
import { 
  ArrowLeft, 
  Megaphone, 
  Mail, 
  Bell, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Broadcast {
  id: string
  subject: string
  content: string
  targetType: string
  targetTier: string | null
  recipientCount: number
  deliveredCount: number
  readCount: number
  sendViaEmail: boolean
  sendViaInApp: boolean
  status: string
  sentAt: string | null
  createdAt: string
  admin: {
    id: string
    name: string
    email: string
  }
  _count: {
    recipients: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const TARGET_LABELS: Record<string, string> = {
  'ALL': 'All Users',
  'USERS': 'Buyers Only',
  'SELLERS': 'All Sellers',
  'DESIGNERS': 'Design Sellers',
  'TIER_SPECIFIC': 'Specific Tier',
  'VERIFIED_ONLY': 'Verified Only',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  'SENT': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  'DRAFT': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  'FAILED': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
}

export default function BroadcastHistoryPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null)
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      const response = await fetch(`/api/admin/broadcast?${params}`)
      const data = await response.json()

      if (response.ok) {
        setBroadcasts(data.broadcasts)
        setPagination(prev => ({ ...prev, ...data.pagination }))
      } else {
        toast.error(data.error || 'Failed to fetch broadcasts')
      }
    } catch (error) {
      console.error('Error fetching broadcasts:', error)
      toast.error('Failed to fetch broadcasts')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit])

  const handleEdit = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast)
    setEditSubject(broadcast.subject)
    setEditContent(broadcast.content)
  }

  const handleSaveEdit = async () => {
    if (!editingBroadcast) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId: editingBroadcast.id,
          subject: editSubject,
          content: editContent,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Broadcast updated successfully')
        setEditingBroadcast(null)
        fetchBroadcasts()
      } else {
        toast.error(data.error || 'Failed to update broadcast')
      }
    } catch (error) {
      console.error('Error updating broadcast:', error)
      toast.error('Failed to update broadcast')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to delete this broadcast? This will also remove it from all recipients\' updates.')) {
      return
    }

    setDeleting(broadcastId)
    try {
      const response = await fetch(`/api/admin/broadcast?id=${broadcastId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Broadcast deleted successfully')
        fetchBroadcasts()
      } else {
        toast.error(data.error || 'Failed to delete broadcast')
      }
    } catch (error) {
      console.error('Error deleting broadcast:', error)
      toast.error('Failed to delete broadcast')
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    fetchBroadcasts()
  }, [fetchBroadcasts])

  const filteredBroadcasts = broadcasts.filter(b => 
    !search || 
    b.subject.toLowerCase().includes(search.toLowerCase()) ||
    b.content.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not sent'
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReadRate = (broadcast: Broadcast) => {
    if (broadcast.recipientCount === 0) return 0
    return Math.round((broadcast.readCount / broadcast.recipientCount) * 100)
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/admin/users" className="text-gray-900 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Broadcast History</h1>
            <p className="text-xs sm:text-sm text-gray-900">View all sent broadcasts and their performance</p>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="flex items-center justify-center gap-1.5 sm:gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 transition text-xs sm:text-sm"
        >
          <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          New Broadcast
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search broadcasts by subject or content..."
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-gray-900"
          />
        </div>
      </div>

      {/* Broadcasts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 sm:p-8 md:p-12 text-center">
            <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-900 mt-3 sm:mt-4 text-xs sm:text-sm">Loading broadcasts...</p>
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div className="p-6 sm:p-8 md:p-12 text-center">
            <Megaphone className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto text-gray-300 mb-2 sm:mb-4" />
            <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No broadcasts yet</h3>
            <p className="text-gray-900 mb-3 sm:mb-4 text-xs sm:text-sm">Send your first broadcast to communicate with users.</p>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 text-xs sm:text-sm"
            >
              <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Create Broadcast
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase">Subject</th>
                  <th className="hidden md:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase">Target</th>
                  <th className="hidden lg:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase">Channels</th>
                  <th className="hidden sm:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase">Recipients</th>
                  <th className="hidden sm:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase">Read Rate</th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase">Status</th>
                  <th className="hidden md:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-900 uppercase">Sent</th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-900 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBroadcasts.map((broadcast) => {
                  const statusStyle = STATUS_STYLES[broadcast.status] || STATUS_STYLES['DRAFT']
                  const StatusIcon = statusStyle.icon

                  return (
                    <tr key={broadcast.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                        <div className="font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px] text-xs sm:text-sm">
                          {broadcast.subject}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                        <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-900">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden lg:inline">{TARGET_LABELS[broadcast.targetType] || broadcast.targetType}</span>
                          <span className="lg:hidden">{broadcast.targetType}</span>
                          {broadcast.targetTier && (
                            <span className="text-[10px] sm:text-xs text-gray-600">({broadcast.targetTier})</span>
                          )}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                        <div className="flex gap-1 sm:gap-2">
                          {broadcast.sendViaInApp && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded text-[10px] sm:text-xs">
                              <Bell className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden xl:inline">In-App</span>
                            </span>
                          )}
                          {broadcast.sendViaEmail && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-50 text-green-700 rounded text-[10px] sm:text-xs">
                              <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden xl:inline">Email</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-gray-900">
                        {broadcast.recipientCount.toLocaleString()}
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="flex-1 h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden max-w-[40px] sm:max-w-[60px]">
                            <div 
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${getReadRate(broadcast)}%` }}
                            />
                          </div>
                          <span className="text-[10px] sm:text-xs md:text-sm text-gray-900">{getReadRate(broadcast)}%</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                        <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {broadcast.status}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-[10px] sm:text-xs md:text-sm text-gray-900">
                        {formatDate(broadcast.sentAt)}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => setSelectedBroadcast(broadcast)}
                            className="text-indigo-600 hover:text-indigo-800 p-1"
                            title="View details"
                          >
                            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(broadcast)}
                            className="text-gray-600 hover:text-gray-800 p-1"
                            title="Edit broadcast"
                          >
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(broadcast.id)}
                            disabled={deleting === broadcast.id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1"
                            title="Delete broadcast"
                          >
                            {deleting === broadcast.id ? (
                              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                <div className="text-[10px] sm:text-xs md:text-sm text-gray-900">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 sm:p-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <span className="text-[10px] sm:text-xs md:text-sm text-gray-900">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                    className="p-1.5 sm:p-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Broadcast Detail Modal */}
      {selectedBroadcast && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">{selectedBroadcast.subject}</h2>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-900 mt-0.5 sm:mt-1">
                    Sent by {selectedBroadcast.admin.name} • {formatDate(selectedBroadcast.sentAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBroadcast(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl leading-none flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 md:p-4 text-center">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{selectedBroadcast.recipientCount}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-900">Recipients</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 md:p-4 text-center">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{selectedBroadcast.deliveredCount}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-900">Delivered</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 md:p-4 text-center">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600">{getReadRate(selectedBroadcast)}%</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-900">Read Rate</div>
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">Message Content:</h4>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-gray-900 text-xs sm:text-sm" 
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedBroadcast.content.replace(/\n/g, '<br>')) }}
                />
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="w-full py-1.5 sm:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium text-xs sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Broadcast Modal */}
      {editingBroadcast && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Edit Broadcast</h2>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-900 mt-0.5 sm:mt-1">
                    Update the subject or content of this broadcast
                  </p>
                </div>
                <button
                  onClick={() => setEditingBroadcast(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-gray-900"
                  placeholder="Enter subject..."
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1">Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-xs sm:text-sm text-gray-900"
                  placeholder="Enter message content..."
                />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-900">
                Note: This will update the broadcast for all recipients who haven&apos;t read it yet.
              </p>
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 flex gap-2 sm:gap-3">
              <button
                onClick={() => setEditingBroadcast(null)}
                className="flex-1 py-1.5 sm:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editSubject.trim() || !editContent.trim()}
                className="flex-1 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
  )
}
