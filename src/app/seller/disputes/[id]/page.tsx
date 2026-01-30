'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Send, Clock, CheckCircle, AlertCircle, FileText, MessageSquare } from 'lucide-react'

interface DisputeMessage {
  id: string
  author: 'BUYER' | 'SELLER' | 'ADMIN'
  authorName: string
  content: string
  attachments: string[]
  createdAt: string
}

interface DisputeDetail {
  id: string
  disputeNumber: string
  status: 'OPEN' | 'BUYER_APPEAL' | 'SELLER_RESPONSE' | 'AWAITING_DECISION' | 'RESOLVED' | 'CLOSED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  reason: string
  amount: number
  description: string
  createdAt: string
  updatedAt: string
  buyer: {
    id: string
    name: string
    email: string
    avatar: string
  }
  seller: {
    id: string
    name: string
    email: string
  }
  order: {
    id: string
    orderNumber: string
    total: number
    items: number
  }
  messages: DisputeMessage[]
  resolution: {
    type: 'REFUND' | 'REPLACEMENT' | 'PARTIAL_REFUND' | 'NO_ACTION' | null
    amount: number | null
    notes: string | null
    decidedBy: string | null
    decidedAt: string | null
  } | null
  evidence: Array<{
    id: string
    type: 'PROOF_OF_DELIVERY' | 'COMMUNICATION' | 'PHOTO' | 'OTHER'
    url: string
    uploadedAt: string
  }>
}

