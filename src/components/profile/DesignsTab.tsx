"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import SafeImage from '@/components/ui/safe-image'
import ConfirmModal from '@/components/ui/confirm-modal'
import toastApi from '@/lib/toast'

export default function DesignsTab() {
  type Design = { id: string; title: string; category?: string; imageUrl?: string; thumbnailUrl?: string; salesCount?: number; totalSales?: number; isOwned?: boolean }
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [targetDesign, setTargetDesign] = useState<Design | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [requestReason, setRequestReason] = useState<string>('')

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        // Use profile endpoint so we get salesCount and owner info
        const res = await fetch('/api/profile/designs?page=1&limit=20')
        if (!res.ok) return
        const data = await res.json()
        if (mounted && Array.isArray(data.designs)) setDesigns(data.designs)
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [])

  const openDeleteConfirm = (d: Design) => {
    setTargetDesign(d)
    setConfirmOpen(true)
  }

  const performDelete = async () => {
    if (!targetDesign) return
    setDeletingId(targetDesign.id)
    try {
      const res = await fetch('/api/profile/designs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designId: targetDesign.id }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApi.showError(j?.message || 'Failed to delete design')
        return
      }
      setDesigns(prev => prev.filter(p => p.id !== targetDesign.id))
      toastApi.showSuccess('Design deleted')
    } catch (err) {
      console.error('Delete error', err)
      toastApi.showError('Failed to delete design')
    } finally {
      setDeletingId(null)
      setConfirmOpen(false)
      setTargetDesign(null)
    }
  }

  const [requestModalOpen, setRequestModalOpen] = useState(false)

  const openRequestModal = (d: Design) => {
    setTargetDesign(d)
    setRequestReason('')
    setRequestModalOpen(true)
  }

  const submitDeactivationRequest = async () => {
    if (!targetDesign) return
    try {
      setRequesting(true)
      const res = await fetch('/api/deactivation-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designId: targetDesign.id, reason: requestReason }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toastApi.showError(j?.message || 'Failed to submit request')
        return
      }
      toastApi.showSuccess('Deactivation request submitted')
      setRequestModalOpen(false)
      setTargetDesign(null)
    } catch (err) {
      console.error('Request error', err)
      toastApi.showError('Failed to submit request')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">My Designs</h2>
      <p className="text-sm text-gray-600 mt-2">Manage your designs. Use the uploader to add new items to your store.</p>

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-500">Loading designs…</div>
        ) : designs.length === 0 ? (
          <div className="border rounded-md bg-white p-4 text-sm text-gray-600">No designs yet — visit the uploader to add your first design.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {designs.map((d: Design) => {
              const canDelete = (d.salesCount || 0) === 0 && !d.isOwned
              return (
                <div key={d.id} className="flex items-center gap-3 bg-white border rounded p-3">
                  <Link href={`/designs/${d.id}`} className="flex items-center gap-3 flex-1">
                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border border-gray-200">
                      <SafeImage src={d.thumbnailUrl || d.imageUrl} alt={d.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 truncate">{d.title}</div>
                        <div className="text-xs text-gray-500">•</div>
                        <div className="text-xs text-gray-500">Sales: <span className="font-medium text-gray-900">{d.salesCount ?? 0}</span></div>
                      </div>
                      <div className="text-xs text-gray-500">{d.category}</div>
                      {/* Debug info for delete eligibility */}
                      <div className="mt-1 text-xs text-gray-400">
                        <span>isOwned: {String(d.isOwned)} | salesCount: {d.salesCount ?? 0}</span>
                        {/* If you want to show ownership purchase status, add it to the API and display here */}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    {canDelete ? (
                      <button onClick={() => openDeleteConfirm(d)} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                    ) : (
                      <button disabled className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded border">Delete</button>
                    )}
                    {!canDelete && (
                      <button onClick={() => openRequestModal(d)} disabled={requesting} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Request deactivation</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      <ConfirmModal
        open={requestModalOpen}
        title="Request deactivation"
        description={<div>
          <p className="text-sm mb-2">You are requesting the admin to deactivate <strong>{targetDesign?.title}</strong>. Prior purchasers will retain access.</p>
          <label htmlFor="deactivation-reason" className="block text-sm font-medium text-gray-700">Reason (optional)</label>
          <textarea id="deactivation-reason" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} aria-label="Deactivation reason" className="mt-1 block w-full border px-3 py-2 rounded" rows={4} />
        </div>}
        confirmText="Send request"
        tone="default"
        confirming={requesting}
        onCancel={() => { setRequestModalOpen(false); setTargetDesign(null); setRequestReason('') }}
        onConfirm={submitDeactivationRequest}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Delete design"
        description={<div>Are you sure you want to permanently delete <strong>{targetDesign?.title}</strong>? This cannot be undone.</div>}
        confirmText="Delete"
        tone="danger"
        confirming={!!deletingId}
        onCancel={() => { setConfirmOpen(false); setTargetDesign(null) }}
        onConfirm={performDelete}
      />
    </div>
  )
}
