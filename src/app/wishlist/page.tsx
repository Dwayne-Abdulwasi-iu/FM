"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SafeImage from '@/components/ui/safe-image'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { formatPriceLocalized, type SupportedCurrency } from '@/lib/currency'

interface WishItem {
  id: string
  title: string
  imageUrl: string
  price: number
  designerName: string | null
}

export default function WishlistPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<WishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [currency, setCurrency] = useState<SupportedCurrency>('USD')
  const [locale, setLocale] = useState('en-US')

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const res = await fetch('/api/locale', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setLocale(data.locale || 'en-US')
          setCurrency((data.currency === 'NGN' ? 'NGN' : 'USD'))
        }
      } catch {}
    }
    loadLocale()
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        if (session?.user?.id) {
          const res = await fetch(`/api/favorites?page=${page}&pageSize=${pageSize}`)
          if (res.ok) {
            const data = await res.json()
            setItems(data.items || [])
            setTotal(data.total || 0)
          } else {
            setItems([])
            setTotal(0)
          }
        } else {
          // load from localStorage
          const raw = typeof window !== 'undefined' ? localStorage.getItem('wishlist') : null
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) setItems(parsed)
          }
        }
      } catch (err) {
        console.error('Load wishlist', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, page, pageSize])

  const formatPrice = (p: number) => formatPriceLocalized(p, currency, locale)

  const remove = async (id: string) => {
    try {
      if (session?.user?.id) {
        await fetch(`/api/favorites?designId=${id}`, { method: 'DELETE' })
        // reload current page
        const res = await fetch(`/api/favorites?page=${page}&pageSize=${pageSize}`)
        if (res.ok) {
          const data = await res.json()
          setItems(data.items || [])
          setTotal(data.total || 0)
        }
      } else {
        const updated = items.filter(i => i.id !== id)
        setItems(updated)
        localStorage.setItem('wishlist', JSON.stringify(updated))
      }
      toast.success('Removed')
    } catch (err) {
      console.error('Remove wishlist', err)
      toast.error('Failed to remove')
    }
  }

  const addToCart = async (id: string) => {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: id, quantity: 1, purchaseType: 'REGULAR' })
      })
      if (res.ok) {
        // optionally remove from wishlist
        await remove(id)
        toast.success('Added to cart')
      } else {
        const data = await res.json()
        toast.error(data?.message || 'Failed to add to cart')
      }
    } catch (err) {
      console.error('Add to cart', err)
      toast.error('Failed to add to cart')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Wishlist</h1>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-600">Your wishlist is empty.</div>
          ) : (
            <div className="space-y-4">
              {items.map(i => (
                <div key={i.id} className="flex items-center justify-between gap-4">
                  <Link href={`/designs/${i.id}`} className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded overflow-hidden border border-gray-200 bg-gray-100">
                      <SafeImage src={i.imageUrl} alt={i.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{i.title}</div>
                      <div className="text-xs text-gray-600">{i.designerName || 'Anonymous'}</div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-gray-900">{formatPrice(i.price)}</div>
                    <button onClick={() => addToCart(i.id)} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Add to cart</button>
                    <button onClick={() => remove(i.id)} className="px-2 py-1 border rounded text-sm">Remove</button>
                  </div>
                </div>
              ))}
              {/* Pagination for server-backed favorites */}
              {session?.user?.id && total > pageSize && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</div>
                  <div className="space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(total / pageSize)), p + 1))}
                      disabled={page >= Math.ceil(total / pageSize)}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
