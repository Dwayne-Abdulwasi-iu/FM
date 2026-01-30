'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Trash2, AlertCircle, CheckCircle, DollarSign } from 'lucide-react'

interface BankAccount {
  id: string
  accountHolderName: string
  accountNumber: string
  routingNumber: string
  bankName: string
  accountType: 'CHECKING' | 'SAVINGS'
  isDefault: boolean
  isVerified: boolean
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED'
  verificationAttempts: number
  createdAt: string
}

export default function SellerBankAccountsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form states
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [routingNumber, setRoutingNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountType, setAccountType] = useState<'CHECKING' | 'SAVINGS'>('CHECKING')
  const [adding, setAdding] = useState(false)

  const fetchBankAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/seller/bank-accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error)
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

    fetchBankAccounts()
  }, [status, router, fetchBankAccounts])

  const handleAddAccount = async () => {
    if (!accountHolderName || !accountNumber || !routingNumber || !bankName) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setAdding(true)
      const response = await fetch('/api/seller/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountHolderName,
          accountNumber,
          routingNumber,
          bankName,
          accountType,
        }),
      })

      if (response.ok) {
        setShowForm(false)
        setAccountHolderName('')
        setAccountNumber('')
        setRoutingNumber('')
        setBankName('')
        setAccountType('CHECKING')
        await fetchBankAccounts()
      }
    } catch (error) {
      console.error('Failed to add account:', error)
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Remove this bank account?')) return

    try {
      const response = await fetch(`/api/seller/bank-accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchBankAccounts()
      }
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }

  const handleSetDefault = async (accountId: string) => {
    try {
      const response = await fetch(`/api/seller/bank-accounts/${accountId}/default`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchBankAccounts()
      }
    } catch (error) {
      console.error('Failed to set default account:', error)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading bank accounts...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 md:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">Bank Accounts</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage your payout accounts</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs whitespace-nowrap"
            aria-label="Add new bank account"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span> Account
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Your bank account information is encrypted and securely stored. Only add accounts you own.</span>
          </p>
        </div>

        {/* Add Account Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Bank Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">Account Holder Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  aria-label="Account holder name"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                    placeholder="e.g., Bank of America"
                    aria-label="Bank name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Account Type *</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as 'CHECKING' | 'SAVINGS')}
                    aria-label="Select account type"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                  >
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Routing Number *</label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="9 digit routing number"
                  aria-label="Routing number"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Account Number *</label>
                <input
                  type="password"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  aria-label="Account number"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-black bg-white text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-200 mt-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  aria-label="Cancel adding account"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAccount}
                  disabled={adding}
                  className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  aria-label="Add bank account"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No bank accounts added</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Add First Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{account.bankName}</h3>
                      {account.isDefault && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{account.accountHolderName}</p>
                    <p className="text-sm text-gray-600">
                      {account.accountType} • ••••{account.accountNumber.slice(-4)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {account.isVerified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    ) : account.verificationStatus === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle className="w-3 h-3" />
                        Verifying
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {!account.isDefault && (
                    <button
                      onClick={() => handleSetDefault(account.id)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
