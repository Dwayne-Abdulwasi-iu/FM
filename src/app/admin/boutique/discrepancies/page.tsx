'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Filter, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface VariantDiscrepancy {
  id: string
  variantId: string
  shipmentId: string
  quantityExpected: number
  quantityReceived: number | null
  quantityDamaged: number | null
  quantityMissing: number | null
  acceptanceStatus: string
  createdAt: string
  variant: {
    id: string
    size: string | null
    color: string | null
    product: {
      id: string
      title: string
    }
  }
  shipment: {
    id: string
    seller: {
      id: string
      name: string
      email: string
    }
  }
}

export default function DiscrepanciesDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [discrepancies, setDiscrepancies] = useState<VariantDiscrepancy[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [ageFilter, setAgeFilter] = useState<string>('all') // all, 1-3, 4-6, 7+
  const [sortBy, setSortBy] = useState<string>('oldest') // oldest, newest

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as any).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchDiscrepancies()
  }, [session, status, statusFilter, ageFilter, sortBy])

  const fetchDiscrepancies = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        status: statusFilter,
        age: ageFilter,
        sort: sortBy,
      })

      const res = await fetch(`/api/boutique/admin/discrepancies?${queryParams}`, {
        cache: 'no-store',
      })

      if (res.ok) {
        const data = await res.json()
        setDiscrepancies(data.discrepancies || [])
      } else {
        toast.error('Failed to load discrepancies')
      }
    } catch (error) {
      console.error('Error fetching discrepancies:', error)
      toast.error('Error loading discrepancies')
    } finally {
      setLoading(false)
    }
  }

  const getDaysOld = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000))
    return days
  }

  const getUrgencyColor = (daysOld: number) => {
    if (daysOld >= 7) return 'bg-red-100 border-red-300 text-red-800'
    if (daysOld >= 5) return 'bg-yellow-100 border-yellow-300 text-yellow-800'
    if (daysOld >= 3) return 'bg-orange-100 border-orange-300 text-orange-800'
    return 'bg-blue-100 border-blue-300 text-blue-800'
  }

  const filteredAndSorted = discrepancies
    .filter(d => {
      const daysOld = getDaysOld(d.createdAt)
      if (ageFilter === '1-3' && (daysOld < 1 || daysOld > 3)) return false
      if (ageFilter === '4-6' && (daysOld < 4 || daysOld > 6)) return false
      if (ageFilter === '7+' && daysOld < 7) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/boutique/shipments" className="hover:opacity-75 transition">
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Variant Discrepancies {filteredAndSorted.length > 0 && `(${filteredAndSorted.length})`}
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 text-sm"
            >
              <option value="PENDING">Pending Only</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="RETURNING">Returning</option>
              <option value="PARTIAL">Partial</option>
              <option value="all">All</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Age</label>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Ages</option>
              <option value="1-3">1-3 Days</option>
              <option value="4-6">4-6 Days</option>
              <option value="7+">7+ Days (Overdue)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 text-sm"
            >
              <option value="oldest">Oldest First (Urgent)</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Discrepancies List */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
          <p className="text-gray-400">No discrepancies found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map((discrepancy) => {
            const daysOld = getDaysOld(discrepancy.createdAt)
            const urgencyColor = getUrgencyColor(daysOld)
            const variantLabel = [
              discrepancy.variant.product.title,
              discrepancy.variant.size && `Size: ${discrepancy.variant.size}`,
              discrepancy.variant.color && `Color: ${discrepancy.variant.color}`,
            ]
              .filter(Boolean)
              .join(' • ')

            return (
              <Link
                key={discrepancy.id}
                href={`/admin/boutique/shipments/${discrepancy.shipmentId}`}
                className={`block p-4 rounded-lg border transition hover:shadow-lg ${urgencyColor}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{variantLabel}</p>
                    <p className="text-xs sm:text-sm opacity-75 mt-1">
                      Seller: {discrepancy.shipment.seller.name}
                    </p>
                    <p className="text-xs sm:text-sm opacity-75">
                      Expected: {discrepancy.quantityExpected} | Received: {discrepancy.quantityReceived ?? '?'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="px-2 py-1 bg-black bg-opacity-30 rounded text-xs font-medium whitespace-nowrap">
                      {daysOld}d old
                    </span>
                    {daysOld >= 7 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded text-xs font-medium text-white">
                        <AlertTriangle className="w-3 h-3" />
                        OVERDUE
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

