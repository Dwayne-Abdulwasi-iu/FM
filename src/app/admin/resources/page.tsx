 'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Save, 
  X, 
  Upload, 
  ExternalLink, 
  FileText, 
  Video, 
  Globe, 
  Download, 
  BookOpen,
  Star,
  Trash2,
  Edit
} from 'lucide-react'
import ConfirmModal from '@/components/ui/confirm-modal'
import Banner from '@/components/ui/banner'

interface Resource {
  id?: string
  title: string
  description: string
  type: string
  category: string
  difficulty: string
  format: string
  url?: string
  downloadUrl?: string
  thumbnail: string
  duration?: string
  featured: boolean
  tags: string
}

export default function AdminResourcesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [formData, setFormData] = useState<Resource>({
    title: '',
    description: '',
    type: 'guide',
    category: 'design-fundamentals',
    difficulty: 'beginner',
    format: 'web',
    url: '',
    downloadUrl: '',
    thumbnail: '/api/placeholder/300/200',
    duration: '',
    featured: false,
    tags: ''
  })

  const resourceTypes = [
    { value: 'guide', label: 'Guide', icon: FileText },
    { value: 'template', label: 'Template', icon: Download },
    { value: 'tool', label: 'Tool', icon: Upload },
    { value: 'tutorial', label: 'Tutorial', icon: Video },
    { value: 'reference', label: 'Reference', icon: BookOpen },
    { value: 'inspiration', label: 'Inspiration', icon: Star }
  ]

  const categories = [
    { value: 'design-fundamentals', label: 'Design Fundamentals' },
    { value: 'color-theory', label: 'Color Theory' },
    { value: 'technical-drawing', label: 'Technical Drawing' },
    { value: 'pattern-making', label: 'Pattern Making' },
    { value: 'digital-tools', label: 'Digital Tools' },
    { value: 'photography', label: 'Fashion Photography' }
  ]

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ]

  const formats = [
    { value: 'pdf', label: 'PDF Document', icon: FileText },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'web', label: 'Website/Article', icon: Globe },
    { value: 'download', label: 'Download File', icon: Download },
    { value: 'article', label: 'Article', icon: BookOpen }
  ]

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    fetchResources()
  }, [session, status, router])

  const fetchResources = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/resources')
      if (response.ok) {
        const data = await response.json()
        setResources(data.resources)
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const method = editingResource ? 'PUT' : 'POST'
      const body = editingResource 
        ? { ...formData, id: editingResource.id }
        : formData

      const response = await fetch('/api/admin/resources', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await fetchResources()
        resetForm()
        setNotice({ type: 'success', message: editingResource ? 'Resource updated successfully!' : 'Resource added successfully!' })
        setTimeout(() => setNotice(null), 4000)
      } else {
        const error = await response.json()
        setNotice({ type: 'error', message: `Error: ${error.message}` })
      }
    } catch (error) {
      console.error('Error saving resource:', error)
      setNotice({ type: 'error', message: 'Failed to save resource' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDelete({ id })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'guide',
      category: 'design-fundamentals',
      difficulty: 'beginner',
      format: 'web',
      url: '',
      downloadUrl: '',
      thumbnail: '/api/placeholder/300/200',
      duration: '',
      featured: false,
      tags: ''
    })
    setShowAddForm(false)
    setEditingResource(null)
  }

  const startEdit = (resource: Resource) => {
    setFormData(resource)
    setEditingResource(resource)
    setShowAddForm(true)
  }

  const handleTagsChange = (tagsString: string) => {
    setFormData({ ...formData, tags: tagsString })
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notice && (
          <Banner type={notice.type} message={notice.message} onClose={() => setNotice(null)} />
        )}
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Resources</h1>
            <p className="text-gray-600 mt-1">Add and manage educational resources for the platform</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Resource
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingResource ? 'Edit Resource' : 'Add New Resource'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Close form"
                aria-label="Close add resource form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                    placeholder="Enter resource title"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                    placeholder="Describe the resource and its value"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resource Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    title="Select resource type"
                    aria-label="Select resource type"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    {resourceTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    title="Select resource category"
                    aria-label="Select resource category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level *
                  </label>
                  <select
                    required
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    title="Select difficulty level"
                    aria-label="Select difficulty level"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    {difficulties.map(difficulty => (
                      <option key={difficulty.value} value={difficulty.value}>{difficulty.label}</option>
                    ))}
                  </select>
                </div>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format *
                  </label>
                  <select
                    required
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    title="Select resource format"
                    aria-label="Select resource format"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    {formats.map(format => (
                      <option key={format.value} value={format.value}>{format.label}</option>
                    ))}
                  </select>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                    placeholder="https://example.com"
                  />
                </div>

                {/* Download URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Download URL
                  </label>
                  <input
                    type="url"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                    placeholder="https://example.com/file.pdf"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (for videos)
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                    placeholder="e.g., 45 min, 2 hours"
                  />
                </div>

                {/* Thumbnail */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                    placeholder="fashion, design, tutorial, beginner"
                  />
                </div>

                {/* Featured */}
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Featured Resource</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : editingResource ? 'Update Resource' : 'Add Resource'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Resources List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Existing Resources</h2>
            <p className="text-gray-600 mt-1">{resources.length} resources total</p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading resources...</div>
            </div>
          ) : resources.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">No resources found. Add your first resource!</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {resources.map((resource) => (
                <div key={resource.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                        {resource.featured && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{resource.description}</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {categories.find(c => c.value === resource.category)?.label}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          {resource.type}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          {resource.difficulty}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                          {resource.format}
                        </span>
                      </div>
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-500">Tags: {resource.tags}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600"
                          title="View Resource"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => startEdit(resource)}
                        className="p-2 text-gray-400 hover:text-indigo-600"
                        title="Edit Resource"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => resource.id && handleDelete(resource.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete Resource"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Resource"
        description={
          <div>
            <p className="mb-2">This action cannot be undone.</p>
            <p className="text-sm text-gray-600">Are you sure you want to permanently delete this resource?</p>
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        confirming={confirmingDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete?.id) return
          try {
            setConfirmingDelete(true)
            const response = await fetch(`/api/admin/resources?id=${confirmDelete.id}`, {
              method: 'DELETE',
            })
            if (response.ok) {
              await fetchResources()
              setNotice({ type: 'success', message: 'Resource deleted successfully!' })
              setTimeout(() => setNotice(null), 3000)
            } else {
              setNotice({ type: 'error', message: 'Failed to delete resource' })
            }
          } catch {
            setNotice({ type: 'error', message: 'Failed to delete resource' })
          } finally {
            setConfirmingDelete(false)
            setConfirmDelete(null)
          }
        }}
      />
    </div>
  )
}