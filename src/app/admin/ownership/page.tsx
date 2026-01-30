'use client'

import { useEffect, useState } from 'react'
import { getServerSession } from 'next-auth'
import toast from 'react-hot-toast'

interface OwnershipDoc {
  id: string
  status: string
  designId: string
  designTitle: string
  designImage: string
  seller: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  previewFileUrl?: string
  previewFileType?: string
  previewFileName?: string
  previewDescription?: string
  legallyBinding: boolean
  verifiedAt?: string
  rejectionReason?: string
}

export default function AdminOwnershipPage() {
  const [documents, setDocuments] = useState<OwnershipDoc[]>([])
  const [status, setStatus] = useState('PENDING')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<OwnershipDoc | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/ownership-documents/admin?status=${status}&page=${page}&limit=10`
      )
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      setDocuments(data.documents)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [status, page])

  const handleApprove = async (docId: string) => {
    if (!confirm('Approve this ownership document?')) return
    setActionInProgress(true)

    try {
      const res = await fetch(
        `/api/ownership-documents/admin?action=approve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: docId })
        }
      )

      if (!res.ok) throw new Error('Failed to approve document')
      toast.success('Document approved')
      fetchDocuments()
    } catch (error) {
      console.error('Approval error:', error)
      toast.error('Failed to approve document')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleReject = async (docId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setActionInProgress(true)
    try {
      const res = await fetch(
        `/api/ownership-documents/admin?action=reject`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: docId, reason: rejectionReason })
        }
      )

      if (!res.ok) throw new Error('Failed to reject document')
      toast.success('Document rejected')
      setRejectionReason('')
      setSelectedDoc(null)
      fetchDocuments()
    } catch (error) {
      console.error('Rejection error:', error)
      toast.error('Failed to reject document')
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Ownership Document Review</h1>

        {/* Status Filter */}
        <div className="mb-4 sm:mb-6 flex gap-2 sm:gap-3 flex-wrap">
          {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => {
                setStatus(s)
                setPage(1)
              }}
              className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm font-medium ${
                status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-black'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Documents Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No documents found</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Design</th>
                  <th className="px-4 py-3 text-left">Seller</th>
                  <th className="px-4 py-3 text-left">Preview</th>
                  <th className="px-4 py-3 text-left">Legally Binding</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {doc.designImage && (
                          <img
                            src={doc.designImage}
                            alt={doc.designTitle}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{doc.designTitle}</div>
                          <div className="text-sm text-gray-500">{doc.designId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{doc.seller.name}</div>
                      <div className="text-sm text-gray-500">{doc.seller.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {doc.previewFileUrl ? (
                        <div>
                          <p className="text-sm font-medium">
                            {doc.previewFileType === 'video' ? '🎥 Video' : '🖼️ Image'}
                          </p>
                          <a
                            href={doc.previewFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View Preview
                          </a>
                          {doc.previewDescription && (
                            <p className="text-xs text-gray-600 mt-1">
                              "{doc.previewDescription}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No preview</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.legallyBinding ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(doc.id)}
                            disabled={actionInProgress}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rejection Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">
                Reject: {selectedDoc.designTitle}
              </h2>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full border rounded p-3 mb-4 h-24 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedDoc(null)
                    setRejectionReason('')
                  }}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedDoc.id)}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
