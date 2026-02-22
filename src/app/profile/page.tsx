'use client'

import { useState, useEffect, ElementType } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { User, Mail, Calendar, Upload, DollarSign, TrendingUp, Eye, CreditCard, CheckCircle, X, Download, Package, Truck, ExternalLink, Settings, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { DesignerProfileBadge } from '@/components/DesignerBadge'
import SubscriptionTierBadge from '@/components/SubscriptionTierBadge'
import { convertFromUSD } from '@/lib/currency'
import JSZip from 'jszip'
import ProfileImageModal from '@/components/ProfileImageModal'

interface UserProfile {
  id: string
  name: string | null
  displayName: string | null
  email: string
  bio: string | null
  website: string | null
  location: string | null
  image: string | null
  role: string
  createdAt: string
  isVerified: boolean
  designerTier: string | null
  subscriptionTier: string | null
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

interface PurchasedDesign {
  id: string
  purchaseId: string
  purchaseDate: string
  purchaseType: string
  purchasePrice: number
  design: {
    id: string
    title: string
    category: string
    imageUrl: string
    price: number
    ownershipPrice: number | null
    description: string | null
    mediaFiles: Array<{
      id: string
      fileUrl: string
      fileName: string
      fileType: string
      createdAt: string
    }>
    tags: string | null
    designer: {
      id: string
      name: string | null
      email: string
    }
  }
}

type DesignMediaFile = {
  id: string
  fileUrl: string
  fileName: string
  fileType: string
  createdAt?: string
  mimeType?: string
  sortOrder?: number
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  purchaseType: string
  podProductId?: string
  podProductName?: string
  design: {
    id: string
    title: string
    imageUrl: string
    thumbnailUrl?: string | null
    category: string
    mediaFiles: Array<{
      id: string
      fileUrl: string
      fileName: string
      fileType: string
      mimeType?: string
      sortOrder?: number
    }>
    designer: {
      id: string
      name: string | null
    }
  }
}

interface UserOrder {
  id: string
  orderNumber: string
  status: string
  orderType: 'DIGITAL' | 'POD'
  totalAmount: number
  createdAt: string
  paidAt?: string | null
  paymentMethod?: string | null
  podProvider?: string | null
  podStatus?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  estimatedDelivery?: string | null
  shipping?: {
    name?: string | null
    address1?: string | null
    address2?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    zip?: string | null
    phone?: string | null
  } | null
  items: OrderItem[]
}

type TabId = 'overview' | 'designs' | 'earnings' | 'account' | 'purchases' | 'orders'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [designs, setDesigns] = useState<Design[]>([])
  const [purchasedDesigns, setPurchasedDesigns] = useState<PurchasedDesign[]>([])
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [deleteConfirm, setDeleteConfirm] = useState<{designId: string; title: string} | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [preferredCurrency, setPreferredCurrency] = useState('USD')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1, NGN: 1200, EUR: 0.92, GBP: 0.79 })
  const [profileForm, setProfileForm] = useState({
    name: '',
    displayName: '',
    bio: '',
    website: '',
    location: '',
    image: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchProfile()
  }, [session, status, router])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const [profileRes, statsRes, designsRes, purchasesRes, ordersRes, prefsRes, ratesRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/profile/stats'),
        fetch('/api/profile/designs'),
        fetch('/api/profile/purchases'),
        fetch('/api/profile/orders'),
        fetch('/api/preferences'),
        fetch('/api/currency/rates')
      ])

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData.user)
        setProfileForm({
          name: profileData.user.name || '',
          displayName: profileData.user.displayName || '',
          bio: profileData.user.bio || '',
          website: profileData.user.website || '',
          location: profileData.user.location || '',
          image: profileData.user.image || ''
        })
      }

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json()
        setPreferredCurrency(prefsData.currency || 'USD')
      }

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json()
        setExchangeRates(ratesData.rates || { NGN: 1200, EUR: 0.92, GBP: 0.79 })
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }

      if (designsRes.ok) {
        const designsData = await designsRes.json()
        setDesigns(designsData.designs)
      }

      if (purchasesRes.ok) {
        const purchasesData = await purchasesRes.json()
        setPurchasedDesigns(purchasesData.purchases || [])
      } else {
        console.warn('Failed to fetch purchases:', purchasesRes.status)
      }
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        setOrders(ordersData.orders || [])
      } else {
        console.warn('Failed to fetch orders:', ordersRes.status)
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
      setErrorMessage('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const uploadProfileImage = async (file: File) => {
    try {
      setUploadingImage(true)
      setErrorMessage(null)

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (uploadRes.ok) {
        const { url } = await uploadRes.json()
        setProfileForm(prev => ({ ...prev, image: url }))
        setSuccessMessage('Profile picture uploaded!')
        setTimeout(() => setSuccessMessage(null), 2000)
      } else {
        setErrorMessage('Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true)
      setErrorMessage(null)
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setIsEditingProfile(false)
        setSuccessMessage('Profile updated successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const error = await response.json()
        setErrorMessage(error.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      setErrorMessage('Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const formatPrice = (priceUSD: number) => {
    const amount = priceUSD
    const currency = preferredCurrency
    
    // Convert from USD to preferred currency
    if (preferredCurrency !== 'USD' && exchangeRates[preferredCurrency]) {
      const convertedAmount = convertFromUSD(priceUSD, preferredCurrency, exchangeRates)
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(convertedAmount)
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateWithTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleDeleteDesign = (designId: string, title: string) => {
    setDeleteConfirm({ designId, title })
  }

  const handleDownloadPurchasedDesign = async (purchaseId: string, designId: string, designTitle: string) => {
    try {
      if (!designId) {
        console.error('Design ID is missing')
        setErrorMessage('Design ID not found')
        return
      }

      const response = await fetch(`/api/designs/${designId}/download?purchaseId=${purchaseId}`)
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          // Multiple files manifest
          const data = await response.json()
          if (data.files && Array.isArray(data.files)) {
            // Download each file sequentially
            for (const file of data.files) {
              const fileUrl = file.downloadUrl || file.url
              if (!fileUrl) {
                console.warn('No download URL for file:', file)
                continue
              }
              const fileResponse = await fetch(fileUrl)
              if (fileResponse.ok) {
                const blob = await fileResponse.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = file.name || `${designTitle}-file`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            }
          }
        } else {
          // Single file download
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || designTitle
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } else {
        console.error('Download failed:', response.statusText)
        setErrorMessage('Download failed')
      }
    } catch (error) {
      console.error('Download error:', error)
      setErrorMessage('Download error')
    }
  }

  const handleDownloadOrderDesign = async (designTitle: string, mediaFiles: DesignMediaFile[]) => {
    try {
      if (!mediaFiles || mediaFiles.length === 0) {
        setErrorMessage('No files available for download')
        return
      }

      // Create a ZIP file
      const zip = new JSZip()
      const designFolder = zip.folder(designTitle) || zip

      // Download and add each file to ZIP
      for (const file of mediaFiles) {
        if (!file.fileUrl) {
          console.warn('No fileUrl for file:', file)
          continue
        }
        
        try {
          const response = await fetch(file.fileUrl)
          if (response.ok) {
            const blob = await response.blob()
            const fileName = file.fileName || `file-${file.id}`
            designFolder.file(fileName, blob)
          }
        } catch (fileError) {
          console.error('Error downloading file:', fileError)
        }
      }

      // Generate and download the ZIP
      const zipBlob = await designFolder.generateAsync({ type: 'blob' })
      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${designTitle}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setSuccessMessage('Design downloaded successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Download error:', error)
      setErrorMessage('Download failed')
    }
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
    } catch {
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
          <h1 className="text-2xl font-bold text-black mb-4">Profile Not Found</h1>
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
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded flex items-center justify-between">
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
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex items-center justify-between">
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
        <div className="bg-white rounded shadow-sm p-3 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity relative group"
                onClick={() => setImageModalOpen(true)}
              >
                {profile?.image ? (
                  <Image
                    src={profile.image}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                  <span className="text-white text-[10px] sm:text-xs font-medium opacity-0 group-hover:opacity-100">Click to view</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-xl font-bold text-black truncate">{profile.displayName || profile.name || 'Anonymous User'}</h1>
                {profile.displayName && profile.name && (
                  <p className="text-[9px] sm:text-xs text-gray-500 truncate">{profile.name}</p>
                )}
                <div className="flex items-center text-gray-600 text-[11px] sm:text-xs mt-0.5">
                  <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center text-gray-600 text-[11px] sm:text-xs mt-0.5">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" />
                  Member since {formatDate(profile.createdAt)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 mt-1 sm:mt-0 flex-wrap gap-1">
              {profile.designerTier && (
                <DesignerProfileBadge tier={profile.designerTier} />
              )}
              {profile.subscriptionTier && (
                <SubscriptionTierBadge tier={profile.subscriptionTier} />
              )}
              {profile.isVerified && (
                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                  Verified
                </span>
              )}
              {!profile.designerTier && (
                <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize">
                  {profile.role.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-3">
            <div className="bg-white rounded shadow-sm p-2 sm:p-3">
              <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-[9px] sm:text-xs font-medium text-gray-600">Designs</p>
                  <p className="text-base sm:text-xl font-bold text-black">{stats.totalDesigns}</p>
                </div>
                <Upload className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600 mt-1 sm:mt-0" />
              </div>
            </div>
            <div className="bg-white rounded shadow-sm p-2 sm:p-3">
              <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-[9px] sm:text-xs font-medium text-gray-600">Sales</p>
                  <p className="text-base sm:text-xl font-bold text-black">{stats?.totalSales ?? 0}</p>
                </div>
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 mt-1 sm:mt-0" />
              </div>
            </div>
            <div className="bg-white rounded shadow-sm p-2 sm:p-3">
              <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-[9px] sm:text-xs font-medium text-gray-600">Earnings</p>
                  <p className="text-base sm:text-xl font-bold text-black">{formatPrice(stats?.totalEarnings ?? 0)}</p>
                  <p className="text-[8px] sm:text-xs text-gray-500 mt-0.5">After platform fee</p>
                </div>
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 mt-1 sm:mt-0 hidden sm:block" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto scrollbar-hide px-1.5 sm:px-4 -mb-px">
              {(
                [
                  { id: 'overview' as TabId, label: 'Overview', shortLabel: 'Overview', icon: Eye },
                  { id: 'designs' as TabId, label: 'My Designs', shortLabel: 'Designs', icon: Upload },
                  { id: 'purchases' as TabId, label: 'Downloads', shortLabel: 'Downloads', icon: Download },
                  { id: 'orders' as TabId, label: 'My Orders', shortLabel: 'Orders', icon: Package },
                  { id: 'earnings' as TabId, label: 'Earnings', shortLabel: 'Earnings', icon: DollarSign },
                  { id: 'account' as TabId, label: 'Bank Account', shortLabel: 'Bank', icon: CreditCard }
                ] as { id: TabId; label: string; shortLabel: string; icon: ElementType }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 sm:py-3 px-1.5 sm:px-2.5 border-b-2 font-medium text-[9px] sm:text-xs whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1.5" />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-2.5 sm:p-4">
            {activeTab === 'overview' && (
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-black">Account Overview</h3>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="text-indigo-600 hover:text-indigo-700 text-[9px] sm:text-xs font-medium"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
                
                {isEditingProfile ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] sm:text-xs text-black bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Your full name"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">
                          Display Name / Nickname
                        </label>
                        <input
                          type="text"
                          value={profileForm.displayName}
                          onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] sm:text-xs text-black bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Nickname shown in forum & community"
                        />
                        <p className="mt-0.5 text-[10px] text-gray-500">This name will be shown in the forum and community sections instead of your full name.</p>
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] sm:text-xs text-black bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="City, Country"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">
                          Website
                        </label>
                        <input
                          type="url"
                          value={profileForm.website}
                          onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] sm:text-xs text-black bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-1">
                        Bio
                      </label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] sm:text-xs text-black bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 text-[9px] sm:text-xs disabled:opacity-50"
                      >
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false)
                          setProfileForm({
                            name: profile?.name || '',
                            displayName: profile?.displayName || '',
                            bio: profile?.bio || '',
                            website: profile?.website || '',
                            location: profile?.location || '',
                            image: profile?.image || ''
                          })
                        }}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 text-[9px] sm:text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <h4 className="font-medium text-black mb-1.5 text-xs sm:text-sm">Profile Information</h4>
                      <div className="space-y-1 text-[11px] sm:text-xs text-black">
                        <p><span className="font-medium">Name:</span> {profile.name || 'Not set'}</p>
                        <p><span className="font-medium">Display Name:</span> {profile.displayName || <span className="text-gray-400 italic">Not set</span>}</p>
                        <p><span className="font-medium">Email:</span> {profile.email}</p>
                        <p><span className="font-medium">Role:</span> {profile.role}</p>
                        <p><span className="font-medium">Verified:</span> {profile.isVerified ? 'Yes' : 'No'}</p>
                        {profile.location && <p><span className="font-medium">Location:</span> {profile.location}</p>}
                        {profile.website && <p><span className="font-medium">Website:</span> {profile.website}</p>}
                        {profile.bio && <p><span className="font-medium">Bio:</span> {profile.bio}</p>}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-black mb-1.5 text-xs sm:text-sm">Quick Actions</h4>
                      <div className="flex gap-1.5 sm:flex-col sm:space-y-1.5">
                        <Link
                          href="/upload"
                          className="flex-1 bg-indigo-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-indigo-700 text-center text-[9px] sm:text-xs"
                        >
                          Upload
                        </Link>
                        <Link
                          href="/orders"
                          className="flex-1 bg-gray-100 text-gray-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-gray-200 text-center text-[9px] sm:text-xs"
                        >
                          Orders
                        </Link>
                        <Link
                          href="/profile/settings"
                          className="flex-1 bg-gray-100 text-gray-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-gray-200 text-center text-[9px] sm:text-xs flex items-center justify-center gap-1"
                        >
                          <Settings className="w-3 h-3" />
                          Settings
                        </Link>
                      </div>

                      {/* Buyer Quick Links Section */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h3 className="text-[9px] sm:text-xs font-semibold text-black mb-2 sm:mb-3">Quick Access</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl">
                          <Link
                            href="/orders"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition"
                          >
                            <Package className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">My Orders</p>
                            </div>
                          </Link>
                          <Link
                            href="/wishlist"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-pink-50 border border-pink-200 rounded hover:bg-pink-100 transition"
                          >
                            <span className="text-sm sm:text-lg flex-shrink-0">❤️</span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">Wishlist</p>
                            </div>
                          </Link>
                          <Link
                            href="/cart"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition"
                          >
                            <span className="text-sm sm:text-lg flex-shrink-0">🛒</span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">Cart</p>
                            </div>
                          </Link>
                          <Link
                            href="/notifications"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition"
                          >
                            <span className="text-sm sm:text-lg flex-shrink-0">🔔</span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">Notifications</p>
                            </div>
                          </Link>
                          <Link
                            href="/designs"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition"
                          >
                            <span className="text-sm sm:text-lg flex-shrink-0">🎭</span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">Browse</p>
                            </div>
                          </Link>
                          <Link
                            href="/my-commissions"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-cyan-50 border border-cyan-200 rounded hover:bg-cyan-100 transition"
                          >
                            <span className="text-sm sm:text-lg flex-shrink-0">✏️</span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">My Work</p>
                            </div>
                          </Link>
                          <Link
                            href="/commissions"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition"
                          >
                            <span className="text-sm sm:text-lg flex-shrink-0">🎨</span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">Commissions</p>
                            </div>
                          </Link>
                          <Link
                            href="/customer-care"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 transition"
                          >
                            <span className="text-sm sm:text-lg flex-shrink-0">💬</span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">Support Chat</p>
                            </div>
                          </Link>
                          <Link
                            href="/profile/settings"
                            className="flex items-center gap-1 p-2 sm:p-3 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition"
                          >
                            <span className="text-sm sm:text-lg flex-shrink-0">⚙️</span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-black line-clamp-1">Settings</p>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'designs' && (
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-black">My Designs</h3>
                  <Link
                    href="/upload"
                    className="bg-indigo-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded hover:bg-indigo-700 text-[9px] sm:text-xs whitespace-nowrap"
                  >
                    Upload New Design
                  </Link>
                </div>
                
                {designs.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Upload className="w-8 sm:w-10 text-gray-400 mx-auto mb-2" />
                    <h4 className="text-xs sm:text-sm font-medium line-clamp-1 text-black mb-1">No designs yet</h4>
                    <p className="text-[9px] sm:text-xs text-gray-600 mb-2 sm:mb-3">Start by uploading your first design to the marketplace</p>
                    <Link
                      href="/upload"
                      className="inline-block bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-indigo-700 text-xs sm:text-sm"
                    >
                      Upload First Design
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                    {designs.map((design) => (
                        <div key={design.id} className="border border-gray-200 rounded overflow-hidden hover:shadow-md transition-shadow">
                          <div className="aspect-square bg-gray-100">
                            <Image
                              src={design.imageUrl}
                              alt={design.title}
                              width={400}
                              height={400}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        <div className="p-3 sm:p-4">
                          <h4 className="font-medium text-black mb-0.5 sm:mb-1 text-sm sm:text-base truncate">{design.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">{design.category}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-600 text-[10px] sm:text-xs line-clamp-1">{formatPrice(design.price)}</span>
                            <span className="text-gray-500 text-[10px] sm:text-xs">{design.totalSales} sales</span>
                          </div>
                          <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-600 line-clamp-1">
                            Revenue: {formatPrice(design.totalRevenue || 0)}
                          </div>
                          <div className="mt-2 flex gap-2 sm:gap-3">
                            <Link
                              href={`/designs/${design.id}`}
                              className="flex-1 bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded text-center text-xs hover:bg-gray-200"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleDeleteDesign(design.id, design.title)}
                              className="flex-1 bg-red-100 text-red-700 px-2 sm:px-3 py-1 rounded text-center text-xs hover:bg-red-200"
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
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-black mb-2 sm:mb-3">Earnings Overview</h3>
                {stats && (
                  <div className="bg-gray-50 rounded p-2.5 sm:p-4 mb-2.5 sm:mb-3">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                      <div className="text-center">
                        <p className="text-[8px] sm:text-[10px] text-gray-600">Revenue</p>
                        <p className="text-sm sm:text-lg font-bold text-black">{formatPrice(stats?.totalRevenue ?? 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] sm:text-[10px] text-gray-600">Commission</p>
                        <p className="text-sm sm:text-lg font-bold text-red-600">-{formatPrice(stats.platformCommission)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] sm:text-[10px] text-gray-600">Earnings</p>
                        <p className="text-sm sm:text-lg font-bold text-green-600">{formatPrice(stats?.totalEarnings ?? 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded p-2 sm:p-3 mb-2 sm:mb-2.5">
                  <h4 className="font-semibold text-blue-900 mb-1 text-xs sm:text-sm">View Payment Transfers</h4>
                  <p className="text-[9px] sm:text-xs text-blue-800 mb-2">Check the status of all your seller payments, including successful transfers, pending payments, and retry history.</p>
                  <Link 
                    href="/seller/transfers"
                    className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs sm:text-sm"
                  >
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    View My Transfers & Payments
                  </Link>
                </div>
                
                <div className="text-center py-2 sm:py-3 text-gray-500">
                  <p className="text-[8px] sm:text-[10px]">More detailed earnings breakdown available in transfer dashboard</p>
                </div>
              </div>
            )}

            {activeTab === 'purchases' && (
              <div className="min-w-0">
                <h2 className="text-xs sm:text-lg font-bold text-black mb-2 sm:mb-3">My Downloads</h2>
                
                {purchasedDesigns.length === 0 && orders.filter(o => o.orderType === 'DIGITAL').length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Download className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2 sm:mb-3" />
                    <p className="text-gray-600 mb-2 sm:mb-3 text-xs sm:text-sm">No downloads yet</p>
                    <Link 
                      href="/designs"
                      className="inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
                    >
                      Browse Designs
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Digital Orders */}
                    {orders.filter(o => o.orderType === 'DIGITAL').length > 0 && (
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-indigo-700 mb-2">Recent Orders</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                          {orders.filter(o => o.orderType === 'DIGITAL').map(order =>
                            order.items.map(item => (
                              <div key={item.id} className="bg-white rounded shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                {/* Design Image */}
                                <div className="relative h-28 sm:h-40 bg-gray-200 overflow-hidden">
                                  <Image
                                    src={item.design.imageUrl}
                                    alt={item.design.title}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover"
                                  />
                                  <div className="absolute top-1 right-1 bg-green-500 text-white px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-medium">
                                    {item.purchaseType === 'OWNERSHIP' ? 'Own' : 'Lic'}
                                  </div>
                                </div>

                                {/* Design Info */}
                                <div className="p-2 sm:p-3">
                                  <h3 className="font-semibold text-black mb-0.5 line-clamp-1 text-xs sm:text-sm">{item.design.title}</h3>
                                  <p className="text-[9px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2">{item.design.category}</p>
                                  
                                  {/* Designer Info */}
                                  <div className="text-[9px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2">
                                    <p>By <span className="font-medium truncate">{item.design.designer.name || 'Unknown'}</span></p>
                                  </div>

                                  {/* Purchase Details */}
                                  <div className="bg-gray-50 rounded p-1.5 sm:p-2 mb-2 sm:mb-2.5 text-[9px] sm:text-xs">
                                    <p className="text-gray-600">
                                      <span className="font-medium">{formatDateWithTime(order.createdAt)}</span>
                                    </p>
                                    <p className="text-gray-600 mt-0.5">
                                      <span className="font-medium text-indigo-600">{formatPrice(item.price)}</span>
                                    </p>
                                  </div>

                                  {/* Download Button */}
                                  <button
                                    onClick={() => handleDownloadOrderDesign(item.design.title, item.design.mediaFiles)}
                                    className="w-full flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[9px] sm:text-xs"
                                    disabled={!item?.design?.mediaFiles?.length}
                                  >
                                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                                    Download
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Individual Purchases */}
                    {purchasedDesigns.length > 0 && (
                      <div className="min-w-0">
                        {orders.filter(o => o.orderType === 'DIGITAL').length > 0 && (
                          <h3 className="text-xs sm:text-sm font-semibold text-indigo-700 mb-2 mt-4">Individual Purchases</h3>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                          {purchasedDesigns.map((purchase) => (
                            <div key={purchase.purchaseId} className="bg-white rounded shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                              {/* Design Image */}
                              <div className="relative h-28 sm:h-40 bg-gray-200 overflow-hidden">
                                <Image
                                  src={purchase.design.imageUrl}
                                  alt={purchase.design.title}
                                  fill
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  className="object-cover"
                                />
                                <div className="absolute top-1 right-1 bg-green-500 text-white px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-medium">
                                  {purchase.purchaseType === 'OWNERSHIP' ? 'Own' : 'Lic'}
                                </div>
                              </div>

                              {/* Design Info */}
                              <div className="p-2 sm:p-3">
                                <h3 className="font-semibold text-black mb-0.5 line-clamp-1 text-xs sm:text-sm">{purchase.design.title}</h3>
                                <p className="text-[9px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2">{purchase.design.category}</p>
                                
                                {/* Designer Info */}
                                <div className="text-[9px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2">
                                  <p>By <span className="font-medium truncate">{purchase.design.designer.name || 'Unknown'}</span></p>
                                </div>

                                {/* Purchase Details */}
                                <div className="bg-gray-50 rounded p-1.5 sm:p-2 mb-2 sm:mb-2.5 text-[9px] sm:text-xs">
                                  <p className="text-gray-600">
                                    <span className="font-medium">{formatDate(purchase.purchaseDate)}</span>
                                  </p>
                                  <p className="text-gray-600 mt-0.5">
                                    <span className="font-medium text-indigo-600">{formatPrice(purchase.purchasePrice)}</span>
                                  </p>
                                </div>

                                {/* Download Button */}
                                <button
                                  onClick={() => handleDownloadPurchasedDesign(purchase.purchaseId, purchase.design.id, purchase.design.title)}
                                  className="w-full flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[9px] sm:text-xs"
                                  disabled={!purchase?.design?.id}
                                >
                                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="min-w-0">
                <h2 className="text-xs sm:text-lg font-bold text-black mb-2 sm:mb-3">My Orders</h2>
                
                {orders.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2 sm:mb-3" />
                    <p className="text-gray-600 mb-2 sm:mb-3 text-xs sm:text-sm">No orders yet</p>
                    <Link 
                      href="/designs"
                      className="inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
                    >
                      Browse Designs
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {/* POD Orders Section */}
                    {orders.filter(o => o.orderType === 'POD').length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          Physical Products (Print-on-Demand)
                        </h3>
                        <div className="space-y-2">
                          {orders.filter(o => o.orderType === 'POD').map(order => (
                            <div key={order.id} className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
                              {/* Order Header - Clickable */}
                              <button
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-semibold text-[9px] sm:text-xs text-black">Order</p>
                                  <p className="text-[9px] sm:text-[10px] text-gray-500 truncate">#{order.orderNumber}</p>
                                  <p className="text-[8px] sm:text-[9px] text-gray-400">{formatDateWithTime(order.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  <div className="text-right">
                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${
                                      order.podStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                                      order.podStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                      order.podStatus === 'in_production' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {order.podStatus === 'delivered' ? '✓ Delivered' :
                                       order.podStatus === 'shipped' ? '🚚 Shipped' :
                                       order.podStatus === 'in_production' ? '🏭 Production' :
                                       '⏳ Processing'}
                                    </span>
                                    <p className="text-[9px] sm:text-xs font-semibold text-orange-700 mt-0.5">
                                      {formatPrice(order.totalAmount)}
                                    </p>
                                  </div>
                                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expandedOrderId === order.id ? 'rotate-90' : ''}`} />
                                </div>
                              </button>
                              
                              {/* Order Items - Show when expanded */}
                              {expandedOrderId === order.id && (
                                <div className="px-2.5 sm:px-3 py-2 sm:py-3 bg-orange-50 border-t border-orange-100">
                                  <p className="text-[8px] sm:text-[10px] text-gray-500 mb-2">Click an item to view details:</p>
                                  <div className="space-y-2">
                                    {order.items.map(item => (
                                      <Link 
                                        key={item.id} 
                                        href={`/designs/${item.design.id}`}
                                        className="flex items-start gap-2 sm:gap-3 bg-white rounded p-2 border border-orange-100 hover:border-orange-300 hover:shadow-sm transition-all"
                                      >
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 relative flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                          <Image
                                            src={item.design.thumbnailUrl || item.design.imageUrl}
                                            alt={item.design.title}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-[9px] sm:text-xs text-black line-clamp-1 group-hover:text-indigo-600">{item.design.title}</p>
                                          {item.podProductName && (
                                            <p className="text-[9px] sm:text-[10px] text-orange-600">{item.podProductName}</p>
                                          )}
                                          <p className="text-[8px] sm:text-[9px] text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 flex items-center gap-1">
                                          <p className="font-semibold text-[9px] sm:text-xs text-black">{formatPrice(item.price)}</p>
                                          <ChevronRight className="w-3 h-3 text-gray-400" />
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                  
                                  {/* Shipping & Tracking */}
                                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-orange-100 text-[8px] sm:text-[10px]">
                                    {order.trackingNumber && (
                                      <a
                                        href={order.trackingUrl || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Track Package
                                      </a>
                                    )}
                                    {order.shipping && (
                                      <span className="text-gray-500">
                                        Ships to: {order.shipping.city}, {order.shipping.country}
                                      </span>
                                    )}
                                    {order.podProvider && (
                                      <span className="text-gray-400">
                                        via {order.podProvider}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Digital Orders Section */}
                    {orders.filter(o => o.orderType === 'DIGITAL').length > 0 && (
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          Digital Downloads
                        </h3>
                        <div className="space-y-2">
                          {orders.filter(o => o.orderType === 'DIGITAL').map(order => (
                            <div key={order.id} className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
                              {/* Order Header - Clickable */}
                              <button
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-semibold text-[9px] sm:text-xs text-black">Order</p>
                                  <p className="text-[9px] sm:text-[10px] text-gray-500 truncate">#{order.orderNumber}</p>
                                  <p className="text-[8px] sm:text-[9px] text-gray-400">{formatDateWithTime(order.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  <div className="text-right">
                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${
                                      order.status === 'COMPLETED' || order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {order.status === 'COMPLETED' || order.status === 'PAID' ? (
                                        <>
                                          <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                                          Complete
                                        </>
                                      ) : order.status}
                                    </span>
                                    <p className="text-[9px] sm:text-xs font-semibold text-black mt-0.5">
                                      {formatPrice(order.totalAmount)}
                                    </p>
                                  </div>
                                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expandedOrderId === order.id ? 'rotate-90' : ''}`} />
                                </div>
                              </button>
                              
                              {/* Order Items - Show when expanded */}
                              {expandedOrderId === order.id && (
                                <div className="px-2.5 sm:px-3 py-2 sm:py-3 bg-gray-50 border-t border-gray-100">
                                  <p className="text-[8px] sm:text-[10px] text-gray-500 mb-2">Click an item to view details:</p>
                                  <div className="space-y-2">
                                    {order.items.map(item => (
                                      <Link 
                                        key={item.id} 
                                        href={`/designs/${item.design.id}`}
                                        className="flex items-start gap-2 sm:gap-3 bg-white rounded p-2 border border-gray-100 hover:border-indigo-300 hover:shadow-sm transition-all"
                                      >
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 relative flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                          <Image
                                            src={item.design.thumbnailUrl || item.design.imageUrl}
                                            alt={item.design.title}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-[9px] sm:text-xs text-black line-clamp-2">
                                            {item.design.title}
                                          </p>
                                          <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">
                                            by {item.design.designer?.name || 'Designer'}
                                          </p>
                                          <span className={`inline-block mt-1 text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                            item.purchaseType === 'OWNERSHIP' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                                          }`}>
                                            {item.purchaseType === 'OWNERSHIP' ? 'Full Ownership' : 'Standard License'}
                                          </span>
                                        </div>
                                        <div className="text-right flex-shrink-0 flex items-center gap-1">
                                          <p className="font-semibold text-[9px] sm:text-xs text-black">{formatPrice(item.price)}</p>
                                          <ChevronRight className="w-3 h-3 text-gray-400" />
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
          <div className="bg-white rounded p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-black mb-4">Delete Design</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deleteConfirm?.title ?? ''}"? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageUrl={profile?.image || null}
        userName={profile?.displayName || profile?.name || 'User'}
        isOwnProfile={true}
        onImageUpload={uploadProfileImage}
        isUploading={uploadingImage}
      />
    </div>
  )
}

// Seller Account Management Component
function SellerAccountTab() {
    // Minimal types for seller account and banks to avoid `any`
    interface SellerAccount {
      userId?: string
      accountNumber?: string
      accountName?: string
      bankCode?: string
      bankName?: string
      recipientCode?: string | null
      isVerified?: boolean
      isActive?: boolean
    }

    interface Bank {
      code: string
      name: string
    }

    const [sellerAccount, setSellerAccount] = useState<SellerAccount | null>(null)
    const [banks, setBanks] = useState<Bank[]>([])
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
    <div className="p-2.5 sm:p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-xs sm:text-sm font-semibold text-black\">Bank Account for Earnings</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded hover:bg-indigo-700 text-xs sm:text-sm whitespace-nowrap"
          >
            {sellerAccount ? 'Update' : 'Add Account'}
          </button>
        )}
      </div>

      {sellerAccount && !showForm ? (
        <div className="bg-gray-50 rounded p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-black text-xs sm:text-sm">Current Account</h4>
            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] ${
              sellerAccount.isVerified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {sellerAccount.isVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div className="space-y-1 text-[9px] sm:text-xs">
            <p><span className="font-medium\">Account Name:</span> <span className="truncate inline-block max-w-xs">{sellerAccount.accountName}</span></p>
            <p><span className="font-medium\">Account Number:</span> {sellerAccount.accountNumber}</p>
            <p><span className="font-medium\">Bank:</span> <span className="truncate inline-block max-w-xs\">{sellerAccount.bankName}</span></p>
            <p><span className="font-medium\">Status:</span> {sellerAccount.isActive ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="mt-2 sm:mt-3 p-2 sm:p-2.5 bg-blue-50 rounded\">
            <p className="text-[8px] sm:text-[10px] text-blue-800 leading-tight">
              <strong>How it works:</strong> When customers make purchases, your earnings (after platform commission of 7-10%) will be automatically transferred to this account. New sellers enjoy their first $100 commission-free!
            </p>
          </div>
          
          {!sellerAccount.isVerified && (
            <div className="mt-2 sm:mt-3 p-2 sm:p-2.5 bg-yellow-50 border border-yellow-200 rounded\">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-xs text-yellow-800 font-medium\">Account Not Verified</p>
                  <p className="text-[8px] sm:text-[10px] text-yellow-700 mt-0.5\">
                    Your account needs to be verified to receive payments automatically.
                  </p>
                </div>
                <button
                  onClick={handleVerifyAccount}
                  disabled={verifying}
                  className="bg-yellow-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-[9px] sm:text-xs whitespace-nowrap\"
                >
                  {verifying ? (
                    <>
                      <div className="animate-spin h-3 w-3 border-1.5 border-white border-t-transparent rounded-full inline-block mr-1\" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Account'
                  )}
                </button>
              </div>
            </div>
          )}
          
          {sellerAccount.isVerified && (
            <div className="mt-2 sm:mt-3 p-2 sm:p-2.5 bg-purple-50 border border-purple-200 rounded\">
              <div className="flex flex-col gap-2">
                <p className="text-[9px] sm:text-xs text-purple-800 font-medium\">Complete Paystack KYC Verification</p>
                <p className="text-[8px] sm:text-[10px] text-purple-700\">
                  Your subaccount has been created in Paystack but needs KYC verification before you can receive split payments. Click the link below to complete verification in your Paystack dashboard.
                </p>
                <a
                  href="https://dashboard.paystack.com/subaccounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[8px] sm:text-[10px] text-purple-600 hover:text-purple-800 underline inline-flex items-center gap-1 w-fit"
                >
                  Go to Paystack Subaccounts →
                </a>
              </div>
            </div>
          )}
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank
            </label>
            <select
              value={formData.bankCode}
              onChange={(e) => handleBankChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-black bg-white"
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

          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-black bg-white placeholder-gray-500"
              placeholder="1234567890"
              maxLength={10}
              required
            />
          </div>

          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-black bg-white placeholder-gray-500"
              placeholder="John Doe"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Account'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-black mb-2">No Bank Account Added</h4>
          <p className="text-gray-600 mb-4">Add your bank account to receive earnings from sales</p>
        </div>
      )}
    </div>
)

}
