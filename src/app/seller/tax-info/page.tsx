'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Save, AlertCircle, CheckCircle, FileText, ArrowLeft } from 'lucide-react'

interface TaxInfo {
  country: string
  taxIdType: 'SSN' | 'EIN' | 'VAT' | 'OTHER'
  taxId: string
  businessName: string
  businessAddress: string
  isVerified: boolean
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  documents: Array<{
    id: string
    type: 'W9' | '1099' | 'VAT_CERT' | 'OTHER'
    uploadedAt: string
    verified: boolean
  }>
}

export default function SellerTaxInfoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [taxInfo, setTaxInfo] = useState<TaxInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states
  const [country, setCountry] = useState('US')
  const [taxIdType, setTaxIdType] = useState<'SSN' | 'EIN' | 'VAT' | 'OTHER'>('SSN')
  const [taxId, setTaxId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')

  const fetchTaxInfo = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/seller/tax-info')
      if (response.ok) {
        const data = await response.json()
        setTaxInfo(data.taxInfo)
        setCountry(data.taxInfo?.country || 'US')
        setTaxIdType(data.taxInfo?.taxIdType || 'SSN')
        setTaxId(data.taxInfo?.taxId || '')
        setBusinessName(data.taxInfo?.businessName || '')
        setBusinessAddress(data.taxInfo?.businessAddress || '')
      }
    } catch (error) {
      console.error('Failed to fetch tax info:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchTaxInfo()
  }, [status, router, fetchTaxInfo])

  const handleSave = async () => {
    if (!taxId || !businessName) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/seller/tax-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          taxIdType,
          taxId,
          businessName,
          businessAddress,
        }),
      })

      if (response.ok) {
        await fetchTaxInfo()
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to save tax info:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading tax information...</div>
  }

  const getTaxIdLabel = (type: string) => {
    switch (type) {
      case 'SSN': return 'Social Security Number'
      case 'EIN': return 'Employer Identification Number'
      case 'VAT': return 'VAT Number'
      default: return 'Tax ID'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/seller/dashboard" className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tax Information</h1>
            <p className="text-gray-600 mt-1">Manage your tax details for payouts</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>This information is required for accurate payment processing and tax reporting. Your data is encrypted and securely stored.</span>
          </p>
        </div>

        {/* Tax Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Tax Details</h2>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                Edit
              </button>
            )}
          </div>

          {taxInfo?.isVerified && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">Tax information verified</span>
            </div>
          )}

          {taxInfo?.verificationStatus === 'PENDING' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <span className="text-sm text-yellow-800">Verification in progress</span>
            </div>
          )}

          {taxInfo?.verificationStatus === 'REJECTED' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                Tax information rejected. Please verify and resubmit.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {editMode ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Country *</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      aria-label="Select country"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Tax ID Type *</label>
                    <select
                      value={taxIdType}
                      onChange={(e) => setTaxIdType(e.target.value as 'SSN' | 'EIN' | 'VAT' | 'OTHER')}
                      aria-label="Select tax ID type"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                    >
                      <option value="SSN">Social Security Number</option>
                      <option value="EIN">Employer ID Number</option>
                      <option value="VAT">VAT Number</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">{getTaxIdLabel(taxIdType)} *</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g., 12-3456789"
                    aria-label="Tax ID"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Business/Legal Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    aria-label="Business name"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Business Address</label>
                  <textarea
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    aria-label="Business address"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 mt-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-2.5 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Country</p>
                  <p className="text-lg font-semibold text-gray-900">{country}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">{getTaxIdLabel(taxIdType)}</p>
                  <p className="text-lg font-semibold text-gray-900">{taxId ? taxId.replace(/\d(?=\d{4})/g, '*') : 'Not set'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Business/Legal Name</p>
                  <p className="text-lg font-semibold text-gray-900">{businessName || 'Not set'}</p>
                </div>

                {businessAddress && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Business Address</p>
                    <p className="text-gray-900 whitespace-pre-line">{businessAddress}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tax Documents */}
        {taxInfo?.documents && taxInfo.documents.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tax Documents
            </h2>

            <div className="space-y-3">
              {taxInfo.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.type}</p>
                      <p className="text-xs text-gray-600">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {doc.verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help */}
        <div className="bg-indigo-50 rounded-lg p-6 mt-6 border border-indigo-200">
          <h3 className="font-semibold text-indigo-900 mb-2">Need Help?</h3>
          <p className="text-sm text-indigo-800 mb-4">
            Visit our tax documentation guide to learn about required forms and how to complete your tax information.
          </p>
          <a
            href="/help/tax-info"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            View Guide
          </a>
        </div>
      </div>
    </div>
  )
}