export default function DisputeDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const disputeId = params.id as string

  const [dispute, setDispute] = useState<DisputeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showResolutionForm, setShowResolutionForm] = useState(false)
  const [selectedResolution, setSelectedResolution] = useState<'REFUND' | 'REPLACEMENT' | 'PARTIAL_REFUND' | 'NO_ACTION'>('REFUND')
  const [resolutionAmount, setResolutionAmount] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')

  const fetchDisputeDetail = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/seller/disputes/${disputeId}`)
      if (!response.ok) {
        console.error('Failed to fetch dispute:', response.status, response.statusText)
        return
      }
      const data = await response.json()
      setDispute(data.dispute)
    } catch (error) {
      console.error('Failed to fetch dispute detail:', error)
    } finally {
      setLoading(false)
    }
  }, [disputeId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchDisputeDetail()
  }, [status, router, disputeId, fetchDisputeDetail])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    try {
      setSending(true)
      const response = await fetch(`/api/seller/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })

      if (response.ok) {
        setMessage('')
        await fetchDisputeDetail()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleSubmitResolution = async () => {
    if (!selectedResolution) return

    try {
      const response = await fetch(`/api/seller/disputes/${disputeId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedResolution,
          amount: selectedResolution !== 'NO_ACTION' ? parseFloat(resolutionAmount || '0') : null,
          notes: resolutionNotes,
        }),
      })

      if (response.ok) {
        setShowResolutionForm(false)
        await fetchDisputeDetail()
      }
    } catch (error) {
      console.error('Failed to submit resolution:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800'
      case 'BUYER_APPEAL': return 'bg-yellow-100 text-yellow-800'
      case 'SELLER_RESPONSE': return 'bg-blue-100 text-blue-800'
      case 'AWAITING_DECISION': return 'bg-purple-100 text-purple-800'
      case 'RESOLVED': return 'bg-green-100 text-green-800'
      case 'CLOSED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-50 border-red-200'
      case 'MEDIUM': return 'bg-orange-50 border-orange-200'
      case 'LOW': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading dispute details...</div>
  }

  if (!dispute) {
    return <div className="p-8 text-center text-red-600">Dispute not found</div>
  }

  const canRespond = dispute.status === 'OPEN' || dispute.status === 'BUYER_APPEAL'

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link href="/seller/disputes" className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">
            ← Back
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dispute {dispute.disputeNumber}</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Order {dispute.order.orderNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Summary */}
            <div className={`rounded-lg shadow-sm p-6 border border-l-4 border-l-indigo-600 ${getSeverityColor(dispute.severity)}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex gap-2 mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                      {dispute.status.replace(/_/g, ' ')}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {dispute.severity} Priority
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{dispute.reason}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">${dispute.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-600">Disputed Amount</p>
                </div>
              </div>

              <p className="text-gray-700 mb-4">{dispute.description}</p>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-medium">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Order Items</p>
                  <p className="font-medium">{dispute.order.items} items</p>
                </div>
                <div>
                  <p className="text-gray-600">Order Total</p>
                  <p className="font-medium">${dispute.order.total.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Buyer Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyer Information</h3>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                  {dispute.buyer.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{dispute.buyer.name}</p>
                  <p className="text-sm text-gray-600">{dispute.buyer.email}</p>
                </div>
              </div>
            </div>

            {/* Evidence */}
            {dispute.evidence.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Evidence Submitted
                </h3>
                <div className="space-y-2">
                  {dispute.evidence.map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <span className="text-sm text-gray-700">{ev.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-500">{new Date(ev.uploadedAt).toLocaleDateString()}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Communication ({dispute.messages.length})
              </h3>

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {dispute.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.author === 'SELLER'
                        ? 'bg-indigo-50 border border-indigo-200 ml-8'
                        : msg.author === 'ADMIN'
                        ? 'bg-purple-50 border border-purple-200'
                        : 'bg-gray-50 border border-gray-200 mr-8'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-gray-900 text-sm">
                        {msg.authorName}
                        {msg.author === 'ADMIN' && <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">Admin</span>}
                      </p>
                      <p className="text-xs text-gray-600">{new Date(msg.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-gray-700 text-sm">{msg.content}</p>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              {canRespond && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your response..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resolution Form */}
            {canRespond && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Propose Resolution</h3>
                {!showResolutionForm ? (
                  <button
                    onClick={() => setShowResolutionForm(true)}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Submit Resolution
                  </button>
                ) : (
                  <div className="space-y-4">
                    <select
                      value={selectedResolution}
                      onChange={(e) => setSelectedResolution(e.target.value as 'REFUND' | 'REPLACEMENT' | 'PARTIAL_REFUND' | 'NO_ACTION')}
                      aria-label="Select resolution type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white"
                    >
                      <option value="REFUND">Full Refund</option>
                      <option value="PARTIAL_REFUND">Partial Refund</option>
                      <option value="REPLACEMENT">Replacement</option>
                      <option value="NO_ACTION">No Action</option>
                    </select>

                    {selectedResolution !== 'NO_ACTION' && (
                      <input
                        type="number"
                        placeholder="Amount"
                        value={resolutionAmount}
                        onChange={(e) => setResolutionAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                      />
                    )}

                    <textarea
                      placeholder="Resolution notes..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                      rows={3}
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowResolutionForm(false)}
                        className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitResolution}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current Resolution */}
            {dispute.resolution && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Resolution
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium text-green-900">{dispute.resolution.type}</span>
                  </p>
                  {dispute.resolution.amount && (
                    <p>
                      <span className="text-gray-600">Amount:</span>
                      <span className="ml-2 font-medium text-green-900">${dispute.resolution.amount.toFixed(2)}</span>
                    </p>
                  )}
                  {dispute.resolution.notes && (
                    <p>
                      <span className="text-gray-600">Notes:</span>
                      <span className="ml-2 text-green-900">{dispute.resolution.notes}</span>
                    </p>
                  )}
                  {dispute.resolution.decidedAt && (
                    <p>
                      <span className="text-gray-600">Decided:</span>
                      <span className="ml-2 text-green-900">{new Date(dispute.resolution.decidedAt).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timeline
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Dispute Created</p>
                    <p className="text-gray-600">{new Date(dispute.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-600">Last Updated</p>
                    <p className="text-gray-600">{new Date(dispute.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
