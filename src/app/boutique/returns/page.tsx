'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, AlertCircle, Upload, X, CheckCircle } from 'lucide-react'

interface ReturnRequest {
  id: string
  orderId: string
  orderNumber: string
  status: 'INITIATED' | 'APPROVED' | 'SHIPPED_BACK' | 'RECEIVED' | 'REFUNDED' | 'REJECTED'
  reason: 'DEFECTIVE' | 'NOT_AS_DESCRIBED' | 'WRONG_SIZE' | 'CHANGED_MIND' | 'DAMAGED' | 'OTHER'
  refundAmount: number
  product: {
    id: string
    title: string
    image: string
    price: number
  }
  seller: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  refundedAt: string | null
  shippingLabel: string | null
  trackingNumber: string | null
  notes: string
}

export default function BoutiqueReturnsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null)

  // Return form states
  const [selectedOrder, setSelectedOrder] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [returnNotes, setReturnNotes] = useState('')
  const [evidence, setEvidence] = useState<File[]>([])

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/buyer/returns/boutique?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setReturns(data.returns || [])
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
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

    fetchReturns()
  }, [status, router, fetchReturns])

  const handleSubmitReturn = async () => {
    if (!selectedOrder || !returnReason) {
      alert('Please select an order and reason')
      return
    }

    try {
      const formData = new FormData()
      formData.append('orderId', selectedOrder)
      formData.append('reason', returnReason)
      formData.append('notes', returnNotes)
      evidence.forEach(file => {
        formData.append('evidence', file)
      })

      const response = await fetch('/api/buyer/returns/boutique', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setShowForm(false)
        setSelectedOrder('')
        setReturnReason('')
        setReturnNotes('')
        setEvidence([])
        await fetchReturns()
      }
    } catch (error) {
      console.error('Failed to submit return:', error)
    }
  }

  const handleAddEvidence = (files: FileList | null) => {
    if (files) {
      setEvidence([...evidence, ...Array.from(files)])
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INITIATED': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'SHIPPED_BACK': return 'bg-blue-100 text-blue-800'
      case 'RECEIVED': return 'bg-indigo-100 text-indigo-800'
      case 'REFUNDED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading returns...</div>
  }

  const filteredReturns = returns.filter(r => filter === 'all' || r.status === filter)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">Product Returns</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage returns and refunds</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs whitespace-nowrap"
            aria-label="Request product return"
          >
            <Plus className="w-4 h-4" />
            Request Return
          </button>
        </div>

        {/* Return Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Request a Return</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Select Order *</label>
                <select
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  aria-label="Select order to return"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                >
                  <option value="">Choose an order...</option>
                  {/* Replace with actual orders */}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Reason *</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  aria-label="Select return reason"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                >
                  <option value="">Select reason...</option>
                  <option value="DEFECTIVE">Defective Item</option>
                  <option value="NOT_AS_DESCRIBED">Not as Described</option>
                  <option value="WRONG_SIZE">Wrong Size</option>
                  <option value="DAMAGED">Damaged in Shipping</option>
                  <option value="CHANGED_MIND">Changed Mind</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Description</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Describe the issue..."
                  aria-label="Return description"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Upload Evidence (Photos)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleAddEvidence(e.target.files)}
                    className="hidden"
                    id="evidence-upload"
                    aria-label="Upload evidence photos"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-600">Click to upload</p>
                  </label>
                </div>
                {evidence.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {evidence.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-700 truncate">{file.name}</span>
                        <button
                          onClick={() => setEvidence(evidence.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-700"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-2.5 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  aria-label="Cancel return request"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReturn}
                  className="px-2.5 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  aria-label="Submit return request"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter returns by status"
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-black bg-white"
          >
            <option value="all">All Returns</option>
            <option value="INITIATED">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="SHIPPED_BACK">Shipped Back</option>
            <option value="REFUNDED">Refunded</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Returns List */}
        {filteredReturns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No returns found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReturns.map((ret) => (
              <div key={ret.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{ret.product.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{ret.seller.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Order: {ret.orderNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Refund</p>
                      <p className="text-lg font-bold text-green-600">${ret.refundAmount.toFixed(2)}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ret.status)}`}>
                      {ret.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600">Reason</p>
                    <p className="text-sm font-medium text-gray-900">{ret.reason.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Requested</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(ret.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <p className="text-sm font-medium text-gray-900">{ret.status.replace(/_/g, ' ')}</p>
                  </div>
                  {ret.trackingNumber && (
                    <div>
                      <p className="text-xs text-gray-600">Tracking</p>
                      <p className="text-sm font-medium text-gray-900">{ret.trackingNumber}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedReturn(ret)}
                  className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {returns.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-indigo-600">{returns.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total Returns</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-yellow-600">{returns.filter(r => r.status === 'INITIATED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Pending</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">{returns.filter(r => r.status === 'REFUNDED').length}</p>
              <p className="text-xs text-gray-600 mt-1">Refunded</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-red-600">${returns.filter(r => r.status === 'REFUNDED').reduce((sum, r) => sum + r.refundAmount, 0).toFixed(2)}</p>
              <p className="text-xs text-gray-600 mt-1">Total Refunded</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
