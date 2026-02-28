'use client'

import { useEffect, useState } from 'react'
import { _getServerSession } from 'next-auth'
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
  sellerFullName: string
  sellerUsername?: string
  sellerSignature: string
  documentContent?: string
  documentVersion?: number
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
  const [viewingDoc, setViewingDoc] = useState<OwnershipDoc | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ action: 'approve' | 'reject'; docId: string; step: 1 | 2 } | null>(null)

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

  const handleApprove = (docId: string) => {
    setConfirmModal({ action: 'approve', docId, step: 1 })
  }

  const handleReject = (docId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setConfirmModal({ action: 'reject', docId, step: 1 })
  }

  const executeAction = async () => {
    if (!confirmModal) return

    setActionInProgress(true)
    try {
      const res = await fetch(
        `/api/ownership-documents/admin?action=${confirmModal.action}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: confirmModal.docId,
            ...(confirmModal.action === 'reject' && { reason: rejectionReason })
          })
        }
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to ${confirmModal.action} document`)
      }
      
      toast.success(`Document ${confirmModal.action === 'approve' ? 'approved' : 'rejected'}`)
      setConfirmModal(null)
      setRejectionReason('')
      setSelectedDoc(null)
      setViewingDoc(null)
      fetchDocuments()
    } catch (error) {
      console.error('Action error:', error)
      toast.error(`Failed to ${confirmModal.action} document`)
    } finally {
      setActionInProgress(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-lg sm:text-xl md:text-3xl font-bold mb-2 sm:mb-4 text-black">Ownership Document Review</h1>

        {/* Status Filter */}
        <div className="mb-2 sm:mb-4 flex gap-1 sm:gap-2 flex-wrap">
          {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => {
                setStatus(s)
                setPage(1)
              }}
              className={`px-1.5 sm:px-3 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Documents Table */}
        {loading ? (
          <div className="text-center py-4 text-black text-sm">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">No documents found</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 sm:px-3 py-2 text-left text-black font-semibold text-[10px] sm:text-xs">Design</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-black font-semibold text-[10px] sm:text-xs">Seller</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-black font-semibold text-[10px] sm:text-xs">Preview</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-black font-semibold text-[10px] sm:text-xs">Binding</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-black font-semibold text-[10px] sm:text-xs">Created</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-black font-semibold text-[10px] sm:text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setViewingDoc(doc)}>
                    <td className="px-2 sm:px-3 py-2">
                      <div className="flex items-center gap-2">
                        {doc.designImage && (
                          <img
                            src={doc.designImage}
                            alt={doc.designTitle}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-black text-[10px] sm:text-xs truncate">{doc.designTitle}</div>
                          <div className="text-[8px] sm:text-[10px] text-gray-500 truncate">{doc.designId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      <div className="font-medium text-[10px] sm:text-xs">{doc.seller.name}</div>
                      <div className="text-[8px] sm:text-[10px] text-gray-500">{doc.seller.email}</div>
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      {doc.previewFileUrl ? (
                        <div>
                          <p className="text-[8px] sm:text-[10px] font-medium">
                            {doc.previewFileType === 'video' ? '🎥 Video' : '🖼️ Image'}
                          </p>
                          <a
                            href={doc.previewFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-[8px] sm:text-[10px]"
                          >
                            View Preview
                          </a>
                          {doc.previewDescription && (
                            <p className="text-[7px] sm:text-[8px] text-gray-600 mt-0.5">
                              "{doc.previewDescription}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[8px] sm:text-[10px] text-gray-500">No preview</span>
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
                    <td className="px-2 sm:px-3 py-2 text-[8px] sm:text-[10px] text-black font-medium">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      {status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprove(doc.id)
                            }}
                            disabled={actionInProgress}
                            className="px-1.5 sm:px-2 py-0.5 bg-green-600 text-white rounded text-[8px] sm:text-[10px] hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDoc(doc)
                            }}
                            className="px-1.5 sm:px-2 py-0.5 bg-red-600 text-white rounded text-[8px] sm:text-[10px] hover:bg-red-700 whitespace-nowrap"
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

        {/* Detail View Modal */}
        {viewingDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full p-3 sm:p-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-2xl font-bold text-black truncate">{viewingDoc.designTitle}</h2>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl ml-2 flex-shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Design Info */}
                <div className="border rounded-lg p-2 sm:p-3">
                  <h3 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-3">Design Information</h3>
                  {viewingDoc.designImage && (
                    <img
                      src={viewingDoc.designImage}
                      alt={viewingDoc.designTitle}
                      className="w-full h-32 sm:h-48 object-cover rounded mb-2 sm:mb-3"
                    />
                  )}
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p><span className="font-medium text-black">Title:</span> <span className="text-black break-all">{viewingDoc.designTitle}</span></p>
                    <p><span className="font-medium text-black">Design ID:</span> <span className="text-black break-all text-[10px] sm:text-xs">{viewingDoc.designId}</span></p>
                    <p><span className="font-medium text-black">Status:</span> <span className="text-black">{viewingDoc.status}</span></p>
                  </div>
                </div>

                {/* Seller Info */}
                <div className="border rounded-lg p-2 sm:p-3">
                  <h3 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-3">Seller Information</h3>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p><span className="font-medium text-black">Name:</span> <span className="text-black break-all">{viewingDoc.seller.name}</span></p>
                    <p><span className="font-medium text-black">Email:</span> <span className="text-black break-all text-[10px] sm:text-xs">{viewingDoc.seller.email}</span></p>
                    <p><span className="font-medium text-black">ID:</span> <span className="text-black">{viewingDoc.seller.id}</span></p>
                  </div>
                </div>
              </div>

              {/* Preview Files */}
              {viewingDoc.previewFileUrl && (
                <div className="border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-3">Preview Files</h3>
                  <div className="space-y-1 sm:space-y-2">
                    {viewingDoc.previewFileType?.startsWith('image') ? (
                      <img src={viewingDoc.previewFileUrl} alt="Preview" className="w-full h-24 sm:h-40 object-cover rounded" />
                    ) : viewingDoc.previewFileType?.startsWith('video') ? (
                      <video src={viewingDoc.previewFileUrl} className="w-full h-24 sm:h-40 rounded" controls />
                    ) : null}
                    <p className="text-xs sm:text-sm"><span className="font-medium text-black">File:</span> <span className="text-black break-all text-[10px] sm:text-xs">{viewingDoc.previewFileName}</span></p>
                    {viewingDoc.previewDescription && (
                      <p className="text-xs sm:text-sm"><span className="font-medium text-black">Desc:</span> <span className="text-black break-all text-[10px] sm:text-xs">{viewingDoc.previewDescription}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* Legal Document */}
              {viewingDoc.documentContent && (
                <div className="border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                    <h3 className="text-sm sm:text-lg font-semibold text-black">Legal Document (v{viewingDoc.documentVersion})</h3>
                    <button
                      onClick={() => {
                        const printWindow = window.open('', '', 'height=600,width=800')
                        if (printWindow) {
                          const content = document.querySelector('.legal-document-content')
                          printWindow.document.write('<html><head><title>Legal Document</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; } </style></head><body>')
                          printWindow.document.write(content?.innerHTML || '')
                          printWindow.document.write('</body></html>')
                          printWindow.document.close()
                          setTimeout(() => printWindow.print(), 250)
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[8px] sm:text-xs font-medium whitespace-nowrap"
                    >
                      Print
                    </button>
                  </div>
                  <div 
                    className="legal-document-content max-w-none text-black bg-white p-2 sm:p-3 rounded border border-gray-200 max-h-64 overflow-y-auto text-[8px] sm:text-[10px]"
                    dangerouslySetInnerHTML={{ __html: `<style>
                      [dangerously-set-inner-html] { color: black !important; font-size: 8px; }
                      span { color: black !important; font-size: 8px; }
                      div { color: black !important; font-size: 8px; }
                      p { color: black !important; font-size: 8px; margin: 2px 0; }
                    </style>` + viewingDoc.documentContent
                      .replace(/\[Designer Full Name\]/g, viewingDoc.sellerFullName)
                      .replace(/\[Seller Full Name\]/g, viewingDoc.sellerFullName)
                      .replace(/\[Buyer Full Name\]/g, '[Buyer Full Name]')
                      .replace(/\[Contract #\]/g, `FM-${viewingDoc.id.substring(0, 8).toUpperCase()}`)
                      .replace(/Design Intellectual Property Transfer & Rights Assignment[\s\S]*?Date:\s*[\s\n]*/g, (match) => {
                        return match.replace(/Date:\s*[\s\n]*$/, `Date: ${new Date(viewingDoc.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}\n`)
                      })
                      .replace(/Designer\/Seller Signature Name/g, `<span style="font-family: cursive; font-size: 16px; font-weight: bold; color: #000; display: block; text-align: left; position: relative; top: -25px; line-height: 0;">${viewingDoc.sellerSignature}</span>`)
                      .replace(/Designer Full Name/g, viewingDoc.sellerFullName)
                      .replace(/Admin Verification Date:[\s\n]*/g, `Admin Verification Date: ${viewingDoc.verifiedAt ? new Date(viewingDoc.verifiedAt).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '[Pending Admin Approval]'}\n`)
                      .replace(/BUYER \(NEW OWNER\):[\s\S]*?Platform: Fashion Marketplace(?=\n)/g, () => {
                        return `<div style="color: black !important;"><strong>BUYER (NEW OWNER):</strong><br>Full Name: <strong style="color: black !important;">[Buyer Full Name]</strong><br><br>Username: <strong style="color: black !important;">[Username]</strong><br><br>Platform: Fashion Marketplace</div>`
                      })
                      .replace(/ORIGINAL DESIGNER \(SELLER\):[\s\S]*?Platform: Fashion Marketplace(?=\n)/g, () => {
                        return `<div style="color: black !important;"><strong>ORIGINAL DESIGNER (SELLER):</strong><br>Full Name: <strong style="color: black !important;">${viewingDoc.sellerFullName}.</strong><br><br>Username: <strong style="color: black !important;">${viewingDoc.sellerUsername || '[Username]'}</strong><br><br>Platform: Fashion Marketplace</div>`
                      })
                      .replace(/ORIGINAL DESIGNER \(SELLER\)([\s\S]*?)Date:[\s\n]*/g, (match) => {
                        return match.replace(/Date:[\s\n]*$/, `Date: ${new Date(viewingDoc.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}\n`)
                      })
                    }}
                  />
                </div>
              )}

              {/* Signatures */}
              <div className="border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-3">Seller Signature</h3>
                <div className="space-y-1 text-xs sm:text-sm">
                  <p><span className="font-medium text-black">Full Name:</span> <span className="text-black break-all text-[10px] sm:text-xs">{viewingDoc.sellerFullName}</span></p>
                  <p><span className="font-medium text-black">Signature:</span> <span className="text-black text-[10px] sm:text-xs">{viewingDoc.sellerSignature}</span></p>
                </div>
              </div>

              {/* Document Info */}
              <div className="border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-lg font-semibold text-black mb-2 sm:mb-3">Document Status</h3>
                <div className="space-y-1 text-xs sm:text-sm">
                  <p>
                    <span className="font-medium text-black">Binding:</span>{' '}
                    <span className={`px-1.5 py-0.5 rounded text-white text-[9px] sm:text-xs ${viewingDoc.legallyBinding ? 'bg-green-600' : 'bg-red-600'}`}>
                      {viewingDoc.legallyBinding ? 'Yes' : 'No'}
                    </span>
                  </p>
                  <p><span className="font-medium text-black">Created:</span> <span className="text-black text-[10px] sm:text-xs">{new Date(viewingDoc.createdAt).toLocaleDateString()}</span></p>
                  {viewingDoc.verifiedAt && (
                    <p><span className="font-medium text-black">Verified:</span> <span className="text-black text-[10px] sm:text-xs">{new Date(viewingDoc.verifiedAt).toLocaleDateString()}</span></p>
                  )}
                </div>
              </div>

              {viewingDoc.rejectionReason && (
                <div className="border rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 bg-red-50">
                  <h3 className="text-sm sm:text-lg font-semibold text-red-900 mb-1 sm:mb-2">Rejection Reason</h3>
                  <p className="text-red-800 text-xs sm:text-sm">{viewingDoc.rejectionReason}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
                <button
                  onClick={() => {
                    handleApprove(viewingDoc.id)
                    setViewingDoc(null)
                  }}
                  disabled={actionInProgress || viewingDoc.status === 'APPROVED'}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded text-[10px] sm:text-sm font-medium"
                >
                  {actionInProgress ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => setSelectedDoc(viewingDoc)}
                  disabled={viewingDoc.status === 'REJECTED'}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded text-[10px] sm:text-sm font-medium"
                >
                  Reject
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded text-[10px] sm:text-sm font-medium"
                >
                  Print
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded text-[10px] sm:text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm w-full p-3 sm:p-4">
              <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-black truncate">
                Reject: {selectedDoc.designTitle}
              </h2>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full border rounded p-2 sm:p-3 mb-3 sm:mb-4 h-20 sm:h-24 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setSelectedDoc(null)
                    setRejectionReason('')
                  }}
                  className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2 border rounded hover:bg-gray-50 text-xs sm:text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedDoc.id)}
                  disabled={actionInProgress}
                  className="flex-1 px-2 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs sm:text-sm font-medium"
                >
                  {actionInProgress ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmModal && confirmModal.step === 1 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm w-full p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-black mb-4">
                {confirmModal.action === 'approve' ? 'Approve this ownership document?' : 'Reject this ownership document?'}
              </h2>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmModal(null)} className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 text-sm font-medium">
                  Cancel
                </button>
                <button 
                  onClick={() => setConfirmModal({...confirmModal, step: 2})} 
                  disabled={actionInProgress}
                  className={`flex-1 px-4 py-2 text-white rounded text-sm font-medium disabled:opacity-50 ${confirmModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {confirmModal.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmModal && confirmModal.step === 2 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm w-full p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-black mb-4">
                Are you sure? This action cannot be undone.
              </h2>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmModal(null)} className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 text-sm font-medium">
                  Cancel
                </button>
                <button 
                  onClick={() => executeAction()} 
                  disabled={actionInProgress}
                  className={`flex-1 px-4 py-2 text-white rounded text-sm font-medium disabled:opacity-50 ${confirmModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {actionInProgress ? 'Processing...' : confirmModal.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
