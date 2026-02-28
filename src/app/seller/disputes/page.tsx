'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, MessageSquare, Clock, CheckCircle, _XCircle, ExternalLink } from 'lucide-react'
import { useCurrency } from '@/components/CurrencyProvider'

interface Dispute {
  id: string
  disputeNumber: string
  status: 'OPEN' | 'BUYER_APPEAL' | 'SELLER_RESPONSE' | 'AWAITING_DECISION' | 'RESOLVED' | 'CLOSED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  reason: string
  amount: number
  createdAt: string
  updatedAt: string
  buyer: {
    name: string
    email: string
  }
  seller: {
    name: string
    email: string
  }
  order: {
    id: string
    orderNumber: string
  }
  messages: Array<{
    id: string
    author: 'BUYER' | 'SELLER' | 'ADMIN'
    content: string
    createdAt: string
  }>
  resolution: {
    type: 'REFUND' | 'REPLACEMENT' | 'PARTIAL_REFUND' | 'NO_ACTION' | null
    amount: number | null
    notes: string | null
  } | null
}

export default function SellerDisputesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('open')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchDisputes()
  }, [status, router])

  const fetchDisputes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/seller/disputes')
      if (response.ok) {
        const data = await response.json()
        setDisputes(data.disputes || [])
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDisputes = disputes.filter(d => {
    const statusMatch = filter === 'all' || d.status === filter
    const searchMatch = 
      d.disputeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    return statusMatch && searchMatch
  })

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
      case 'HIGH': return 'bg-red-100 text-red-800'
      case 'MEDIUM': return 'bg-orange-100 text-orange-800'
      case 'LOW': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED': return <CheckCircle className="w-4 h-4" />
      case 'CLOSED': return <CheckCircle className="w-4 h-4" />
      case 'OPEN': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading disputes...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dispute Center</h1>
            <p className="text-gray-600">Manage disputes with buyers</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by dispute #, buyer, or order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white"
            >
              <option value="open">Open</option>
              <option value="all">All Status</option>
              <option value="OPEN">Active Disputes</option>
              <option value="BUYER_APPEAL">Buyer Appeal</option>
              <option value="SELLER_RESPONSE">Awaiting Response</option>
              <option value="AWAITING_DECISION">Awaiting Decision</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Disputes List */}
        {filteredDisputes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No disputes found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDisputes.map((dispute) => (
              <div key={dispute.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Dispute {dispute.disputeNumber}</h3>
                      <p className="text-sm text-gray-600 mt-1">Order {dispute.order.orderNumber}</p>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                        {getStatusIcon(dispute.status)}
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityColor(dispute.severity)}`}>
                        {dispute.severity} Priority
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 pb-4 border-b border-gray-200">
                    <div>
                      <p className="text-xs text-gray-600">Disputed Amount</p>
                      <p className="font-bold text-lg text-red-600">{formatPrice(dispute.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Buyer</p>
                      <p className="font-medium text-gray-900 text-sm">{dispute.buyer.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Date</p>
                      <p className="font-medium text-gray-900 text-sm">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Reason:</p>
                    <p className="text-sm text-gray-700">{dispute.reason}</p>
                  </div>

                  {dispute.resolution && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Resolution:</p>
                      <p className="text-sm font-medium text-gray-900">{dispute.resolution.type}</p>
                      {dispute.resolution.amount && (
                        <p className="text-sm text-gray-600 mt-1">Amount: {formatPrice(dispute.resolution.amount)}</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/seller/disputes/${dispute.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                    >
                      View Details
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm">
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {disputes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-indigo-600">{disputes.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total Disputes</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-red-600">{disputes.filter(d => d.status === 'OPEN').length}</p>
              <p className="text-xs text-gray-600 mt-1">Open</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-yellow-600">{disputes.filter(d => ['BUYER_APPEAL', 'SELLER_RESPONSE'].includes(d.status)).length}</p>
              <p className="text-xs text-gray-600 mt-1">In Progress</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">{disputes.filter(d => d.status === 'RESOLVED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Resolved</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-purple-600">{formatPrice(disputes.filter(d => d.status === 'OPEN').reduce((sum, d) => sum + d.amount, 0))}</p>
              <p className="text-xs text-gray-600 mt-1">At Risk</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
