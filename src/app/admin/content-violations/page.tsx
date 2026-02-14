'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AlertCircle, Check, X } from 'lucide-react'

interface ContentViolation {
  id: string
  userId: string
  user: {
    id: string
    name: string | null
    email: string
  }
  violationType: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  reviewed: boolean
  action: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
}

export default function AdminContentViolationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [violations, setViolations] = useState<ContentViolation[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed'>('pending')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
      return
    }
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchViolations()
  }, [session, status, statusFilter])

  const fetchViolations = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/content-violations?status=${statusFilter}`)
      if (!res.ok) throw new Error('Failed to fetch violations')
      const data = await res.json()
      setViolations(data.violations || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load violations')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (violationId: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/content-violations/${violationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (!res.ok) throw new Error('Failed to update violation')
      toast.success('Violation reviewed')
      fetchViolations()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to review violation')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-900'
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-900'
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900'
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-900'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900'
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Content Violations</h1>
            </div>
            <p className="text-sm text-gray-600">Review and manage user content violations</p>
          </div>

          {/* Filter */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'reviewed')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Violations List */}
          <div className="overflow-x-auto">
            {violations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No violations found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700">User</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700">Violation Type</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700">Severity</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {violations.map((violation) => (
                    <tr key={violation.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                        <p className="font-medium">{violation.user?.name || 'Unknown User'}</p>
                        <p className="text-xs text-gray-500">{violation.user?.email || 'No email'}</p>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{violation.violationType}</p>
                          <p className="text-xs text-gray-500 mt-1">{violation.description}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(violation.severity || 'MEDIUM')}`}>
                          {(violation.severity || 'MEDIUM').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${
                          violation.reviewed
                            ? 'bg-green-100 border-green-300 text-green-900'
                            : 'bg-yellow-100 border-yellow-300 text-yellow-900'
                        }`}>
                          {violation.reviewed ? 'REVIEWED' : 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm">
                        {!violation.reviewed && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(violation.id, 'WARNED')}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                              title="Issue warning"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReview(violation.id, 'SUSPENDED')}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Suspend user"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReview(violation.id, 'RESOLVED')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Mark resolved"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
