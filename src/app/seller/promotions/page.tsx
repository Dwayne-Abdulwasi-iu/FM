'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Tag,
  Plus,
  Loader2,
  ArrowLeft,
  Calendar,
  Percent,
  DollarSign,
  Package,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

interface Promotion {
  id: string
  type: 'DISCOUNT' | 'BUNDLE' | 'FLASH_SALE'
  name: string
  description: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  bundlePrice: number | null
  designIds: string[]
  startDate: string
  endDate: string
  maxUsage: number | null
  usageCount: number
  isActive: boolean
  createdAt: string
}

export default function SellerPromotionsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [newPromotion, setNewPromotion] = useState<{
    type: 'DISCOUNT' | 'BUNDLE' | 'FLASH_SALE'
    name: string
    description: string
    discountType: 'PERCENTAGE' | 'FIXED'
    discountValue: number
    bundlePrice: number
    startDate: string
    endDate: string
    maxUsage: number | null
  }>({
    type: 'DISCOUNT',
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    bundlePrice: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxUsage: null as number | null,
  })

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchPromotions()
  }, [session, authStatus, router, filter])

  const fetchPromotions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/seller/promotions?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setPromotions(data.promotions || [])
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      const response = await fetch('/api/seller/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPromotion),
      })

      if (response.ok) {
        setSuccess('Promotion created successfully!')
        setShowCreateModal(false)
        setNewPromotion({
          type: 'DISCOUNT',
          name: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          bundlePrice: 0,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          maxUsage: null,
        })
        fetchPromotions()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create promotion')
      }
    } catch (error) {
      console.error('Failed to create promotion:', error)
      setError('An error occurred')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (promotionId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/seller/promotions/${promotionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        fetchPromotions()
      }
    } catch (error) {
      console.error('Failed to toggle promotion:', error)
    }
  }

  const handleDeletePromotion = async (promotionId: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return

    try {
      const response = await fetch(`/api/seller/promotions/${promotionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('Promotion deleted')
        fetchPromotions()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      console.error('Failed to delete promotion:', error)
    }
  }

  const getStatusBadge = (promotion: Promotion) => {
    const now = new Date()
    const endDate = new Date(promotion.endDate)
    const startDate = new Date(promotion.startDate)

    if (!promotion.isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <EyeOff className="w-3 h-3 mr-1" />
          Inactive
        </span>
      )
    }

    if (now < startDate) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Clock className="w-3 h-3 mr-1" />
          Scheduled
        </span>
      )
    }

    if (now > endDate) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/seller/dashboard"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
            <p className="text-gray-600 mt-1">Create and manage discounts for your designs</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Create Promotion
          </button>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Promotions List */}
        {promotions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Promotions Yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first promotion to attract more buyers
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Create Promotion
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {promotions.map((promotion) => (
              <div
                key={promotion.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      promotion.type === 'DISCOUNT'
                        ? 'bg-green-100'
                        : promotion.type === 'BUNDLE'
                        ? 'bg-purple-100'
                        : 'bg-orange-100'
                    }`}>
                      {promotion.type === 'DISCOUNT' ? (
                        <Percent className={`w-6 h-6 ${
                          promotion.type === 'DISCOUNT' ? 'text-green-600' : ''
                        }`} />
                      ) : promotion.type === 'BUNDLE' ? (
                        <Package className="w-6 h-6 text-purple-600" />
                      ) : (
                        <Clock className="w-6 h-6 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{promotion.name}</h3>
                        {getStatusBadge(promotion)}
                      </div>
                      {promotion.description && (
                        <p className="text-sm text-gray-500 mt-1">{promotion.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          {promotion.discountType === 'PERCENTAGE' ? (
                            <Percent className="w-4 h-4" />
                          ) : (
                            <DollarSign className="w-4 h-4" />
                          )}
                          {promotion.discountType === 'PERCENTAGE'
                            ? `${promotion.discountValue}% off`
                            : `$${promotion.discountValue} off`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                        </span>
                        {promotion.maxUsage && (
                          <span>
                            {promotion.usageCount}/{promotion.maxUsage} used
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(promotion.id, promotion.isActive)}
                      className={`p-2 rounded-lg transition-colors ${
                        promotion.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={promotion.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {promotion.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promotion.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Create Promotion</h2>
              </div>
              <form onSubmit={handleCreatePromotion} className="p-6 space-y-4">
                <div>
                  <label htmlFor="promotionType" className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Type
                  </label>
                  <select
                    id="promotionType"
                    value={newPromotion.type}
                    onChange={(e) =>
                      setNewPromotion({ ...newPromotion, type: e.target.value as 'DISCOUNT' | 'BUNDLE' | 'FLASH_SALE' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="DISCOUNT">Discount</option>
                    <option value="BUNDLE">Bundle</option>
                    <option value="FLASH_SALE">Flash Sale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newPromotion.name}
                    onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Summer Sale"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newPromotion.description}
                    onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="discountType" className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type
                    </label>
                    <select
                      id="discountType"
                      value={newPromotion.discountType}
                      onChange={(e) =>
                        setNewPromotion({
                          ...newPromotion,
                          discountType: e.target.value as 'PERCENTAGE' | 'FIXED',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700 mb-1">
                      {newPromotion.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount $'}
                    </label>
                    <input
                      id="discountValue"
                      type="number"
                      min="1"
                      max={newPromotion.discountType === 'PERCENTAGE' ? 100 : undefined}
                      value={newPromotion.discountValue}
                      onChange={(e) =>
                        setNewPromotion({ ...newPromotion, discountValue: parseInt(e.target.value) || 0 })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      id="startDate"
                      type="date"
                      value={newPromotion.startDate}
                      onChange={(e) => setNewPromotion({ ...newPromotion, startDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      id="endDate"
                      type="date"
                      value={newPromotion.endDate}
                      onChange={(e) => setNewPromotion({ ...newPromotion, endDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="maxUsage" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Usage (Optional)
                  </label>
                  <input
                    id="maxUsage"
                    type="number"
                    min="1"
                    value={newPromotion.maxUsage || ''}
                    onChange={(e) =>
                      setNewPromotion({
                        ...newPromotion,
                        maxUsage: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Unlimited"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Promotion
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
