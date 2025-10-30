'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { User, Mail, Calendar, Upload, DollarSign, TrendingUp, Eye, Heart, Settings, CreditCard, Edit, Trash2, CheckCircle, X } from 'lucide-react'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string | null
  email: string
  bio: string | null
  website: string | null
  location: string | null
  role: string
  createdAt: string
  isVerified: boolean
}

interface UserStats {
  totalDesigns: number
  totalSales: number
  totalRevenue: number
  totalEarnings: number
  platformCommission: number
}

interface Design {
  id: string
  title: string
  price: number
  imageUrl: string
  category: string
  totalSales: number
  totalRevenue: number
  createdAt: string
}

type TabId = 'overview' | 'designs' | 'earnings' | 'account'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [deleteConfirm, setDeleteConfirm] = useState<{designId: string; title: string} | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchProfile()
  }, [session, status])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const [profileRes, statsRes, designsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/profile/stats'),
        fetch('/api/profile/designs')
      ])

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData.user)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }

      if (designsRes.ok) {
        const designsData = await designsRes.json()
        setDesigns(designsData.designs)
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleEditDesign = (designId: string) => {
    // For now, redirect to upload page with edit mode
    // In a full implementation, you'd create an edit page
    router.push(`/upload?edit=${designId}`)
  }

  const handleDeleteDesign = (designId: string, title: string) => {
    setDeleteConfirm({ designId, title })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const response = await fetch('/api/profile/designs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          designId: deleteConfirm.designId
        })
      })

      if (response.ok) {
        setSuccessMessage('Design deleted successfully')
        setDesigns(designs.filter(d => d.id !== deleteConfirm.designId))
        // Update stats
        fetchProfile()
      } else {
        const error = await response.json()
        setErrorMessage(error.message || 'Failed to delete design')
      }
    } catch (error) {
      setErrorMessage('An error occurred while deleting the design')
    } finally {
      setDeleteConfirm(null)
      // Auto-clear messages after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
        setErrorMessage(null)
      }, 3000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.name || 'Anonymous User'}</h1>
                <div className="flex items-center text-gray-600 mt-1">
                  <Mail className="w-4 h-4 mr-2" />
                  {profile.email}
                </div>
                <div className="flex items-center text-gray-600 mt-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  Member since {formatDate(profile.createdAt)}
                </div>
                {profile.bio && (
                  <p className="text-gray-700 mt-2 max-w-md">{profile.bio}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {profile.isVerified && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Verified
                </span>
              )}
              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium capitalize">
                {profile.role.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Designs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDesigns}</p>
                </div>
                <Upload className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Your Earnings</p>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(stats.totalEarnings)}</p>
                  <p className="text-xs text-gray-500">After 5% platform fee</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {(
                [
                  { id: 'overview' as TabId, label: 'Overview', icon: Eye },
                  { id: 'designs' as TabId, label: 'My Designs', icon: Upload },
                  { id: 'earnings' as TabId, label: 'Earnings', icon: DollarSign },
                  { id: 'account' as TabId, label: 'Bank Account', icon: CreditCard }
                ] as { id: TabId; label: string; icon: any }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Profile Information</h4>
                    <div className="space-y-2 text-sm text-gray-900">
                      <p><span className="font-medium">Email:</span> {profile.email}</p>
                      <p><span className="font-medium">Role:</span> {profile.role}</p>
                      <p><span className="font-medium">Verified:</span> {profile.isVerified ? 'Yes' : 'No'}</p>
                      {profile.location && <p><span className="font-medium">Location:</span> {profile.location}</p>}
                      {profile.website && <p><span className="font-medium">Website:</span> {profile.website}</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <Link
                        href="/upload"
                        className="block w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-center"
                      >
                        Upload New Design
                      </Link>
                      <Link
                        href="/designs"
                        className="block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-center"
                      >
                        Browse Designs
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'designs' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">My Designs</h3>
                  <Link
                    href="/upload"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    Upload New Design
                  </Link>
                </div>
                
                {designs.length === 0 ? (
                  <div className="text-center py-12">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No designs yet</h4>
                    <p className="text-gray-600 mb-4">Start by uploading your first design to the marketplace</p>
                    <Link
                      href="/upload"
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      Upload First Design
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {designs.map((design) => (
                      <div key={design.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-gray-100">
                          <img
                            src={design.imageUrl}
                            alt={design.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              // Try multiple fallback options
                              if (target.src.includes('placeholder-fallback')) {
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMjAwIDEwMEMyNzIuMDg3IDEwMCAzMzAgMTU3LjkxMyAzMzAgMjMwUzI3Mi4wODcgMzYwIDIwMCAzNjBTNzAgMzAyLjA4NyA3MCAyMzBTMTI3LjkxMyAxMDAgMjAwIDEwMFoiIGZpbGw9IiNENUQ5REQiLz48dGV4dCB4PSIyMDAiIHk9IjI3MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNkI3MzgwIj5EZXNpZ248L3RleHQ+PC9zdmc+'
                              } else {
                                target.src = `data:image/svg+xml;charset=UTF-8,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='200' y='200' text-anchor='middle' font-family='Arial' font-size='16' fill='%236b7280'%3EDesign Image%3C/text%3E%3C/svg%3E?placeholder-fallback=true`
                              }
                            }}
                          />
                        </div>
                        <div className="p-4">
                          <h4 className="font-medium text-gray-900 mb-1">{design.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{design.category}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-600">{formatPrice(design.price)}</span>
                            <span className="text-sm text-gray-500">{design.totalSales} sales</span>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            Revenue: {formatPrice(design.totalRevenue || 0)}
                          </div>
                          <div className="mt-2 flex space-x-2">
                            <Link
                              href={`/designs/${design.id}`}
                              className="flex-1 bg-gray-100 text-gray-700 px-3 py-1 rounded text-center text-sm hover:bg-gray-200"
                            >
                              View Details
                            </Link>
                            <button
                              onClick={() => handleEditDesign(design.id)}
                              className="flex-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-center text-sm hover:bg-indigo-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDesign(design.id, design.title)}
                              className="flex-1 bg-red-100 text-red-700 px-3 py-1 rounded text-center text-sm hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Overview</h3>
                {stats && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total Revenue Generated</p>
                        <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Platform Commission (5%)</p>
                        <p className="text-2xl font-bold text-red-600">-{formatPrice(stats.platformCommission)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Your Earnings (95%)</p>
                        <p className="text-2xl font-bold text-green-600">{formatPrice(stats.totalEarnings)}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4" />
                  <p>Detailed earnings breakdown coming soon</p>
                  <p className="text-sm">Track individual sales and commission details</p>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <SellerAccountTab />
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Design</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Seller Account Management Component
function SellerAccountTab() {
  const [sellerAccount, setSellerAccount] = useState<any>(null)
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountName: '',
    bankCode: '',
    bankName: ''
  })

  useEffect(() => {
    fetchSellerAccount()
    fetchBanks()
  }, [])

  const fetchSellerAccount = async () => {
    try {
      const response = await fetch('/api/seller/account')
      if (response.ok) {
        const data = await response.json()
        setSellerAccount(data.sellerAccount)
        if (data.sellerAccount) {
          setFormData({
            accountNumber: data.sellerAccount.accountNumber,
            accountName: data.sellerAccount.accountName,
            bankCode: data.sellerAccount.bankCode,
            bankName: data.sellerAccount.bankName
          })
        }
      }
    } catch (error) {
      console.error('Error fetching seller account:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/seller/banks')
      if (response.ok) {
        const data = await response.json()
        setBanks(data.banks)
      }
    } catch (error) {
      console.error('Error fetching banks:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/seller/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setSellerAccount(data.sellerAccount)
        setShowForm(false)
        alert('Bank account added successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error saving account:', error)
      alert('Failed to save account. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBankChange = (bankCode: string) => {
    const selectedBank = banks.find(bank => bank.code === bankCode)
    setFormData({
      ...formData,
      bankCode,
      bankName: selectedBank?.name || ''
    })
  }

  const handleVerifyAccount = async () => {
    setVerifying(true)
    try {
      const response = await fetch('/api/seller/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success) {
        setSellerAccount(data.sellerAccount)
        if (data.manualVerification) {
          alert(`${data.message}\n\nNote: ${data.note}`)
        } else {
          alert(`Account verified successfully! Bank shows account name as: "${data.verifiedName}"`)
        }
      } else {
        // Check if manual verification is available
        if (data.manualVerificationAvailable) {
          const confirmManual = confirm(
            `${data.message}\n\nWould you like to proceed with manual verification? This will allow you to receive payments, and transfer setup will be completed during your first sale.`
          )
          
          if (confirmManual) {
            await handleManualVerification()
          }
        } else {
          alert(`Verification failed: ${data.message}`)
        }
      }
    } catch (error) {
      console.error('Error verifying account:', error)
      alert('Failed to verify account. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleManualVerification = async () => {
    try {
      const response = await fetch('/api/seller/manual-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmManualVerification: true })
      })

      const data = await response.json()

      if (data.success) {
        setSellerAccount(data.sellerAccount)
        alert(`${data.message}\n\nNote: ${data.note}`)
      } else {
        alert(`Manual verification failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Error with manual verification:', error)
      alert('Failed to complete manual verification. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
        <p className="mt-2 text-gray-600">Loading account details...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Bank Account for Earnings</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            {sellerAccount ? 'Update Account' : 'Add Account'}
          </button>
        )}
      </div>

      {sellerAccount && !showForm ? (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Current Account</h4>
            <span className={`px-2 py-1 rounded-full text-xs ${
              sellerAccount.isVerified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {sellerAccount.isVerified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Account Name:</span> {sellerAccount.accountName}</p>
            <p><span className="font-medium">Account Number:</span> {sellerAccount.accountNumber}</p>
            <p><span className="font-medium">Bank:</span> {sellerAccount.bankName}</p>
            <p><span className="font-medium">Status:</span> {sellerAccount.isActive ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> When customers make purchases, 95% of the sale amount will be automatically transferred to this account. The platform retains 5% as commission.
            </p>
          </div>
          
          {!sellerAccount.isVerified && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-800 font-medium">Account Not Verified</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Your account needs to be verified to receive payments automatically.
                  </p>
                </div>
                <button
                  onClick={handleVerifyAccount}
                  disabled={verifying}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {verifying ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Account'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank
            </label>
            <select
              value={formData.bankCode}
              onChange={(e) => handleBankChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
              aria-label="Select Bank"
              required
            >
              <option value="">Select Bank</option>
              {banks.map((bank, index) => (
                <option key={`${bank.code}-${index}`} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500"
              placeholder="1234567890"
              maxLength={10}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500"
              placeholder="John Doe"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Account'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Bank Account Added</h4>
          <p className="text-gray-600 mb-4">Add your bank account to receive earnings from sales</p>
        </div>
      )}
    </div>
  )
}