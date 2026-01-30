'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, FileText, Eye } from 'lucide-react'

interface ContentItem {
  id: string
  title: string
  type: 'DESIGN' | 'BOUTIQUE_PRODUCT'
  seller: {
    id: string
    name: string
    email: string
  }
  content: {
    image: string
    description: string
    category: string
  }
  submittedAt: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  metadata: {
    resolution: string
    fileSize: number
    colors: string[]
  }
}

export default function AdminContentReviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    if (status !== 'authenticated') return

    fetchPendingContent()
  }, [status, session, router, filter])

  const fetchPendingContent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/content-review?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedItem) return

    try {
      setReviewing(true)
      const response = await fetch(`/api/admin/content-review/${selectedItem.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: reviewComment }),
      })

      if (response.ok) {
        setReviewComment('')
        setSelectedItem(null)
        await fetchPendingContent()
      }
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setReviewing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedItem || !reviewComment.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      setReviewing(true)
      const response = await fetch(`/api/admin/content-review/${selectedItem.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reviewComment }),
      })

      if (response.ok) {
        setReviewComment('')
        setSelectedItem(null)
        await fetchPendingContent()
      }
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setReviewing(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading content for review...</div>
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600">Access Denied</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Review</h1>
            <p className="text-gray-600 mt-1">Approve or reject submitted designs and products</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                  filter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status === 'pending' && ` (${items.filter(i => i.status === 'PENDING_REVIEW').length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content List */}
          <div className="lg:col-span-2">
            {items.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No content to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition ${
                      selectedItem?.id === item.id ? 'ring-2 ring-indigo-600' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                        {item.content.image && (
                          <div className="w-full h-full bg-gray-100" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 line-clamp-1">{item.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{item.seller.name}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            item.status === 'PENDING_REVIEW'
                              ? 'bg-yellow-100 text-yellow-800'
                              : item.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.status === 'PENDING_REVIEW' ? '⏳ Pending' : item.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{item.content.category}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Panel */}
          <div>
            {selectedItem ? (
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Review Content
                </h2>

                {/* Content Details */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="aspect-square bg-gray-200 rounded-lg mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedItem.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{selectedItem.content.description}</p>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{selectedItem.type.replace(/_/g, ' ')}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Category:</span>
                      <span className="ml-2 font-medium">{selectedItem.content.category}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Seller:</span>
                      <span className="ml-2 font-medium">{selectedItem.seller.name}</span>
                    </p>
                    <p>
                      <span className="text-gray-600">Resolution:</span>
                      <span className="ml-2 font-medium">{selectedItem.metadata.resolution}</span>
                    </p>
                  </div>
                </div>

                {/* Review Actions */}
                {selectedItem.status === 'PENDING_REVIEW' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Review Comment (Required for rejection)
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Enter review notes or rejection reason..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white"
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={handleApprove}
                        disabled={reviewing}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={reviewing}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </>
                )}

                {selectedItem.status === 'APPROVED' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      This content has been approved
                    </p>
                  </div>
                )}

                {selectedItem.status === 'REJECTED' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      This content has been rejected
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select content to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
