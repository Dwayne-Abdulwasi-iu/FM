'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Upload, Image as ImageIcon, DollarSign, Tag, Type, FileText, CheckCircle, X, Plus, Trash2, Eye, Lock, Package, Palette, ExternalLink, Info } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface MediaFile {
  id: string
  file: File | null
  preview: string | null
  accessType: 'FREE' | 'PREMIUM'
  fileType: 'IMAGE' | 'VIDEO'
}

interface FeatureStatus {
  acceptsCommissions: boolean
  acceptsPOD: boolean
}

export default function EnhancedUploadPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [bankAccountRequired, setBankAccountRequired] = useState(false)
  const [bankAccountNeedsVerification, setBankAccountNeedsVerification] = useState(false)
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>({ acceptsCommissions: false, acceptsPOD: false })
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
      fetchFeatureStatus()
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

  const fetchFeatureStatus = async () => {
    try {
      // Fetch commission settings
      const commissionRes = await fetch('/api/seller/commission-settings')
      // Fetch POD settings
      const podRes = await fetch('/api/seller/pod-settings')
      
      let commissionStatus = false
      let podStatus = false
      
      if (commissionRes.ok) {
        const data = await commissionRes.json()
        commissionStatus = data.acceptsCommissions ?? false
      }
      
      if (podRes.ok) {
        const data = await podRes.json()
        podStatus = data.acceptsPOD ?? false
      }
      
      setFeatureStatus({
        acceptsCommissions: commissionStatus,
        acceptsPOD: podStatus
      })
    } catch (error) {
      console.error('Error fetching feature status:', error)
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-1.5">
              <Upload className="h-4 sm:h-5 w-4 sm:w-5" />
              Upload New Design
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Share your fashion designs with multiple media files</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mx-3 sm:mx-6 mt-3 sm:mt-6 p-2.5 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-green-800 font-medium">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800 ml-2 flex-shrink-0"
                aria-label="Close success message"
              >
                <X className="h-3 sm:h-4 w-3 sm:w-4" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mx-3 sm:mx-6 mt-3 sm:mt-6 p-2.5 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <X className="h-4 sm:h-5 w-4 sm:w-5 text-red-600 mr-2 sm:mr-3 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-red-800 font-medium">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-600 hover:text-red-800 ml-2 flex-shrink-0"
                aria-label="Close error message"
              >
                <X className="h-3 sm:h-4 w-3 sm:w-4" />
              </button>
            </div>
          )}

          {/* Bank Account Required Message */}
          {bankAccountRequired && (
            <div className="mx-3 sm:mx-6 mt-3 sm:mt-6 p-3 sm:p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <DollarSign className="h-4 sm:h-6 w-4 sm:w-6 text-yellow-600 mt-0.5 sm:mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base text-yellow-800 font-semibold mb-1.5 sm:mb-2">Bank Account Required</h3>
                  <p className="text-xs sm:text-sm text-yellow-700 mb-2.5 sm:mb-4 leading-tight">
                    To upload designs and receive payments, you need to add your bank account details first. 
                    This ensures you can receive your earnings when customers purchase your designs.
                  </p>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => router.push('/profile#bank-account')}
                      className="bg-yellow-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-yellow-700 font-medium transition-colors text-xs sm:text-sm"
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
            <div className="mx-3 sm:mx-6 mt-3 sm:mt-6 p-3 sm:p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="h-4 sm:h-6 w-4 sm:w-6 text-blue-600 mt-0.5 sm:mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base text-blue-800 font-semibold mb-1.5 sm:mb-2">Bank Account Verification Required</h3>
                  <p className="text-xs sm:text-sm text-blue-700 mb-2.5 sm:mb-4 leading-tight">
                    Your bank account has been added but needs to be verified before you can upload designs. 
                    Verification enables automatic payments with our split payment system.
                  </p>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => router.push('/profile#bank-verification')}
                      className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors text-xs sm:text-sm"
                    >
                      Verify Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feature Availability Notifications */}
          <div className="mx-3 sm:mx-6 mt-3 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Commission Availability */}
            <div className={`p-3 rounded-lg border ${
              featureStatus.acceptsCommissions 
                ? 'bg-purple-50 border-purple-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-2">
                <Palette className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  featureStatus.acceptsCommissions ? 'text-purple-600' : 'text-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900">Commissions</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      featureStatus.acceptsCommissions 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {featureStatus.acceptsCommissions ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-2">
                    {featureStatus.acceptsCommissions 
                      ? 'Buyers can request custom work based on your designs.' 
                      : 'Enable to receive custom design requests from buyers.'}
                  </p>
                  <Link
                    href="/seller/commission-settings"
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-purple-600 hover:text-purple-800 font-medium"
                  >
                    {featureStatus.acceptsCommissions ? 'Manage' : 'Enable'} Commissions
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* POD Availability */}
            <div className={`p-3 rounded-lg border ${
              featureStatus.acceptsPOD 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-2">
                <Package className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  featureStatus.acceptsPOD ? 'text-orange-600' : 'text-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900">Print-on-Demand</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      featureStatus.acceptsPOD 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {featureStatus.acceptsPOD ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-2">
                    {featureStatus.acceptsPOD 
                      ? 'Buyers can purchase your designs on physical products.' 
                      : 'Enable to sell your designs on t-shirts, mugs & more.'}
                  </p>
                  <Link
                    href="/seller/pod-settings"
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-orange-600 hover:text-orange-800 font-medium"
                  >
                    {featureStatus.acceptsPOD ? 'Manage' : 'Enable'} POD
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <form onSubmit={handleSubmit} className={`p-3 sm:p-6 ${(bankAccountRequired || bankAccountNeedsVerification) ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {/* Media Files Upload */}
              <div>
                <div className="flex items-center justify-between mb-2.5 sm:mb-4 gap-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 min-w-0">
                    <ImageIcon className="inline h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                    Media Files (Images & Videos)
                  </label>
                  <button
                    type="button"
                    onClick={addMediaSection}
                    className="inline-flex items-center px-2 sm:px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 flex-shrink-0"
                  >
                    <Plus className="h-2.5 sm:h-3 w-2.5 sm:w-3 mr-0.5 sm:mr-1" />
                    Add File
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {mediaFiles.map((media, index) => (
                    <div key={media.id} className="border border-gray-200 rounded-lg p-2.5 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                          File {index + 1}
                        </span>
                        {mediaFiles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMediaSection(media.id)}
                            className="text-red-600 hover:text-red-800 p-0.5"
                            aria-label="Remove file section"
                          >
                            <Trash2 className="h-3 sm:h-4 w-3 sm:w-4" />
                          </button>
                        )}
                      </div>

                      {/* File Upload */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-2.5 sm:p-4 text-center hover:border-indigo-500 transition-colors relative mb-2 sm:mb-3">
                        {media.preview ? (
                          <div className="space-y-2">
                            {media.fileType === 'VIDEO' ? (
                              <video 
                                src={media.preview} 
                                className="max-h-32 mx-auto rounded"
                                controls
                              />
                            ) : (
                              <Image 
                                src={media.preview || ''} 
                                alt="Preview" 
                                width={128}
                                height={128}
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
                              className="text-xs sm:text-sm text-indigo-700 hover:text-indigo-900 font-medium"
                            >
                              Change file
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-center mb-1.5 sm:mb-2">
                              <Upload className="h-5 sm:h-8 w-5 sm:w-8 text-gray-400" />
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Click to upload or drag and drop</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">Images: PNG, JPG, GIF | Videos: MP4, MOV, AVI</p>
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-gray-600">Access Type:</span>
                        <div className="flex space-x-1.5 sm:space-x-2">
                          <button
                            type="button"
                            onClick={() => updateMediaAccessType(media.id, 'FREE')}
                            className={`inline-flex items-center px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded ${
                              media.accessType === 'FREE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                            }`}
                          >
                            <Eye className="h-2.5 sm:h-3 w-2.5 sm:w-3 mr-0.5 sm:mr-1" />
                            Free View
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMediaAccessType(media.id, 'PREMIUM')}
                            className={`inline-flex items-center px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded ${
                              media.accessType === 'PREMIUM'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
                            }`}
                          >
                            <Lock className="h-2.5 sm:h-3 w-2.5 sm:w-3 mr-0.5 sm:mr-1" />
                            Premium
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3.5 sm:space-y-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    <Type className="inline h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    placeholder="Enter design title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    <FileText className="inline h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    placeholder="Describe your design..."
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    <DollarSign className="inline h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                    Regular Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Buying Options
                  </label>
                  <select
                    value={formData.buyingTypes}
                    onChange={(e) => setFormData({...formData, buyingTypes: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    title="Select buying options"
                  >
                    <option value="REGULAR">Regular Only (Multiple buyers allowed)</option>
                    <option value="OWNERSHIP">Ownership Only (Single buyer, exclusive)</option>
                    <option value="BOTH">Both Options Available</option>
                  </select>
                </div>

                {(formData.buyingTypes === 'OWNERSHIP' || formData.buyingTypes === 'BOTH') && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      <DollarSign className="inline h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                      Ownership Price (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.ownershipPrice}
                      onChange={(e) => setFormData({...formData, ownershipPrice: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                      placeholder="0.00"
                      required={formData.buyingTypes === 'OWNERSHIP' || formData.buyingTypes === 'BOTH'}
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      Higher price for exclusive ownership and branding rights
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    title="Select design category"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    <Tag className="inline h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    placeholder="e.g. summer,dress,elegant (comma-separated)"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-8 flex justify-end gap-2.5 sm:gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 sm:px-6 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 sm:px-6 py-1.5 sm:py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 font-medium text-xs sm:text-sm"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin h-3 sm:h-4 w-3 sm:w-4 border-2 border-white border-t-transparent rounded-full" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3 sm:h-4 w-3 sm:w-4" />
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