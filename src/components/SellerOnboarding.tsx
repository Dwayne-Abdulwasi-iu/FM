'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Upload, CheckCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'

const STEPS = [
  { number: 1, title: 'Quick Profile', time: '2 mins' },
  { number: 2, title: 'First Product', time: '5 mins' },
  { number: 3, title: 'Photos', time: '5 mins' },
  { number: 4, title: 'Submit', time: '1 min' },
]

const CATEGORIES = [
  'Dresses',
  'Shirts',
  'Pants',
  'Skirts',
  'Accessories',
  'Shoes',
  'Jackets',
  'Other',
]

interface FormData {
  // Step 1
  storeName: string
  category: string
  // Step 2
  productTitle: string
  productDesc: string
  productPrice: string
  // Step 3
  photos: File[]
}

interface FormErrors {
  storeName?: string
  category?: string
  productTitle?: string
  productDesc?: string
  productPrice?: string
  photos?: string
}

export function SellerOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    storeName: '',
    category: '',
    productTitle: '',
    productDesc: '',
    productPrice: '',
    photos: [],
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validateStep = (): boolean => {
    const newErrors: FormErrors = {}

    if (step === 1) {
      if (!formData.storeName.trim()) {
        newErrors.storeName = 'Store name is required'
      }
      if (!formData.category) {
        newErrors.category = 'Category is required'
      }
    } else if (step === 2) {
      if (!formData.productTitle.trim()) {
        newErrors.productTitle = 'Product name is required'
      }
      if (!formData.productDesc.trim()) {
        newErrors.productDesc = 'Product description is required'
      }
      if (!formData.productPrice) {
        newErrors.productPrice = 'Price is required'
      } else if (isNaN(parseFloat(formData.productPrice)) || parseFloat(formData.productPrice) <= 0) {
        newErrors.productPrice = 'Please enter a valid price'
      }
    } else if (step === 3) {
      if (formData.photos.length < 3) {
        newErrors.photos = 'At least 3 photos are required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    setErrors((prev) => {
      const updated = { ...prev }
      delete updated[field as keyof FormErrors]
      return updated
    })
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPhotos = [...formData.photos, ...files].slice(0, 10) // Max 10 photos
    handleInputChange('photos', newPhotos)
  }

  const removePhoto = (index: number) => {
    handleInputChange('photos', formData.photos.filter((_, i) => i !== index))
  }

  const handleNext = async () => {
    if (!validateStep()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep()) {
      toast.error('Please complete all fields')
      return
    }

    setLoading(true)

    try {
      // Upload photos first
      const photoUrls: string[] = []

      for (const file of formData.photos) {
        const formDataObj = new FormData()
        formDataObj.append('file', file)
        formDataObj.append('folder', 'boutique-products')

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formDataObj,
        })

        if (!uploadRes.ok) {
          throw new Error('Failed to upload photo')
        }

        const uploadData = await uploadRes.json()
        photoUrls.push(uploadData.url)
      }

      // Create seller profile + product
      const response = await fetch('/api/onboarding/quickstart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: formData.storeName,
          category: formData.category,
          product: {
            title: formData.productTitle,
            description: formData.productDesc,
            basePrice: parseFloat(formData.productPrice),
            photos: photoUrls,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create store')
      }

      toast.success('Store created! Admin will review within 24 hours.')
      router.push('/seller/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create store')
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = (step / 4) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Launch Your Store
          </h1>
          <p className="text-gray-600">
            Get your first product live in just 13 minutes
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-6">
            {STEPS.map((s) => (
              <div key={s.number} className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    s.number < step
                      ? 'bg-green-500 text-white'
                      : s.number === step
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s.number < step ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    s.number
                  )}
                </div>
                <div className="text-xs font-medium text-gray-700 mt-2 text-center">
                  {s.title}
                </div>
                <div className="text-xs text-gray-500">{s.time}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-center text-sm text-gray-600 mt-3">
            Step {step} of 4 • {13 - step * 3} mins remaining
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Let's set up your store
                </h2>
                <p className="text-gray-600">
                  Tell us your name and what you design
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Name *
                </label>
                <input
                  type="text"
                  placeholder="Your name or brand (e.g., 'Zainab's Fashion')"
                  value={formData.storeName}
                  onChange={(e) => handleInputChange('storeName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    errors.storeName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.storeName && (
                  <p className="text-red-600 text-sm mt-1">{errors.storeName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you design? *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Choose a category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-600 text-sm mt-1">{errors.category}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Product */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Add your first product
                </h2>
                <p className="text-gray-600">
                  Tell us about the design you want to sell
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 'Blue Asöke Gown'"
                  value={formData.productTitle}
                  onChange={(e) => handleInputChange('productTitle', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    errors.productTitle ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.productTitle && (
                  <p className="text-red-600 text-sm mt-1">{errors.productTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  placeholder="Describe your design (colors, materials, style, etc.)"
                  value={formData.productDesc}
                  onChange={(e) => handleInputChange('productDesc', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none ${
                    errors.productDesc ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.productDesc && (
                  <p className="text-red-600 text-sm mt-1">{errors.productDesc}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₦ NGN) *
                </label>
                <input
                  type="number"
                  placeholder="5000"
                  min="1"
                  value={formData.productPrice}
                  onChange={(e) => handleInputChange('productPrice', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    errors.productPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.productPrice && (
                  <p className="text-red-600 text-sm mt-1">{errors.productPrice}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Upload photos (3+)
                </h2>
                <p className="text-gray-600">
                  Show your product from different angles
                </p>
              </div>

              <div className="border-2 border-dashed border-indigo-200 rounded-lg p-8 text-center hover:bg-indigo-50 transition">
                <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <p className="text-indigo-600 font-medium">
                    Click to upload photos
                  </p>
                  <p className="text-gray-500 text-sm">
                    or drag and drop
                  </p>
                </label>
              </div>

              {formData.photos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Photos uploaded: {formData.photos.length}/10
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {formData.photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square group"
                      >
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                        >
                          <span className="text-white text-sm font-bold">Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.photos && (
                <p className="text-red-600 text-sm">{errors.photos}</p>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Ready to launch?
                </h2>
                <p className="text-gray-600">
                  Review your information before submitting
                </p>
              </div>

              <div className="space-y-4 bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Store Name</p>
                    <p className="text-gray-700">{formData.storeName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Category</p>
                    <p className="text-gray-700">{formData.category}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">First Product</p>
                    <p className="text-gray-700">
                      {formData.productTitle} • ₦{parseFloat(formData.productPrice || '0').toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">Photos</p>
                    <p className="text-gray-700">{formData.photos.length} uploaded</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  ✓ Admin will review your product within 24 hours<br />
                  ✓ We'll email you updates and next steps<br />
                  ✓ You can manage your store anytime
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <button
            onClick={step === 4 ? handleSubmit : handleNext}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading && step === 4 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Store...
              </>
            ) : step === 4 ? (
              <>
                Create Store
                <CheckCircle className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
