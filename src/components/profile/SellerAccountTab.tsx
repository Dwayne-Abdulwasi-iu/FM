"use client"

import React, { useEffect, useState } from 'react'

interface SellerAccountTabProps {
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

interface SellerAccount {
  accountNumber: string
  accountName: string
  bankCode: string
  bankName: string
  isVerified?: boolean
  isActive?: boolean
}

export default function SellerAccountTab({ onSuccess, onError }: SellerAccountTabProps) {
  const [sellerAccount, setSellerAccount] = useState<SellerAccount | null>(null)
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([])
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
  const [pendingBankNameSuggestion, setPendingBankNameSuggestion] = useState<string | null>(null)
  const [showManualVerifyModal, setShowManualVerifyModal] = useState(false)
  const [manualVerifyContext, setManualVerifyContext] = useState<{ message: string } | null>(null)
  const [manualConfirming, setManualConfirming] = useState(false)

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
        if (data.bankAccountName && data.bankAccountName !== formData.accountName) {
          setPendingBankNameSuggestion(data.bankAccountName as string)
        } else {
          setPendingBankNameSuggestion(null)
        }
        setShowForm(false)
        onSuccess(data.message || 'Bank account added successfully!')
      } else {
        const error = await response.json()
        onError(error.message || 'Failed to save account')
      }
    } catch (error) {
      console.error('Error saving account:', error)
      onError('Failed to save account. Please try again.')
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
        setPendingBankNameSuggestion(null)
        if (data.manualVerification) {
          onSuccess(`${data.message}${data.note ? ` — ${data.note}` : ''}`)
        } else {
          onSuccess(
            data.verifiedName
              ? `Account verified successfully! Bank shows account name as: "${data.verifiedName}"`
              : 'Account verified successfully!'
          )
        }
      } else {
        if (data.manualVerificationAvailable) {
          setManualVerifyContext({ message: data.message })
          setShowManualVerifyModal(true)
        } else {
          onError(`Verification failed: ${data.message}`)
        }
      }
    } catch (error) {
      console.error('Error verifying account:', error)
      onError('Failed to verify account. Please try again.')
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
        onSuccess(`${data.message}${data.note ? ` — ${data.note}` : ''}`)
      } else {
        onError(`Manual verification failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Error with manual verification:', error)
      onError('Failed to complete manual verification. Please try again.')
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
              sellerAccount.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {sellerAccount.isVerified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
          {(!sellerAccount.isVerified && pendingBankNameSuggestion && pendingBankNameSuggestion !== sellerAccount.accountName) && (
            <div className="mb-4 p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Bank suggested a different account name</p>
                  <p className="text-sm mt-1">Bank shows: <span className="font-semibold">{pendingBankNameSuggestion}</span></p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/seller/account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          accountNumber: sellerAccount.accountNumber,
                          bankCode: sellerAccount.bankCode,
                          bankName: sellerAccount.bankName,
                          accountName: pendingBankNameSuggestion
                        })
                      })
                      const data = await res.json()
                      if (res.ok) {
                        setSellerAccount(data.sellerAccount)
                        setPendingBankNameSuggestion(null)
                        onSuccess('Updated to bank’s account name. You can now try verifying again.')
                      } else {
                        onError(data.message || 'Could not update account name.')
                      }
                    } catch {
                      onError('Could not update account name. Please try again.')
                    }
                  }}
                  className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  Use bank’s name
                </button>
              </div>
            </div>
          )}
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
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10)
                setFormData({ ...formData, accountNumber: onlyDigits })
              }}
              onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                e.preventDefault()
                const pasted = e.clipboardData?.getData('text') || ''
                const onlyDigits = pasted.replace(/\D/g, '').slice(0, 10)
                const merged = (formData.accountNumber + onlyDigits).slice(0, 10)
                setFormData({ ...formData, accountNumber: merged })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500"
              placeholder="1234567890"
              maxLength={10}
              inputMode="numeric"
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
          <div className="w-12 h-12 text-gray-400 mx-auto mb-4"> </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Bank Account Added</h4>
          <p className="text-gray-600 mb-4">Add your bank account to receive earnings from sales</p>
        </div>
      )}

      {/* Manual verification modal */}
      <ManualVerifyModal
        open={showManualVerifyModal}
        message={manualVerifyContext?.message || 'Proceed with manual verification?'}
        onCancel={() => {
          setShowManualVerifyModal(false)
          setManualVerifyContext(null)
        }}
        onConfirm={async () => {
          try {
            setManualConfirming(true)
            await handleManualVerification()
          } finally {
            setManualConfirming(false)
            setShowManualVerifyModal(false)
            setManualVerifyContext(null)
          }
        }}
        confirming={manualConfirming}
      />
    </div>
  )
}

function ManualVerifyModal({
  open,
  message,
  onCancel,
  onConfirm,
  confirming,
}: {
  open: boolean
  message: string
  onCancel: () => void
  onConfirm: () => Promise<void> | void
  confirming?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Manual Verification</h3>
        <p className="text-gray-700 mb-2">{message}</p>
        <p className="text-sm text-gray-600 mb-6">
          Would you like to proceed with manual verification now? You can receive payments, and transfer setup will be
          completed automatically during your first sale.
        </p>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!!confirming}
            className={`flex-1 px-4 py-2 rounded-lg text-white ${confirming ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {confirming ? 'Processing…' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  )
}
