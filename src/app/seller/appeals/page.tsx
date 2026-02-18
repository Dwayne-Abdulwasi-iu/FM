'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle, CheckCircle, Clock, MessageSquare, ArrowLeft } from 'lucide-react'

interface Appeal {
  id: string
  originalDisputeNumber: string
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'DENIED'
  reason: string
  notes: string | null
  submittedAt: string
  reviewedAt: string | null
  adminResponse: string | null
  admin?: { name: string | null; email: string | null } | null
}

export default function SellerAppealsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)

  // Form states
  const [disputeNumber, setDisputeNumber] = useState('')
  const [appealReason, setAppealReason] = useState('')
  const [appealNotes, setAppealNotes] = useState('')

  const fetchAppeals = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/seller/appeals?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setAppeals(data.appeals || [])
      }
    } catch (error) {
      console.error('Failed to fetch appeals:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchAppeals()
  }, [status, router, fetchAppeals])

  const handleSubmitAppeal = async () => {
    if (!disputeNumber || !appealReason) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/seller/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalDisputeNumber: disputeNumber,
          reason: appealReason,
          notes: appealNotes,
        }),
      })

      if (response.ok) {
        setShowForm(false)
        setDisputeNumber('')
        setAppealReason('')
        setAppealNotes('')
        await fetchAppeals()
      }
    } catch (error) {
      console.error('Failed to submit appeal:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'DENIED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading appeals...</div>
  }

  const filteredAppeals = appeals.filter(a => filter === 'all' || a.status === filter)

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <Link href="/seller/disputes" className="p-1.5 hover:bg-gray-200 rounded-lg transition shrink-0">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">Dispute Appeals</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Appeal dispute decisions</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs sm:text-sm whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">File Appeal</span>
            <span className="sm:hidden">Appeal</span>
          </button>
        </div>

        {/* Appeal Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">File an Appeal</h2>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-0.5 sm:mb-1">Dispute Number *</label>
                <input
                  type="text"
                  value={disputeNumber}
                  onChange={(e) => setDisputeNumber(e.target.value)}
                  placeholder="e.g., DISP-001234"
                  aria-label="Dispute number"
                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-0.5 sm:mb-1">Appeal Reason *</label>
                <select
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  aria-label="Select appeal reason"
                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                >
                  <option value="">Select reason...</option>
                  <option value="NEW_EVIDENCE">New Evidence Available</option>
                  <option value="PROCEDURAL_ERROR">Procedural Error</option>
                  <option value="INCORRECT_RULING">Incorrect Ruling</option>
                  <option value="SETTLEMENT_REACHED">Settlement Reached</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-0.5 sm:mb-1">Appeal Details</label>
                <textarea
                  value={appealNotes}
                  onChange={(e) => setAppealNotes(e.target.value)}
                  placeholder="Explain why you are appealing..."
                  aria-label="Appeal details"
                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                  rows={3}
                />
              </div>

              <div className="flex gap-1.5 sm:gap-2 justify-end pt-1 sm:pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  aria-label="Cancel appeal"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAppeal}
                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  aria-label="Submit appeal"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 md:p-4 mb-4 sm:mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs sm:text-sm"
          >
            <option value="all">All Appeals</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>

        {/* Appeals List */}
        {filteredAppeals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-12 text-center">
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-2 sm:mb-4" />
            <p className="text-xs sm:text-sm text-gray-500">No appeals found</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            {filteredAppeals.map((appeal) => (
              <div key={appeal.id} className="bg-white rounded-lg shadow-sm p-2.5 sm:p-4 md:p-6 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-xs sm:text-sm md:text-base text-gray-900 truncate">Dispute {appeal.originalDisputeNumber}</h3>
                    <p className="text-xs text-gray-600 mt-0.5 sm:mt-1 line-clamp-2">{appeal.reason.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(appeal.status)}`}>
                      {appeal.status === 'SUBMITTED' && <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                      {appeal.status === 'APPROVED' && <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                      <span className="hidden sm:inline">{appeal.status.replace(/_/g, ' ')}</span>
                      <span className="sm:hidden">{appeal.status.charAt(0)}{appeal.status.slice(1).replace(/_/g, '')}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Submitted</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">{new Date(appeal.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{appeal.status.replace(/_/g, ' ')}</p>
                  </div>
                  {appeal.reviewedAt && (
                    <div>
                      <p className="text-xs text-gray-600">Reviewed</p>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{new Date(appeal.reviewedAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {appeal.adminResponse && (
                  <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600 font-semibold mb-0.5 sm:mb-1">Admin Response</p>
                    <p className="text-xs sm:text-sm text-blue-900 line-clamp-3">{appeal.adminResponse}</p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedAppeal(appeal)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1 sm:gap-2"
                  title="View appeal details"
                  aria-label="View appeal details"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {appeals.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6 md:mt-8">
            <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 text-center shadow-sm">
              <p className="text-xl sm:text-2xl font-bold text-indigo-600">{appeals.length}</p>
              <p className="text-xs text-gray-600 mt-0.5 sm:mt-1">
                <span className="hidden sm:inline">Total Appeals</span>
                <span className="sm:hidden">Appeals</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 text-center shadow-sm">
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{appeals.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length}</p>
              <p className="text-xs text-gray-600 mt-0.5 sm:mt-1">
                <span className="hidden sm:inline">Pending Review</span>
                <span className="sm:hidden">Pending</span>
              </p>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 text-center shadow-sm">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{appeals.filter(a => a.status === 'APPROVED').length}</p>
              <p className="text-xs text-gray-600 mt-0.5 sm:mt-1">Approved</p>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 text-center shadow-sm">
              <p className="text-xl sm:text-2xl font-bold text-red-600">{appeals.filter(a => a.status === 'DENIED').length}</p>
              <p className="text-xs text-gray-600 mt-0.5 sm:mt-1">Denied</p>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedAppeal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-3 sm:p-4 flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Appeal Details</h2>
                <button
                  onClick={() => setSelectedAppeal(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 sm:p-4 md:p-6 space-y-4">
                {/* Header */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">Dispute {selectedAppeal.originalDisputeNumber}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppeal.status)}`}>
                      {selectedAppeal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Appeal Reason */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Appeal Reason</p>
                  <p className="text-sm text-gray-900">{selectedAppeal.reason.replace(/_/g, ' ')}</p>
                </div>

                {/* Appeal Notes */}
                {selectedAppeal.notes && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Appeal Details</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedAppeal.notes}</p>
                  </div>
                )}

                {/* Timeline */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-600 mb-3">Timeline</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Submitted:</span>
                      <span className="font-medium text-gray-900">{new Date(selectedAppeal.submittedAt).toLocaleString()}</span>
                    </div>
                    {selectedAppeal.reviewedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reviewed:</span>
                        <span className="font-medium text-gray-900">{new Date(selectedAppeal.reviewedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Response */}
                {selectedAppeal.adminResponse && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Admin Response</p>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900 whitespace-pre-wrap">{selectedAppeal.adminResponse}</p>
                    </div>
                    {selectedAppeal.admin && (
                      <p className="text-xs text-gray-600 mt-2">
                        Reviewed by: <span className="font-medium">{selectedAppeal.admin.name || selectedAppeal.admin.email}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Close Button */}
                <div className="border-t pt-4">
                  <button
                    onClick={() => setSelectedAppeal(null)}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
