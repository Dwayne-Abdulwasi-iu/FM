'use client'

import React, { useState } from 'react'

export default function DevBackfillPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState<number>(200)
  const [batchSize, setBatchSize] = useState<number>(50)
  const [preview, setPreview] = useState<number>(10)
  const [auditFile, setAuditFile] = useState<string>('')
  const [confirmApply, setConfirmApply] = useState<boolean>(false)
  const [retainDays, setRetainDays] = useState<number>(30)
  const [runCleanup, setRunCleanup] = useState<boolean>(true)

  const runDry = async () => {
    setLoading(true)
    setError(null)
    try {
  const res = await fetch('/api/dev/backfill/submitted-prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit, preview, retainDays }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Request failed')
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const apply = async () => {
    if (!confirmApply && !confirm('Apply backfill? This will write to the database for records missing submittedPrice.')) return
    setLoading(true)
    setError(null)
    try {
  const body = { apply: true, confirm: true, limit, batchSize, preview, auditFile, retainDays, noCleanup: !runCleanup }
      const res = await fetch('/api/dev/backfill/submitted-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Request failed')
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Dev Backfill: submittedPrice</h1>
        <p className="text-sm text-gray-600 mb-4">This endpoint is dev-only and requires ENABLE_DEV_API=true. Dry-run will show sample records. Apply will update records missing submittedPrice.</p>

        <div className="flex gap-2 mb-4">
          <button onClick={runDry} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Dry Run</button>
          <button onClick={apply} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Apply</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <label className="text-sm">Limit (max items)
            <input className="block mt-1 w-full p-2 border rounded" type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value || 0))} />
          </label>
          <label className="text-sm">Batch size
            <input className="block mt-1 w-full p-2 border rounded" type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value || 0))} />
          </label>
          <label className="text-sm">Preview count
            <input className="block mt-1 w-full p-2 border rounded" type="number" value={preview} onChange={(e) => setPreview(Number(e.target.value || 0))} />
          </label>
        </div>

        <div className="mb-4">
          <label className="text-sm block">Audit file (server path)
            <input className="block mt-1 w-full p-2 border rounded" type="text" value={auditFile} onChange={(e) => setAuditFile(e.target.value)} placeholder="leave empty to use tmp/backfills/dev-backfill-audit-<timestamp>.jsonl" />
            <div className="text-xs text-gray-500 mt-1">Leave empty to let the server choose a timestamped file in <code>tmp/backfills/</code>.</div>
          </label>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="text-sm">Retain files (days)
              <input className="block mt-1 w-full p-2 border rounded" type="number" value={retainDays} onChange={(e) => setRetainDays(Number(e.target.value || 0))} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={runCleanup} onChange={(e) => setRunCleanup(e.target.checked)} />
              <span>Run cleanup of old audit files</span>
            </label>
          </div>

          <label className="inline-flex items-center gap-2 mt-2 text-sm">
            <input type="checkbox" checked={confirmApply} onChange={(e) => setConfirmApply(e.target.checked)} />
            <span>Skip browser confirm dialog (I understand this will write data)</span>
          </label>
        </div>

        {loading && <div className="text-sm text-gray-500">Running…</div>}
        {error && <div className="text-sm text-red-600">Error: {error}</div>}

        {result && (
          <div className="mt-4 bg-white p-4 rounded border">
            <pre className="text-xs overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        <div className="mt-4">
          <a href="/api/dev/backfill/latest" target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Download latest audit</a>
        </div>
      </div>
    </div>
  )
}
