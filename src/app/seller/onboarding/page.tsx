'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  CheckCircle, 
  ChevronRight, 
  Upload, 
  Settings, 
  Palette, 
  DollarSign, 
  User,
  Camera,
  X,
  Sparkles
} from 'lucide-react'

interface OnboardingStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
}

export default function DesignerOnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  // Profile data
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [profileImage, setProfileImage] = useState<string | null>(null)
  
  // Commission settings
  const [acceptsCommissions, setAcceptsCommissions] = useState(false)
  const [commissionMinBudget, setCommissionMinBudget] = useState<number | null>(null)
  const [commissionMaxBudget, setCommissionMaxBudget] = useState<number | null>(null)
  const [commissionTurnaround, setCommissionTurnaround] = useState('')

  const SPECIALTY_OPTIONS = [
    'Fashion Illustrations',
    'Pattern Designs',
    'Digital Designs',
    'Technical Drawings',
    'Embroidery',
    'African Fashion',
    'Ankara Prints',
    'Bridal Wear',
    'Streetwear',
    'Sustainable Fashion',
  ]

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user should see onboarding
    checkOnboardingStatus()
  }, [session, status, router])

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        // Pre-fill existing data
        if (data.user) {
          setDisplayName(data.user.displayName || data.user.name || '')
          setBio(data.user.bio || '')
          setSpecialties(data.user.specialties || [])
          setProfileImage(data.user.image || null)
          setAcceptsCommissions(data.user.acceptsCommissions || false)
          setCommissionMinBudget(data.user.commissionMinBudget || null)
          setCommissionMaxBudget(data.user.commissionMaxBudget || null)
          setCommissionTurnaround(data.user.commissionTurnaround || '')
          
          // Determine starting step based on completed data
          if (data.user.bio && data.user.specialties?.length > 0) {
            setCurrentStep(3)
          } else if (data.user.displayName || data.user.name) {
            setCurrentStep(2)
          }
        }
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error)
    } finally {
      setLoading(false)
    }
  }

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Basic Info',
      description: 'Set up your display name and profile picture',
      icon: <User className="h-5 w-5" />,
      completed: currentStep > 1,
    },
    {
      id: 2,
      title: 'Your Specialties',
      description: 'Tell us what you design',
      icon: <Palette className="h-5 w-5" />,
      completed: currentStep > 2,
    },
    {
      id: 3,
      title: 'Commission Settings',
      description: 'Configure how customers can hire you',
      icon: <DollarSign className="h-5 w-5" />,
      completed: currentStep > 3,
    },
    {
      id: 4,
      title: 'Upload First Design',
      description: 'List your first design for sale',
      icon: <Upload className="h-5 w-5" />,
      completed: currentStep > 4,
    },
  ]

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'profile-images')

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setProfileImage(data.url)
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
    }
  }

  const toggleSpecialty = (specialty: string) => {
    setSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    )
  }

  const saveProgress = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          bio,
          specialties,
          image: profileImage,
        }),
      })

      if (response.ok && currentStep === 3) {
        // Save commission settings
        await fetch('/api/seller/commission-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acceptsCommissions,
            commissionStatus: acceptsCommissions ? 'OPEN' : 'CLOSED',
            commissionMinBudget,
            commissionMaxBudget,
            commissionTurnaround,
            commissionTypes: specialties,
          }),
        })
      }

      return true
    } catch (error) {
      console.error('Failed to save progress:', error)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    const saved = await saveProgress()
    if (saved) {
      if (currentStep === 4) {
        router.push('/upload')
      } else {
        setCurrentStep(prev => prev + 1)
      }
    }
  }

  const handleSkip = () => {
    if (currentStep === 4) {
      router.push('/seller/dashboard')
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Welcome to Fashion Marketplace!
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Let&apos;s set up your designer profile
          </h1>
          <p className="text-gray-600">
            Complete these steps to start selling your designs
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className="text-xs text-gray-600 mt-2 text-center hidden sm:block">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Basic Information</h2>
                <p className="text-gray-600">How do you want to appear to customers?</p>
              </div>

              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                    {profileImage ? (
                      <Image
                        src={profileImage}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Camera className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700">
                    <Camera className="h-4 w-4" />
                    <span className="sr-only">Upload profile picture</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="Upload profile picture"
                    />
                  </label>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your designer name or brand"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell customers about yourself and your design style..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Your Specialties</h2>
                <p className="text-gray-600">Select the types of designs you create</p>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                {SPECIALTY_OPTIONS.map((specialty) => (
                  <button
                    key={specialty}
                    onClick={() => toggleSpecialty(specialty)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      specialties.includes(specialty)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {specialty}
                  </button>
                ))}
              </div>

              {specialties.length > 0 && (
                <p className="text-center text-sm text-green-600">
                  ✓ {specialties.length} specialties selected
                </p>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Commission Settings</h2>
                <p className="text-gray-600">Allow customers to request custom work from you</p>
              </div>

              {/* Accept Commissions Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Accept Custom Commissions</p>
                  <p className="text-sm text-gray-600">Let customers hire you for custom work</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptsCommissions}
                    onChange={(e) => setAcceptsCommissions(e.target.checked)}
                    className="sr-only peer"
                    aria-label="Accept custom commissions toggle"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {acceptsCommissions && (
                <>
                  {/* Budget Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Budget ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={commissionMinBudget || ''}
                        onChange={(e) => setCommissionMinBudget(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="50"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Budget ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={commissionMaxBudget || ''}
                        onChange={(e) => setCommissionMaxBudget(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="500"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Turnaround */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Typical Turnaround Time
                    </label>
                    <select
                      value={commissionTurnaround}
                      onChange={(e) => setCommissionTurnaround(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      title="Typical turnaround time"
                    >
                      <option value="">Select turnaround time</option>
                      <option value="1-3 days">1-3 days</option>
                      <option value="3-7 days">3-7 days</option>
                      <option value="1-2 weeks">1-2 weeks</option>
                      <option value="2-4 weeks">2-4 weeks</option>
                      <option value="1+ month">1+ month</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Profile Complete!</h2>
              <p className="text-gray-600">
                You&apos;re all set up. Now let&apos;s upload your first design to start selling!
              </p>
              
              <div className="bg-indigo-50 p-4 rounded-lg text-left">
                <h3 className="font-medium text-indigo-900 mb-2">Quick Tips:</h3>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• Use high-quality images (at least 1000x1000px)</li>
                  <li>• Write detailed descriptions with keywords</li>
                  <li>• Price competitively - check similar designs</li>
                  <li>• Add multiple media files to showcase your work</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              {currentStep === 4 ? 'Go to Dashboard' : 'Skip for now'}
            </button>
            
            <button
              onClick={handleNext}
              disabled={saving || (currentStep === 1 && !displayName)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  {currentStep === 4 ? 'Upload First Design' : 'Continue'}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip All */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/seller/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip onboarding and go to dashboard →
          </button>
        </div>
      </div>
    </div>
  )
}
