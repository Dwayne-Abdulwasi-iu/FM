'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Save,
  ArrowLeft,
  Loader2,
  DollarSign,
  Tag,
  Type,
  FileText,
  AlertCircle,
  CheckCircle,
  Eye,
  Lock,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface MediaFile {
  id: string
  url: string
  fileType: 'IMAGE' | 'VIDEO'
  accessType: 'FREE' | 'PREMIUM'
  isPrimary: boolean
}

interface Design {
  id: string
  title: string
  description: string | null
  price: number
  ownershipPrice: number | null
  category: string
  tags: string | null
  buyingTypes: string
  isActive: boolean
  imageUrl: string
  thumbnailUrl: string | null
  mediaFiles: MediaFile[]
}

export default function EditDesignPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const designId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [design, setDesign] = useState<Design | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    ownershipPrice: '',
    category: '',
    tags: '',
    buyingTypes: 'REGULAR',
    isActive: true,
  })

  const categories = [
    'Fashion Illustrations',
    'Digital Designs',
    'Pattern Designs',
    'Sketches',
    'Technical Drawings',
    'Concept Art',
  ]

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchDesign()
  }, [session, authStatus, router, designId])

  const fetchDesign = async () => {
    try {
      const response = await fetch(`/api/designs/${designId}`)
      if (response.ok) {
        const data = await response.json()
        // Verify ownership
        if (data.design.designer.id !== session?.user?.id && session?.user?.role !== 'ADMIN') {
          router.push('/seller/designs')
          return
        }
        setDesign(data.design)
        setFormData({
          title: data.design.title || '',
          description: data.design.description || '',
          price: data.design.price?.toString() || '',
          ownershipPrice: data.design.ownershipPrice?.toString() || '',
          category: data.design.category || 'Fashion Illustrations',
          tags: data.design.tags || '',
          buyingTypes: data.design.buyingTypes || 'REGULAR',
          isActive: data.design.isActive,
        })
      } else if (response.status === 404) {
        setMessage({ type: 'error', text: 'Design not found' })
      } else {
        setMessage({ type: 'error', text: 'Failed to load design' })
      }
    } catch (error) {
      console.error('Failed to fetch design:', error)
      setMessage({ type: 'error', text: 'Failed to load design' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/designs/${designId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          price: parseFloat(formData.price),
          ownershipPrice: formData.ownershipPrice ? parseFloat(formData.ownershipPrice) : null,
          category: formData.category,
          tags: formData.tags || null,
          buyingTypes: formData.buyingTypes,
          isActive: formData.isActive,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Design updated successfully!' })
        // Refresh design data
        fetchDesign()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update design' })
      }
    } catch (error) {
      console.error('Failed to update design:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!design) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Design Not Found</h1>
          <p className="text-gray-600 mb-6">This design doesn&apos;t exist or you don&apos;t have permission to edit it.</p>
          <Link
            href="/seller/designs"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Designs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/seller/designs"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to My Designs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Design</h1>
          <p className="text-gray-600 mt-1">Update your design details and settings</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative mb-4">
                <Image
                  src={design.thumbnailUrl || design.imageUrl}
                  alt={design.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-500">
                  Status:{' '}
                  <span className={`font-medium ${formData.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p className="text-gray-500">
                  Media Files: <span className="font-medium text-gray-900">{design.mediaFiles?.length || 1}</span>
                </p>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Link
                  href={`/designs/${design.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <Eye className="w-4 h-4" />
                  View Live Page
                </Link>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Type className="w-4 h-4 inline mr-1" />
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Enter design title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Describe your design..."
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="designCategory" className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Category *
                </label>
                <select
                  id="designCategory"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="fashion, illustration, modern (comma separated)"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Ownership Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ownershipPrice}
                    onChange={(e) => setFormData({ ...formData, ownershipPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="Optional - for exclusive ownership"
                  />
                </div>
              </div>

              {/* Buying Types */}
              <div>
                <label htmlFor="buyingTypes" className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Options
                </label>
                <select
                  id="buyingTypes"
                  value={formData.buyingTypes}
                  onChange={(e) => setFormData({ ...formData, buyingTypes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  <option value="REGULAR">Regular License Only</option>
                  <option value="OWNERSHIP">Ownership Only (Exclusive)</option>
                  <option value="BOTH">Both Regular & Ownership</option>
                </select>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Design Active</p>
                  <p className="text-sm text-gray-500">When inactive, this design won&apos;t appear in search or shop</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                    aria-label="Toggle design active status"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Link
                  href="/seller/designs"
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
