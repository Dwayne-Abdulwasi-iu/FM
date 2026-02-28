'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Send, Clock, CheckCircle, _AlertCircle, FileText, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

interface DisputeMessage {
  id: string
  senderId: string
  senderRole: 'COMPLAINANT' | 'RESPONDENT' | 'ADMIN'
  message: string
  attachments: string[]
  createdAt: string
}

interface DisputeDetail {
  id: string
  complainantId: string
  respondentId: string
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'CLOSED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  type: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  orderId?: string
  designId?: string
  commissionId?: string
  resolution?: string
  resolvedBy?: string
  resolvedAt?: string
  refundRequested?: number
  refundApproved?: number
  evidence: string[]
  complainant: {
    name: string | null
    email: string | null
  } | null
  respondent: {
    name: string | null
    email: string | null
  } | null
  order: {
    id: string
    orderNumber: string
    total: number
    items: {
      id: string
      design: {
        title: string
      }
    }[]
  } | null
  messages: DisputeMessage[]
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
  const [resolutionNotes, setResolutionNotes] = useState('')

  const fetchDisputeDetail = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/disputes/${disputeId}`)
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
      const response = await fetch(`/api/disputes/${disputeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })

      if (response.ok) {
        setMessage('')
        await fetchDisputeDetail()
        toast.success('Message sent')
      } else {
        const data = await response.json()
        toast.error(data.message || 'Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSubmitResolution = async () => {
    if (!resolutionNotes.trim()) {
      toast.error('Please enter your response')
      return
    }

    try {
      setSending(true)
      const response = await fetch(`/api/disputes/${disputeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: resolutionNotes.trim() }),
      })

      if (response.ok) {
        setResolutionNotes('')
        setShowResolutionForm(false)
        await fetchDisputeDetail()
        toast.success('Your response has been submitted')
      } else {
        const data = await response.json()
        toast.error(data.message || 'Failed to submit response')
      }
    } catch (error) {
      console.error('Failed to submit response:', error)
      toast.error('Failed to submit response')
    } finally {
      setSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800'
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800'
      case 'RESOLVED': return 'bg-green-100 text-green-800'
      case 'ESCALATED': return 'bg-purple-100 text-purple-800'
      case 'CLOSED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-50 border-red-200'
      case 'HIGH': return 'bg-orange-50 border-orange-200'
      case 'MEDIUM': return 'bg-blue-50 border-blue-200'
      case 'LOW': return 'bg-gray-50 border-gray-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getSenderName = (senderId: string, senderRole: string): string => {
    if (senderRole === 'COMPLAINANT' && dispute?.complainant?.name) {
      return dispute.complainant.name
    } else if (senderRole === 'RESPONDENT' && dispute?.respondent?.name) {
      return dispute.respondent.name
    } else if (senderRole === 'ADMIN') {
      return 'Admin'
    }
    return 'User'
  }

  if (loading) {
    return <div className="p-8 text-center">Loading dispute details...</div>
  }

  if (!dispute) {
    return <div className="p-8 text-center text-red-600">Dispute not found</div>
  }

  const canRespond = dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW'
  const otherParty = session?.user?.id === dispute.complainantId ? dispute.respondent : dispute.complainant
  const _orderItemCount = dispute.order?.items?.length || 0

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link href="/seller/disputes" className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">
            ← Back
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dispute #{dispute.id.slice(0, 8)}</h1>
            {dispute.order && <p className="text-xs sm:text-sm text-gray-600 mt-1">Order {dispute.order.orderNumber}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Summary */}
            <div className={`rounded-lg shadow-sm p-6 border border-l-4 border-l-indigo-600 ${getPriorityColor(dispute.priority)}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex gap-2 mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                      {dispute.status.replace(/_/g, ' ')}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {dispute.priority} Priority
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{dispute.title}</h2>
                </div>
                {dispute.refundRequested && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">${dispute.refundRequested.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">Refund Requested</p>
                  </div>
                )}
              </div>

              <p className="text-gray-700 mb-4">{dispute.description}</p>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-medium">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-medium">{dispute.type.replace(/_/g, ' ')}</p>
                </div>
                {dispute.order && (
                  <div>
                    <p className="text-gray-600">Order Total</p>
                    <p className="font-medium">${dispute.order.total.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Other Party Info */}
            {otherParty && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {session?.user?.id === dispute.complainantId ? 'Respondent' : 'Complainant'} Information
                </h3>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                    {otherParty.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{otherParty.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">{otherParty.email || 'No email'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence */}
            {dispute.evidence && dispute.evidence.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Evidence Submitted
                </h3>
                <div className="space-y-2">
                  {dispute.evidence.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <span className="text-sm text-gray-700">Evidence {idx + 1}</span>
                      <span className="text-xs text-indigo-600">View →</span>
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
                {dispute.messages.map((msg) => {
                  const isFromMe = session?.user?.id === msg.senderId
                  const senderName = getSenderName(msg.senderId, msg.senderRole)
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg ${
                        isFromMe
                          ? 'bg-indigo-50 border border-indigo-200 ml-8'
                          : msg.senderRole === 'ADMIN'
                          ? 'bg-purple-50 border border-purple-200'
                          : 'bg-gray-50 border border-gray-200 mr-8'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-gray-900 text-sm">
                          {senderName}
                          {msg.senderRole === 'ADMIN' && <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">Admin</span>}
                        </p>
                        <p className="text-xs text-gray-600">{new Date(msg.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-gray-700 text-sm">{msg.message}</p>
                    </div>
                  )
                })}
              </div>

              {/* Message Input */}
              {canRespond && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your response..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                    disabled={sending}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black disabled:opacity-50"
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
            {/* Response Form */}
            {canRespond && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Response</h3>
                {!showResolutionForm ? (
                  <button
                    onClick={() => setShowResolutionForm(true)}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Add Response
                  </button>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      placeholder="Explain your side of the story or respond to the buyer's claim..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                      rows={4}
                      aria-label="Your response"
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
                        disabled={sending}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {sending ? 'Submitting...' : 'Submit Response'}
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
                    <span className="text-gray-600">Decision:</span>
                    <span className="ml-2 font-medium text-green-900">{dispute.resolution}</span>
                  </p>
                  {dispute.refundApproved && (
                    <p>
                      <span className="text-gray-600">Refund Approved:</span>
                      <span className="ml-2 font-medium text-green-900">${dispute.refundApproved.toFixed(2)}</span>
                    </p>
                  )}
                  {dispute.resolvedAt && (
                    <p>
                      <span className="text-gray-600">Resolved:</span>
                      <span className="ml-2 text-green-900">{new Date(dispute.resolvedAt).toLocaleDateString()}</span>
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
