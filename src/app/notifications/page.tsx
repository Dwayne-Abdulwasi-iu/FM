"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface NotificationItem {
  id: string
  title: string
  message: string
  url?: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (unreadOnly) params.set('unreadOnly', 'true')
      params.set('limit', '50')
      const res = await fetch(`/api/notifications?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items || [])
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }, [unreadOnly])

  useEffect(() => {
    fetchNotifications()

    const handler = () => fetchNotifications()
    window.addEventListener('notificationsUpdated', handler)
    return () => window.removeEventListener('notificationsUpdated', handler)
  }, [fetchNotifications])

  const markRead = async (id: string, markRead = true) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, markRead })
      })
      if (res.ok) {
        // refresh list and notify navbar
        fetchNotifications()
        try { window.dispatchEvent(new Event('notificationsUpdated')) } catch {}
      }
    } catch (err) {
      console.error('Failed to mark notification', err)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>

      <div className="mb-4 flex items-center gap-3">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          <span className="text-sm text-gray-700">Show unread only</span>
        </label>
        <button onClick={() => fetchNotifications()} className="ml-2 px-3 py-1 bg-gray-100 rounded text-sm">Refresh</button>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-600">No notifications</div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className={`p-3 border rounded ${n.isRead ? 'bg-white' : 'bg-indigo-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                  {n.url && (
                    <div className="mt-2">
                      <Link href={n.url} className="text-indigo-600 text-sm">View</Link>
                    </div>
                  )}
                </div>
                <div className="ml-4 text-right flex flex-col items-end gap-2">
                  <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                  <div className="flex gap-2">
                    {!n.isRead ? (
                      <button onClick={() => markRead(n.id, true)} className="px-2 py-1 text-sm bg-indigo-600 text-white rounded">Mark read</button>
                    ) : (
                      <button onClick={() => markRead(n.id, false)} className="px-2 py-1 text-sm bg-gray-100 rounded">Mark unread</button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
