'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Upload, Image as ImageIcon, DollarSign, Tag, Type, FileText, CheckCircle, X, Plus, Trash2, Eye, Lock, Package, Palette, ExternalLink } from 'lucide-react'
import _Image from 'next/image'
import Link from 'next/link'
import SignaturePad from '@/components/SignaturePad'

interface MediaFile {
  id: string
  file: File | null
  preview: string | null
  accessType: 'FREE' | 'PREMIUM'
  fileType: 'IMAGE' | 'VIDEO'
  displayName: string | null
}

interface FeatureStatus {
  acceptsCommissions: boolean
  acceptsPOD: boolean
}

export default function EnhancedUploadPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [bankAccountRequired, setBankAccountRequired] = useState(false)
  const [bankAccountNeedsVerification, setBankAccountNeedsVerification] = useState(false)
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>({ acceptsCommissions: false, acceptsPOD: false })
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([
    { id: '1', file: null, preview: null, accessType: 'PREMIUM', fileType: 'IMAGE', displayName: null }
  ])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    ownershipPrice: '',
    category: 'Fashion Illustrations',
    tags: '',
    buyingTypes: 'REGULAR',
    currency: 'USD'
  })
  const [ownershipData, setOwnershipData] = useState({
    sellerFullName: '',
    sellerUsername: '',
    sellerSignature: '',
    previewFile: null as File | null,
    previewDescription: ''
  })
  const [ownershipDocumentCreated, setOwnershipDocumentCreated] = useState(false)

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
      fileType: 'IMAGE',
      displayName: null
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
          ? { ...media, file, preview: e.target?.result as string, fileType, displayName: file.name }
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

    // Validate title is not empty
    if (!formData.title.trim()) {
      setErrorMessage('Please enter a design title')
      setSuccessMessage(null)
      titleInputRef.current?.focus()
      titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // Validate at least one file is uploaded
    const filesWithContent = mediaFiles.filter(media => media.file)
    if (filesWithContent.length === 0) {
      setErrorMessage('Please upload at least one media file')
      setSuccessMessage(null)
      return
    }

    // Validate ownership fields if ownership is selected
    if (formData.buyingTypes === 'OWNERSHIP' || formData.buyingTypes === 'BOTH') {
      if (!ownershipData.sellerFullName.trim()) {
        setErrorMessage('Please enter your full legal name for ownership transfer')
        setSuccessMessage(null)
        return
      }
      if (!ownershipData.sellerSignature.trim()) {
        setErrorMessage('Please provide your signature for the ownership agreement')
        setSuccessMessage(null)
        return
      }
      if (!ownershipData.previewFile) {
        setErrorMessage('Preview file is required for ownership sales. Upload an image or video for the 7-day escrow period.')
        setSuccessMessage(null)
        return
      }
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
      uploadFormData.append('currency', formData.currency)

      // Add media files with metadata
      filesWithContent.forEach((media, index) => {
        if (media.file) {
          uploadFormData.append(`files`, media.file)
          uploadFormData.append(`fileMetadata`, JSON.stringify({
            accessType: media.accessType,
            fileType: media.fileType,
            sortOrder: index,
            displayName: media.displayName || media.file.name
          }))
        }
      })

      const response = await fetch('/api/designs/upload-multi', {
        method: 'POST',
        body: uploadFormData
      })

      if (response.ok) {
        const result = await response.json()
        
        // Submit ownership document if ownership is selected
        if (formData.buyingTypes === 'OWNERSHIP' || formData.buyingTypes === 'BOTH') {
          try {
            const ownershipRes = await fetch('/api/ownership-documents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                designId: result.id,
                sellerFullName: ownershipData.sellerFullName,
                sellerUsername: ownershipData.sellerUsername,
                sellerSignature: ownershipData.sellerSignature
              })
            })
            if (ownershipRes.ok) {
              setOwnershipDocumentCreated(true)
              
              // Upload preview file if provided
              if (ownershipData.previewFile) {
                try {
                  const ownershipData_result = await ownershipRes.json()
                  const documentId = ownershipData_result.document?.id || ownershipData_result.id
                  
                  if (documentId) {
                    const previewFormData = new FormData()
                    previewFormData.append('file', ownershipData.previewFile)
                    previewFormData.append('documentId', documentId)
                    previewFormData.append('description', ownershipData.previewDescription || '')
                    
                    await fetch('/api/ownership-documents/preview', {
                      method: 'POST',
                      body: previewFormData
                    })
                  }
                } catch (error) {
                  console.error('Preview file upload error:', error)
                  // Don't fail if preview upload fails
                }
              }
            }
          } catch (error) {
            console.error('Ownership document submission error:', error)
            // Don't fail the upload if ownership document fails
          }
        }
        
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
                      onClick={() => router.push('/profile?tab=account&action=add-bank#bank-account')}
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

                {/* Seller Recommendation Message */}
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-800">
                    <span className="font-semibold">Recommended:</span> Upload at least 2 pictures of design product in free view
                  </p>
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
                              <img 
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
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">Access Type:</span>
                        <div className="flex space-x-1.5 sm:space-x-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => updateMediaAccessType(media.id, 'FREE')}
                            className={`inline-flex items-center px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap ${
                              media.accessType === 'FREE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                            }`}
                          >
                            <Eye className="h-2.5 sm:h-3 w-2.5 sm:w-3 mr-0.5 sm:mr-1 flex-shrink-0" />
                            Free View
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMediaAccessType(media.id, 'PREMIUM')}
                            className={`inline-flex items-center px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap ${
                              media.accessType === 'PREMIUM'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
                            }`}
                          >
                            <Lock className="h-2.5 sm:h-3 w-2.5 sm:w-3 mr-0.5 sm:mr-1 flex-shrink-0" />
                            Premium
                          </button>
                        </div>
                      </div>

                      {/* Filename Input - Outside upload container */}
                      {media.file && (
                        <div className="mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                            Filename
                          </label>
                          <input
                            type="text"
                            value={media.displayName || ''}
                            onChange={(e) => setMediaFiles(mediaFiles.map(m =>
                              m.id === media.id
                                ? { ...m, displayName: e.target.value }
                                : m
                            ))}
                            className="w-full text-xs sm:text-sm border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter filename"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3.5 sm:space-y-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    <Type className="inline h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({...formData, title: e.target.value})
                      if (e.target.value.trim() && errorMessage?.includes('title')) {
                        setErrorMessage(null)
                      }
                    }}
                    className={`w-full border rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:border-indigo-500 text-black transition-colors ${
                      errorMessage && !formData.title.trim() 
                        ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-indigo-500'
                    }`}
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
                    Regular Price
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black bg-gray-50"
                      title="Select currency"
                    >
                      <option value="USD">🇺🇸 USD</option>
                      <option value="NGN">🇳🇬 NGN</option>
                    </select>
                    <input
                      type="number"
                      step={formData.currency === 'NGN' ? '1' : '0.01'}
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                      placeholder={formData.currency === 'NGN' ? '0' : '0.00'}
                      required
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                    {formData.currency === 'NGN' 
                      ? 'Enter price in Nigerian Naira. It will be converted to USD for international buyers.'
                      : 'Enter price in US Dollars. Nigerian buyers will see the NGN equivalent.'}
                  </p>
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
                      Ownership Price ({formData.currency})
                    </label>
                    <input
                      type="number"
                      step={formData.currency === 'NGN' ? '1' : '0.01'}
                      min="0"
                      value={formData.ownershipPrice}
                      onChange={(e) => setFormData({...formData, ownershipPrice: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                      placeholder={formData.currency === 'NGN' ? '0' : '0.00'}
                      required={formData.buyingTypes === 'OWNERSHIP' || formData.buyingTypes === 'BOTH'}
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      Higher price for exclusive ownership and branding rights
                    </p>
                  </div>
                )}

                {(formData.buyingTypes === 'OWNERSHIP' || formData.buyingTypes === 'BOTH') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      Ownership Transfer Agreement
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-800">
                      By selecting ownership, you're agreeing to transfer exclusive rights to the design buyer. A legally binding contract will be created and both parties will receive a copy.
                    </p>

                    <div className="bg-white border border-blue-300 rounded p-3 max-h-40 overflow-y-auto text-xs sm:text-sm text-gray-700">
                      <p className="font-semibold mb-2">Contract Preview:</p>
                      <p className="mb-2">This Design Ownership Transfer Agreement grants exclusive ownership of the design to the buyer. The designer retains no rights to use, modify, or distribute the design after the transfer is complete.</p>
                      <p className="text-[11px] text-gray-600">Full legal contract will be displayed to buyer before purchase completion.</p>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={ownershipData.sellerFullName}
                          onChange={(e) => setOwnershipData({...ownershipData, sellerFullName: e.target.value})}
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                          placeholder="Your full legal name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Username (Optional)
                        </label>
                        <input
                          type="text"
                          value={ownershipData.sellerUsername}
                          onChange={(e) => setOwnershipData({...ownershipData, sellerUsername: e.target.value})}
                          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                          placeholder="Your platform username (optional)"
                        />
                      </div>

                      <div>
                        <SignaturePad 
                          onSignatureChange={(sig) => setOwnershipData({...ownershipData, sellerSignature: sig})}
                          label="Your Signature"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-blue-300 pt-3 mt-3">
                      <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Preview File for Escrow <span className="text-red-500">*</span>
                      </h4>
                      <p className="text-xs text-blue-800">
                        Upload an image or video (max 2 min) that buyers will view during the 7-day escrow period before ownership transfer finalizes.
                      </p>
                      
                      <div>
                        <label className="block text-xs font-medium text-blue-900 mb-1">
                          Preview File (Image or Video) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.type.startsWith('video/') && file.size > 100 * 1024 * 1024) {
                                setErrorMessage('Video must be less than 100MB')
                              } else if (file.type.startsWith('image/') && file.size > 50 * 1024 * 1024) {
                                setErrorMessage('Image must be less than 50MB')
                              } else {
                                setOwnershipData({...ownershipData, previewFile: file})
                                setErrorMessage(null)
                              }
                            }
                          }}
                          className="w-full border border-blue-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                        />
                        {ownershipData.previewFile && (
                          <p className="text-xs text-blue-700 mt-1">
                            Selected: {ownershipData.previewFile.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-blue-900 mb-1">
                          Preview Description (Optional)
                        </label>
                        <textarea
                          value={ownershipData.previewDescription}
                          onChange={(e) => setOwnershipData({...ownershipData, previewDescription: e.target.value})}
                          placeholder="Describe what buyers will see in this preview"
                          className="w-full border border-blue-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 text-black resize-none"
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="bg-blue-100 border border-blue-300 rounded p-2.5 text-xs sm:text-sm text-blue-900">
                      ✓ By providing your details above, you agree to the Ownership Transfer Agreement and accept that the buyer will have exclusive rights to this design.
                    </div>
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