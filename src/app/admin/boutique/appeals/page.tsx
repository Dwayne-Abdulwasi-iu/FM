'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

interface SessionUser {
  id?: string
  role?: string
  email?: string
  name?: string
}

interface Appeal {
  id: string
  type: 'discrepancy' | 'dispute'
  reason?: string
  status?: string
  appealStatus?: string
  originalDisputeNumber?: string
  resolutionAction?: string
  resolutionNotes?: string
  createdAt: string
  resolvedAt?: string
  submittedAt?: string
  appealTitle: string
  sellerName: string
  sellerEmail: string
  decision?: {
    discrepancy: {
      variant: {
        product: {
          title: string
        }
        size?: string
        color?: string
      }
      shipment: {
        id: string
        seller: {
          name: string
          email: string
        }
      }
    }
  }
  seller?: {
    id: string
    name: string
    email: string
  }
}

export default function AdminAppealsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolutionForm, setResolutionForm] = useState({
    appealStatus: 'PENDING',
    resolutionAction: '',
    resolutionNotes: '',
  })

  const fetchAppeals = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        status: statusFilter,
        sort: sortBy,
      })

      const res = await fetch(`/api/boutique/admin/appeals?${queryParams}`, {
        cache: 'force-cache',
      })

      if (res.ok) {
        const data = await res.json()
        setAppeals(data.appeals || [])
      } else {
        toast.error('Failed to load appeals')
      }
    } catch (error) {
      console.error('Error fetching appeals:', error)
      toast.error('Error loading appeals')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sortBy])

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    void fetchAppeals()
  }, [session, status, fetchAppeals, router])

  const getDaysOld = (createdAt: string) => {
    const days = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000)
    )
    return days
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'RESOLVED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleResolveAppeal = async () => {
    if (!selectedAppeal) return

    if (
      resolutionForm.appealStatus !== 'PENDING' &&
      !resolutionForm.resolutionAction
    ) {
      toast.error('Please select a resolution action')
      return
    }

    setResolving(true)
    try {
      const res = await fetch(
        `/api/boutique/admin/appeals/${selectedAppeal.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resolutionForm),
        }
      )

      if (res.ok) {
        toast.success('Appeal resolved successfully')
        setSelectedAppeal(null)
        setResolutionForm({
          appealStatus: 'PENDING',
          resolutionAction: '',
          resolutionNotes: '',
        })
        await fetchAppeals()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to resolve appeal')
      }
    } catch (error) {
      console.error('Error resolving appeal:', error)
      toast.error('Error resolving appeal')
    } finally {
      setResolving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'PENDING':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return null
    }
  }

  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
          <Link href="/admin/boutique" className="p-2 hover:bg-gray-200 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Seller Appeals</h1>
            <p className="text-xs sm:text-sm text-black mt-1">Review and resolve seller appeals</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-xs sm:text-sm font-medium text-black mb-1 sm:mb-2">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg bg-white text-black text-xs sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div>
              <label htmlFor="sort-by" className="block text-xs sm:text-sm font-medium text-black mb-1 sm:mb-2">
                Sort By
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg bg-white text-black text-xs sm:text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchAppeals}
                disabled={loading}
                className="w-full px-3 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-xs sm:text-sm font-medium"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Appeals List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading appeals...</p>
          </div>
        ) : appeals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No appeals found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="bg-white rounded-lg shadow-sm p-2 sm:p-4 hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-3 mb-2">
                      {getStatusIcon((appeal.appealStatus || appeal.status) ?? 'PENDING')}
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium ${getStatusColor((appeal.appealStatus || appeal.status) ?? 'PENDING')}`}>
                        {appeal.appealStatus || appeal.status || 'PENDING'}
                      </span>
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium bg-gray-200 text-black">
                        {appeal.type === 'discrepancy' ? 'Warehouse' : 'Dispute'}
                      </span>
                      <span className="text-xs text-black">
                        {getDaysOld(appeal.createdAt)}d
                      </span>
                    </div>

                    <h3 className="font-semibold text-black mb-1 text-sm sm:text-base truncate">
                      {appeal.appealTitle}
                    </h3>

                    <p className="text-xs sm:text-sm text-black mb-1 sm:mb-2 break-words">
                      <span className="font-medium">Seller:</span> {appeal.sellerName}
                    </p>

                    <p className="text-xs text-black mb-1 truncate">
                      {appeal.sellerEmail}
                    </p>

                    {appeal.reason && (
                      <p className="text-xs sm:text-sm text-black mb-2 line-clamp-2">
                        <span className="font-medium">Reason:</span> {appeal.reason}
                      </p>
                    )}

                    {appeal.resolutionNotes && (
                      <p className="text-xs text-black mb-1 line-clamp-1">
                        <span className="font-medium">Notes:</span> {appeal.resolutionNotes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedAppeal(appeal)
                      setResolutionForm({
                        appealStatus: appeal.appealStatus || appeal.status || 'PENDING',
                        resolutionAction: appeal.resolutionAction || '',
                        resolutionNotes: appeal.resolutionNotes || '',
                      })
                    }}
                    className="px-2 sm:px-4 py-1 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap text-xs sm:text-sm font-medium flex-shrink-0"
                  >
                    {appeal.appealStatus === 'PENDING' ? 'Review' : 'View'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-xl font-bold text-black">Resolve Appeal</h2>
                <button
                  onClick={() => setSelectedAppeal(null)}
                  className="text-black hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Appeal Details */}
              <div>
                <h3 className="font-semibold text-black text-sm sm:text-base mb-2">Appeal Details</h3>
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 space-y-1 text-xs sm:text-sm break-words">
                  <p className="text-black">
                    <span className="font-medium">Type:</span>{' '}
                    {selectedAppeal.type === 'discrepancy' ? 'Warehouse' : 'Dispute'}
                  </p>
                  <p className="text-black truncate">
                    <span className="font-medium">Title:</span> {selectedAppeal.appealTitle}
                  </p>
                  <p className="text-black">
                    <span className="font-medium">Seller:</span> {selectedAppeal.sellerName}
                  </p>
                  <p className="text-black truncate">
                    <span className="font-medium">Email:</span> {selectedAppeal.sellerEmail}
                  </p>
                  <p className="text-black">
                    <span className="font-medium">Submitted:</span> {new Date(selectedAppeal.createdAt).toLocaleDateString()}
                  </p>
                  {selectedAppeal.reason && (
                    <p className="text-black line-clamp-2">
                      <span className="font-medium">Reason:</span> {selectedAppeal.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Resolution Form */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-semibold text-black text-sm sm:text-base">Resolution</h3>

                <div>
                  <label htmlFor="appeal-status" className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Status
                  </label>
                  <select
                    id="appeal-status"
                    value={resolutionForm.appealStatus}
                    onChange={(e) =>
                      setResolutionForm({
                        ...resolutionForm,
                        appealStatus: e.target.value,
                      })
                    }
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg bg-white text-black text-xs sm:text-sm"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>

                {resolutionForm.appealStatus !== 'PENDING' && (
                  <div>
                    <label htmlFor="resolution-action" className="block text-xs sm:text-sm font-medium text-black mb-1">
                      Resolution Action *
                    </label>
                    <select
                      id="resolution-action"
                      value={resolutionForm.resolutionAction}
                      onChange={(e) =>
                        setResolutionForm({
                          ...resolutionForm,
                          resolutionAction: e.target.value,
                        })
                      }
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg bg-white text-black text-xs sm:text-sm"
                    >
                      <option value="">Select action</option>
                      <option value="OVERTURN_DECISION">Overturn Decision</option>
                      <option value="UPHOLD_DECISION">Uphold Decision</option>
                      <option value="COMPENSATE_SELLER">Compensate Seller</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-black mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={resolutionForm.resolutionNotes}
                    onChange={(e) =>
                      setResolutionForm({
                        ...resolutionForm,
                        resolutionNotes: e.target.value.substring(0, 1000),
                      })
                    }
                    maxLength={1000}
                    placeholder="Explain your decision..."
                    rows={3}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-black text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600"
                  />
                  <p className="text-xs text-black mt-1">
                    {resolutionForm.resolutionNotes.length}/1000
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                <button
                  onClick={() => setSelectedAppeal(null)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 text-xs sm:text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveAppeal}
                  disabled={resolving}
                  className="flex-1 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-xs sm:text-sm font-medium"
                >
                  {resolving ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
