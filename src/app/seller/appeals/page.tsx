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
  appealNotes: string
  submittedAt: string
  reviewedAt: string | null
  adminResponse: string | null
  evidence: string[]
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/seller/disputes" className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Dispute Appeals</h1>
            <p className="text-gray-600 mt-1">Appeal dispute decisions</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            File Appeal
          </button>
        </div>

        {/* Appeal Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">File an Appeal</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Dispute Number *</label>
                <input
                  type="text"
                  value={disputeNumber}
                  onChange={(e) => setDisputeNumber(e.target.value)}
                  placeholder="e.g., DISP-001234"
                  aria-label="Dispute number"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Appeal Reason *</label>
                <select
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  aria-label="Select appeal reason"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
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
                <label className="block text-xs font-medium text-gray-900 mb-1">Appeal Details</label>
                <textarea
                  value={appealNotes}
                  onChange={(e) => setAppealNotes(e.target.value)}
                  placeholder="Explain why you are appealing..."
                  aria-label="Appeal details"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-2.5 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  aria-label="Cancel appeal"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAppeal}
                  className="px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  aria-label="Submit appeal"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
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
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No appeals found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppeals.map((appeal) => (
              <div key={appeal.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Dispute {appeal.originalDisputeNumber}</h3>
                    <p className="text-sm text-gray-600 mt-1">{appeal.reason.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appeal.status)}`}>
                      {appeal.status === 'SUBMITTED' && <Clock className="w-3 h-3 mr-1" />}
                      {appeal.status === 'APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {appeal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Submitted</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(appeal.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <p className="text-sm font-medium text-gray-900">{appeal.status.replace(/_/g, ' ')}</p>
                  </div>
                  {appeal.reviewedAt && (
                    <div>
                      <p className="text-xs text-gray-600">Reviewed</p>
                      <p className="text-sm font-medium text-gray-900">{new Date(appeal.reviewedAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {appeal.adminResponse && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Admin Response</p>
                    <p className="text-sm text-blue-900">{appeal.adminResponse}</p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedAppeal(appeal)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {appeals.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-indigo-600">{appeals.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total Appeals</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-yellow-600">{appeals.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length}</p>
              <p className="text-xs text-gray-600 mt-1">Pending Review</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">{appeals.filter(a => a.status === 'APPROVED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Approved</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-red-600">{appeals.filter(a => a.status === 'DENIED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Denied</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
