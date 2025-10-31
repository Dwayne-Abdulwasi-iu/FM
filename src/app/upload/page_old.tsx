'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Upload, Trash2, Image as ImageIcon, Video, FileText, CheckCircle, X, DollarSign } from 'lucide-react'
import Image from 'next/image'

interface MediaFile {
  id: string
  file: File | null
  preview: string | null
  accessType: 'FREE' | 'PREMIUM'
  fileType: 'IMAGE' | 'VIDEO' | null
}

export default function UploadPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([
    { id: '1', file: null, preview: null, accessType: 'FREE', fileType: null }
  ])
  const [isUploading, setIsUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    ownershipPrice: '',
    category: 'Fashion Illustrations',
    tags: '',
    buyingTypes: 'REGULAR'
  })

  const categories = [
    'Fashion Illustrations',
    'Digital Designs', 
    'Pattern Designs',
    'Sketches',
    'Technical Drawings',
    'Concept Art',
    'Video Content'
  ]

  const addMediaSection = () => {
    const newId = (mediaFiles.length + 1).toString()
    setMediaFiles([...mediaFiles, { 
      id: newId, 
      file: null, 
      preview: null, 
      accessType: 'FREE', 
      fileType: null 
    }])
  }

  const removeMediaSection = (id: string) => {
    if (mediaFiles.length > 1) {
      setMediaFiles(mediaFiles.filter(media => media.id !== id))
    }
  }

  const handleMediaFileChange = (id: string, file: File) => {
    // Validate file type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    
    if (!isImage && !isVideo) {
      setErrorMessage('Please select a valid image or video file')
      return
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      setErrorMessage(`File too large. Maximum size is ${isVideo ? '50MB for videos' : '10MB for images'}.`)
      return
    }

    const fileType = isVideo ? 'VIDEO' : 'IMAGE'
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setMediaFiles(mediaFiles.map(media => 
        media.id === id 
          ? { ...media, file, preview: e.target?.result as string, fileType }
          : media
      ))
    }
    reader.readAsDataURL(file)
  }

  const updateMediaAccessType = (id: string, accessType: 'FREE' | 'PREMIUM') => {
    setMediaFiles(mediaFiles.map(media => 
      media.id === id ? { ...media, accessType } : media
    ))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!session) {
      setErrorMessage('Please sign in to upload designs')
      setSuccessMessage(null)
      return
    }

    // Validate required fields
    if (!formData.title.trim() || !formData.price || parseFloat(formData.price) <= 0) {
      setErrorMessage('Please fill in all required fields with valid values')
      setSuccessMessage(null)
      return
    }

    // Validate at least one file is uploaded
    const filesWithContent = mediaFiles.filter(media => media.file !== null)
    if (filesWithContent.length === 0) {
      setErrorMessage('Please upload at least one media file')
      setSuccessMessage(null)
      return
    }

    setIsUploading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const submitFormData = new FormData()
      submitFormData.append('title', formData.title.trim())
      submitFormData.append('description', formData.description.trim())
      submitFormData.append('price', formData.price)
      if (formData.ownershipPrice) {
        submitFormData.append('ownershipPrice', formData.ownershipPrice)
      }
      submitFormData.append('category', formData.category)
      submitFormData.append('tags', formData.tags.trim())
      submitFormData.append('buyingTypes', formData.buyingTypes)

      // Add files and metadata
      filesWithContent.forEach((media, index) => {
        if (media.file) {
          submitFormData.append('files', media.file)
          submitFormData.append('fileMetadata', JSON.stringify({
            accessType: media.accessType,
            sortOrder: index
          }))
        }
      })

      const response = await fetch('/api/designs/upload-multi', {
        method: 'POST',
        body: submitFormData
      })

      if (response.ok) {
        const result = await response.json()
        setSuccessMessage(result.message)
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          price: '',
          ownershipPrice: '',
          category: 'Fashion Illustrations',
          tags: '',
          buyingTypes: 'REGULAR'
        })
        setMediaFiles([{ id: '1', file: null, preview: null, accessType: 'FREE', fileType: null }])
        
        // Redirect to profile after 2 seconds
        setTimeout(() => {
          router.push('/profile')
        }, 2000)
      } else {
        const error = await response.json()
        setErrorMessage(error.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage('An error occurred during upload')
    } finally {
      setIsUploading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to upload designs</p>
          <button
            onClick={() => router.push('/api/auth/signin')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload New Design</h1>
          <p className="text-gray-600 mt-2">Share your fashion designs with the community</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-600 mr-3" />
              <span className="text-red-800 font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800"
              aria-label="Close error message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Media Files</h2>
              <button
                type="button"
                onClick={addMediaSection}
                className="inline-flex items-center px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add File
              </button>
            </div>

            <div className="space-y-4">
              {mediaFiles.map((media, index) => (
                <div key={media.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      File {index + 1}
                    </span>
                    {mediaFiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMediaSection(media.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        aria-label="Remove file section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* File Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Design File (Images & Videos)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id={`file-${media.id}`}
                        accept="image/*,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleMediaFileChange(media.id, file)
                          }
                        }}
                        className="hidden"
                      />
                      <label 
                        htmlFor={`file-${media.id}`} 
                        className="cursor-pointer flex flex-col items-center"
                      >
                        {media.preview ? (
                          <div className="mb-4">
                            {media.fileType === 'VIDEO' ? (
                              <video 
                                src={media.preview} 
                                className="max-w-xs max-h-32 rounded border"
                                controls
                              />
                            ) : (
                              <Image 
                                src={media.preview || ''} 
                                alt="Preview" 
                                width={200}
                                height={128}
                                className="max-w-xs max-h-32 object-cover rounded border"
                                placeholder="empty"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="mb-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                              <Upload className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                        )}
                        <span className="text-sm text-gray-600">
                          {media.file ? media.file.name : 'Click to upload or drag and drop'}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF, MP4, WebM up to {media.fileType === 'VIDEO' ? '50MB' : '10MB'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Access Type Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-700">File Access</span>
                      <p className="text-xs text-gray-500">
                        {media.accessType === 'FREE' ? 'Visible to everyone' : 'Only after purchase'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => updateMediaAccessType(media.id, 'FREE')}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                          media.accessType === 'FREE'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        FREE
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMediaAccessType(media.id, 'PREMIUM')}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                          media.accessType === 'PREMIUM'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        PREMIUM
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!session) {
      setErrorMessage('Please sign in to upload designs')
      setSuccessMessage(null)
      return
    }

    setIsUploading(true)
    
    try {
      const form = e.target as HTMLFormElement
      const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement
      const file = fileInput.files?.[0]
      
      if (!file) {
        setErrorMessage('Please select a file to upload')
        setSuccessMessage(null)
        return
      }

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('price', formData.price)
      uploadFormData.append('ownershipPrice', formData.ownershipPrice)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('tags', formData.tags)
      uploadFormData.append('buyingTypes', formData.buyingTypes)

      const response = await fetch('/api/designs/upload', {
        method: 'POST',
        body: uploadFormData
      })

      if (response.ok) {
        const result = await response.json()
        setSuccessMessage('Design uploaded successfully!')
        setErrorMessage(null)
        // Redirect after showing success message
        setTimeout(() => {
          router.push(`/designs/${result.id}`)
        }, 2000)
      } else {
        const error = await response.json()
        setErrorMessage(`Upload failed: ${error.message}`)
        setSuccessMessage(null)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage('Upload failed. Please try again.')
      setSuccessMessage(null)
    } finally {
      setIsUploading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to upload your designs</p>
          <button 
            onClick={() => router.push('/api/auth/signin')}
            className="bg-indigo-700 text-white px-6 py-2 rounded-lg hover:bg-indigo-800 font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Upload New Design
            </h1>
            <p className="text-gray-600 mt-1">Share your fashion designs with the community</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-green-800 font-medium">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800"
                aria-label="Close success message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <X className="h-5 w-5 text-red-600 mr-3" />
                <span className="text-red-800 font-medium">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-600 hover:text-red-800"
                aria-label="Close error message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ImageIcon className="inline h-4 w-4 mr-1" />
                  Design File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors relative">
                  {preview ? (
                    <div className="space-y-4">
                      <Image 
                        src={preview || ''} 
                        alt="Preview" 
                        width={256}
                        height={256}
                        className="max-h-64 mx-auto rounded-lg shadow-sm"
                        placeholder="empty"
                      />
                      <button
                        type="button"
                        onClick={() => setPreview(null)}
                        className="text-sm text-indigo-700 hover:text-indigo-900 font-medium"
                      >
                        Change file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Upload design file"
                    aria-label="Upload design file"
                    required
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Type className="inline h-4 w-4 mr-1" />
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      console.log('Title input changed:', e.target.value)
                      setFormData({...formData, title: e.target.value})
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    placeholder="Enter design title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="inline h-4 w-4 mr-1" />
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      console.log('Description changed:', e.target.value)
                      setFormData({...formData, description: e.target.value})
                    }}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    placeholder="Describe your design..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    Regular Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => {
                      console.log('Price changed:', e.target.value)
                      setFormData({...formData, price: e.target.value})
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buying Options
                  </label>
                  <select
                    value={formData.buyingTypes}
                    onChange={(e) => setFormData({...formData, buyingTypes: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    title="Select buying options"
                  >
                    <option value="REGULAR">Regular Only (Multiple buyers allowed)</option>
                    <option value="OWNERSHIP">Ownership Only (Single buyer, exclusive)</option>
                    <option value="BOTH">Both Options Available</option>
                  </select>
                </div>

                {(formData.buyingTypes === 'OWNERSHIP' || formData.buyingTypes === 'BOTH') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Ownership Price (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.ownershipPrice}
                      onChange={(e) => {
                        console.log('Ownership price changed:', e.target.value)
                        setFormData({...formData, ownershipPrice: e.target.value})
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                      placeholder="0.00"
                      required={formData.buyingTypes === 'OWNERSHIP' || formData.buyingTypes === 'BOTH'}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Higher price for exclusive ownership and branding rights
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    title="Select design category"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    placeholder="e.g. summer,dress,elegant (comma-separated)"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-6 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Design
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}