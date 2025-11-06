"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import SafeImage from '@/components/ui/safe-image'

export default function DesignsTab() {
  type Design = { id: string; title: string; category?: string; imageUrl?: string; thumbnailUrl?: string }
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const res = await fetch('/api/designs?userOnly=true&page=1&limit=5')
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
            {designs.map((d: Design) => (
              <Link key={d.id} href={`/designs/${d.id}`} className="flex items-center gap-3 bg-white border rounded p-3">
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border border-gray-200">
                  <SafeImage src={d.thumbnailUrl || d.imageUrl} alt={d.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{d.title}</div>
                  <div className="text-xs text-gray-500">{d.category}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
