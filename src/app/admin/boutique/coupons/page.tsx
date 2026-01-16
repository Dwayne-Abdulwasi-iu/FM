'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Ticket, Plus, Search, Edit2, Trash2, ChevronLeft, 
  Calendar, Percent, DollarSign, CheckCircle, XCircle, Copy
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  maxDiscount: number | null
  minPurchase: number | null
  maxUses: number
  usedCount: number
  validFrom: string
  validUntil: string
  isActive: boolean
  sellerId: string | null
  categoryId: string | null
  createdAt: string
}

export default function AdminCouponsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxDiscount: '',
    minPurchase: '',
    maxUses: 100,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    isActive: true,
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as any).role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchCoupons()
  }, [session, status])

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/boutique/admin/coupons')
      if (res.ok) {
        const data = await res.json()
        setCoupons(data.coupons || [])
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingCoupon 
        ? `/api/boutique/admin/coupons?id=${editingCoupon.id}`
        : '/api/boutique/admin/coupons'
      
      const res = await fetch(url, {
        method: editingCoupon ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
          minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
        }),
      })

      if (res.ok) {
        toast.success(editingCoupon ? 'Coupon updated!' : 'Coupon created!')
        fetchCoupons()
        closeModal()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to save coupon')
      }
    } catch (_error) {
      toast.error('Failed to save coupon')
    }
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return
    
    setDeletingId(id)
    try {
      const res = await fetch(`/api/boutique/admin/coupons?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Coupon deleted')
        setCoupons(coupons.filter(c => c.id !== id))
      }
    } catch (_error) {
      toast.error('Failed to delete coupon')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/boutique/admin/coupons?id=${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      if (res.ok) {
        setCoupons(coupons.map(c => 
          c.id === coupon.id ? { ...c, isActive: !c.isActive } : c
        ))
        toast.success(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'}`)
      }
    } catch (_error) {
      toast.error('Failed to update coupon')
    }
  }

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount?.toString() || '',
      minPurchase: coupon.minPurchase?.toString() || '',
      maxUses: coupon.maxUses,
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil.split('T')[0],
      isActive: coupon.isActive,
    })
    setShowCreateModal(true)
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingCoupon(null)
    setFormData({
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxDiscount: '',
      minPurchase: '',
      maxUses: 100,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      isActive: true,
    })
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied!')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/boutique" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Admin
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ticket className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
                <p className="text-gray-600">{coupons.length} coupons</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
            >
              <Plus className="w-5 h-5" />
              Create Coupon
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupons..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Coupons Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredCoupons.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No coupons found</h3>
              <p className="text-gray-500">Create your first coupon to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCoupons.map((coupon) => {
                    const isExpired = new Date(coupon.validUntil) < new Date()
                    const isExhausted = coupon.usedCount >= coupon.maxUses
                    
                    return (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
                              {coupon.code}
                            </code>
                            <button
                              onClick={() => copyCode(coupon.code)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy code"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          {coupon.description && (
                            <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {coupon.discountType === 'PERCENTAGE' ? (
                              <>
                                <Percent className="w-4 h-4 text-purple-600" />
                                <span className="font-medium">{coupon.discountValue}%</span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{formatCurrency(coupon.discountValue)}</span>
                              </>
                            )}
                          </div>
                          {coupon.minPurchase && (
                            <p className="text-xs text-gray-500 mt-1">
                              Min: {formatCurrency(coupon.minPurchase)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <span className="font-medium">{coupon.usedCount}</span>
                            <span className="text-gray-500"> / {coupon.maxUses}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div 
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(coupon.validFrom)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            to {formatDate(coupon.validUntil)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <XCircle className="w-3 h-3" />
                              Expired
                            </span>
                          ) : isExhausted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              <XCircle className="w-3 h-3" />
                              Exhausted
                            </span>
                          ) : coupon.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleActive(coupon)}
                              className={`p-1.5 rounded ${coupon.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={coupon.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {coupon.isActive ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => openEditModal(coupon)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteCoupon(coupon.id)}
                              disabled={deletingId === coupon.id}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="SUMMER20"
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summer sale discount"
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.discountType === 'PERCENTAGE' ? 'Percentage *' : 'Amount (₦) *'}
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                    required
                    min={0}
                    max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Discount (₦)
                  </label>
                  <input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="Optional"
                    min={0}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Purchase (₦)
                  </label>
                  <input
                    type="number"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                    placeholder="Optional"
                    min={0}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Uses *
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                  required
                  min={1}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active immediately
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {editingCoupon ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
