'use client'

import { useState, useEffect } from 'react'
import SafeImage from '@/components/ui/safe-image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Upload, Image as ImageIcon, DollarSign, Tag, Type, FileText, CheckCircle, X, Plus, Trash2, Eye, Lock } from 'lucide-react'

interface MediaFile {
  id: string
  file: File | null
  preview: string | null
  accessType: 'FREE' | 'PREMIUM'
  fileType: 'IMAGE' | 'VIDEO'
}

export default function EnhancedUploadPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [bankAccountRequired, setBankAccountRequired] = useState(false)
  const [bankAccountNeedsVerification, setBankAccountNeedsVerification] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([
    { id: '1', file: null, preview: null, accessType: 'PREMIUM', fileType: 'IMAGE' }
  ])
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
    'Concept Art'
  ]

  // Check bank account status when component loads
  useEffect(() => {
    if (session?.user?.id) {
      checkBankAccountStatus()
    }
  }, [session])

  const checkBankAccountStatus = async () => {
    try {
      const response = await fetch('/api/seller/account')
      if (response.ok) {
        const data = await response.json()
        if (!data.sellerAccount) {
          setBankAccountRequired(true)
        } else if (!data.sellerAccount.isVerified) {
          setBankAccountNeedsVerification(true)
        }
      } else if (response.status === 404) {
        setBankAccountRequired(true)
      }
    } catch (error) {
      console.error('Error checking bank account status:', error)
    }
  }

  const addMediaSection = () => {
    const newId = (mediaFiles.length + 1).toString()
    setMediaFiles([...mediaFiles, {
      id: newId,
      file: null,
      preview: null,
      accessType: 'PREMIUM',
      fileType: 'IMAGE'
    }])
  }

  const removeMediaSection = (id: string) => {
    if (mediaFiles.length > 1) {
      setMediaFiles(mediaFiles.filter(media => media.id !== id))
    }
  }

  const handleFileChange = (id: string, file: File) => {
    const fileType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'
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

    // Validate at least one file is uploaded
    const filesWithContent = mediaFiles.filter(media => media.file)
    if (filesWithContent.length === 0) {
      setErrorMessage('Please upload at least one media file')
      setSuccessMessage(null)
      return
    }

    setIsUploading(true)
    
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('price', formData.price)
      uploadFormData.append('ownershipPrice', formData.ownershipPrice)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('tags', formData.tags)
      uploadFormData.append('buyingTypes', formData.buyingTypes)

      // Add media files with metadata
      filesWithContent.forEach((media, index) => {
        if (media.file) {
          uploadFormData.append(`files`, media.file)
          uploadFormData.append(`fileMetadata`, JSON.stringify({
            accessType: media.accessType,
            fileType: media.fileType,
            sortOrder: index
          }))
        }
      })

      const response = await fetch('/api/designs/upload-multi', {
        method: 'POST',
        body: uploadFormData
      })

      if (response.ok) {
        const result = await response.json()
        setSuccessMessage('Design uploaded successfully! It will be visible once approved.')
        setErrorMessage(null)
        // Redirect after showing success message
        setTimeout(() => {
          router.push(`/designs/${result.id}`)
        }, 2000)
      } else {
        const error = await response.json()
        
        // Handle bank account requirement
        if (error.requiresBankAccount) {
          setBankAccountRequired(true)
          setErrorMessage(null)
        } else if (error.requiresVerification) {
          setBankAccountNeedsVerification(true)
          setErrorMessage(null)
        } else {
          setErrorMessage(`Upload failed: ${error.message}`)
        }
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
    <div className="min-h-screen bg-gray-50 py-6 xs:py-7 md:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 xs:px-5 md:px-6 py-3 xs:py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Upload New Design
            </h1>
            <p className="text-gray-600 mt-1">Share your fashion designs with multiple media files</p>
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

          {/* Bank Account Required Message */}
          {bankAccountRequired && (
            <div className="mx-6 mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <DollarSign className="h-6 w-6 text-yellow-600 mr-3 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-yellow-800 font-semibold text-lg mb-2">Bank Account Required</h3>
                  <p className="text-yellow-700 mb-4">
                    To upload designs and receive payments, you need to add your bank account details first. 
                    This ensures you can receive your earnings when customers purchase your designs.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push('/profile#bank-account')}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 font-medium transition-colors"
                    >
                      Add Bank Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bank Account Verification Required Message */}
          {bankAccountNeedsVerification && (
            <div className="mx-6 mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-blue-800 font-semibold text-lg mb-2">Bank Account Verification Required</h3>
                  <p className="text-blue-700 mb-4">
                    Your bank account has been added but needs to be verified before you can upload designs. 
                    Verification enables automatic payments with our split payment system.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push('/profile#bank-verification')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      Verify Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <form onSubmit={handleSubmit} className={`p-4 xs:p-5 md:p-6 ${(bankAccountRequired || bankAccountNeedsVerification) ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xs:gap-7 md:gap-8">
              {/* Media Files Upload */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    <ImageIcon className="inline h-4 w-4 mr-1" />
                    Media Files (Images & Videos)
                  </label>
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
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-500 transition-colors relative mb-3">
                        {media.preview ? (
                          <div className="space-y-2">
                            {media.fileType === 'VIDEO' ? (
                              <video 
                                src={media.preview} 
                                className="max-h-32 mx-auto rounded"
                                controls
                              />
                            ) : (
                              <SafeImage 
                                src={media.preview || ''} 
                                alt="Preview" 
                                className="max-h-32 mx-auto rounded"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setMediaFiles(mediaFiles.map(m => 
                                  m.id === media.id 
                                    ? { ...m, file: null, preview: null }
                                    : m
                                ))
                              }}
                              className="text-sm text-indigo-700 hover:text-indigo-900 font-medium"
                            >
                              Change file
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-center mb-2">
                              <Upload className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-600 text-sm mb-1">Click to upload or drag and drop</p>
                            <p className="text-xs text-gray-500">Images: PNG, JPG, GIF | Videos: MP4, MOV, AVI</p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileChange(media.id, file)
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Upload media file"
                        />
                      </div>

                      {/* Access Type Selection */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Access Type:</span>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => updateMediaAccessType(media.id, 'FREE')}
                            className={`inline-flex items-center px-3 py-1 text-xs rounded ${
                              media.accessType === 'FREE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                            }`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Free View
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMediaAccessType(media.id, 'PREMIUM')}
                            className={`inline-flex items-center px-3 py-1 text-xs rounded ${
                              media.accessType === 'PREMIUM'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
                            }`}
                          >
                            <Lock className="h-3 w-3 mr-1" />
                            Premium
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, ownershipPrice: e.target.value})}
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
    </div>
  )
}