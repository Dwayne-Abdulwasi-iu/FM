'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  BadgeCheck,
  Shield,
  Award,
  Star,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react'

interface VerificationStatus {
  status: string
  badge: string | null
  verificationDate: string | null
  isVerified: boolean
  latestRequest: {
    id: string
    status: string
    portfolioUrl: string | null
    socialProof: string[]
    reviewNotes: string | null
    createdAt: string
  } | null
}

export default function VerificationPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [socialProof, setSocialProof] = useState<string[]>([''])
  const [businessLicense, setBusinessLicense] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchStatus()
  }, [session, sessionStatus])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/verification/request')
      if (response.ok) {
        const data = await response.json()
        setVerificationStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch verification status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/verification/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioUrl: portfolioUrl || undefined,
          socialProof: socialProof.filter(s => s.trim()),
          businessLicense: businessLicense || undefined,
        }),
      })

      if (response.ok) {
        setSuccess(true)
        fetchStatus()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to submit request')
      }
    } catch (error) {
      setError('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const addSocialProof = () => {
    setSocialProof([...socialProof, ''])
  }

  const removeSocialProof = (index: number) => {
    setSocialProof(socialProof.filter((_, i) => i !== index))
  }

  const updateSocialProof = (index: number, value: string) => {
    const updated = [...socialProof]
    updated[index] = value
    setSocialProof(updated)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getBadgeInfo = (badge: string | null) => {
    switch (badge) {
      case 'TOP_SELLER':
        return {
          icon: <Award className="w-6 h-6 text-yellow-500" />,
          name: 'Top Seller',
          description: 'Achieved high sales volume',
          color: 'bg-yellow-50 border-yellow-200',
        }
      case 'VERIFIED_PRO':
        return {
          icon: <BadgeCheck className="w-6 h-6 text-blue-500" />,
          name: 'Verified Pro',
          description: 'Professional verification completed',
          color: 'bg-blue-50 border-blue-200',
        }
      case 'RISING_STAR':
        return {
          icon: <Star className="w-6 h-6 text-purple-500" />,
          name: 'Rising Star',
          description: 'Fast-growing new designer',
          color: 'bg-purple-50 border-purple-200',
        }
      default:
        return null
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-48 mb-8" />
          <div className="h-64 bg-gray-300 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Center</h1>
        <p className="text-gray-600 mb-8">
          Get verified to build trust with buyers and unlock special badges
        </p>

        {/* Current Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Status</h2>
          
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {getStatusIcon(verificationStatus?.status || 'UNVERIFIED')}
            <div>
              <p className="font-medium text-gray-900">
                {verificationStatus?.status === 'VERIFIED' ? 'Verified' :
                 verificationStatus?.status === 'PENDING' ? 'Verification Pending' :
                 verificationStatus?.status === 'REJECTED' ? 'Verification Rejected' :
                 'Not Verified'}
              </p>
              <p className="text-sm text-gray-500">
                {verificationStatus?.status === 'VERIFIED' && verificationStatus.verificationDate &&
                  `Verified on ${new Date(verificationStatus.verificationDate).toLocaleDateString()}`}
                {verificationStatus?.status === 'PENDING' &&
                  'Your verification request is being reviewed'}
                {verificationStatus?.status === 'REJECTED' &&
                  verificationStatus.latestRequest?.reviewNotes}
                {verificationStatus?.status === 'UNVERIFIED' &&
                  'Complete verification to get a verified badge'}
              </p>
            </div>
          </div>

          {/* Badge Display */}
          {verificationStatus?.badge && (
            <div className="mt-4">
              {(() => {
                const badgeInfo = getBadgeInfo(verificationStatus.badge)
                if (!badgeInfo) return null
                return (
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${badgeInfo.color}`}>
                    {badgeInfo.icon}
                    <div>
                      <p className="font-medium">{badgeInfo.name}</p>
                      <p className="text-sm text-gray-600">{badgeInfo.description}</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Benefits of Verification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Trust Badge</p>
                <p className="text-sm text-gray-500">Display verification badge on your profile</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Priority Listing</p>
                <p className="text-sm text-gray-500">Your designs appear higher in search</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Buyer Confidence</p>
                <p className="text-sm text-gray-500">Buyers trust verified sellers more</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BadgeCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Featured Opportunities</p>
                <p className="text-sm text-gray-500">Get featured on homepage collections</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Form */}
        {(!verificationStatus?.isVerified && verificationStatus?.status !== 'PENDING') && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Apply for Verification</h2>
            
            {success ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Submitted!</h3>
                <p className="text-gray-600">
                  We'll review your application and get back to you within 3-5 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://your-portfolio.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Link to your professional portfolio (Behance, Dribbble, personal site)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Social Proof Links
                  </label>
                  {socialProof.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateSocialProof(index, e.target.value)}
                        placeholder="https://instagram.com/your-profile"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      {socialProof.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSocialProof(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          aria-label={`Remove social proof link ${index + 1}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSocialProof}
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-4 h-4" />
                    Add another link
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Links to your social media profiles (Instagram, Twitter, LinkedIn)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business License (Optional)
                  </label>
                  <input
                    type="text"
                    value={businessLicense}
                    onChange={(e) => setBusinessLicense(e.target.value)}
                    placeholder="Business registration number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If you have a registered business, provide your license number
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Submitting...' : 'Submit Verification Request'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
