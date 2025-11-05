import React from 'react'
import SellerAccountTab from '@/components/profile/SellerAccountTab'

export default function ProfilePage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 xs:p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto px-4 sm:px-6 space-x-3 xs:space-x-4 sm:space-x-8">
              <span className="py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600">Bank Account</span>
            </nav>
          </div>

          <div className="p-4 xs:p-5 md:p-6">
            <SellerAccountTab onSuccess={() => {}} onError={() => {}} />
          </div>
        </div>
      </div>
    </div>
  )
}
 'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import SellerAccountTab from '@/components/profile/SellerAccountTab'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'designs' | 'earnings' | 'orders' | 'account'>('overview')

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 xs:p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">Seller</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto px-4 sm:px-6 space-x-3 xs:space-x-4 sm:space-x-8">
              <button onClick={() => setActiveTab('overview')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab==='overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>Overview</button>
              <button onClick={() => setActiveTab('designs')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab==='designs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>My Designs</button>
              <button onClick={() => setActiveTab('earnings')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab==='earnings' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>Earnings</button>
              <button onClick={() => setActiveTab('orders')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab==='orders' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>Orders</button>
              <button onClick={() => setActiveTab('account')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab==='account' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>Bank Account</button>
            </nav>
          </div>

          <div className="p-4 xs:p-5 md:p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
                <p className="text-gray-600">Basic profile information is available here.</p>
                <Link href="/upload" className="text-indigo-600 hover:underline">Upload new design</Link>
              </div>
            )}

            {activeTab === 'designs' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Designs</h3>
                <p className="text-gray-600">Your uploaded designs will appear here.</p>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Overview</h3>
                <p className="text-gray-600">Payouts and earnings history.</p>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Orders</h3>
                <p className="text-gray-600">Order history and details.</p>
              </div>
            )}

            {activeTab === 'account' && (
              <SellerAccountTab onSuccess={() => {}} onError={() => {}} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
                      <button onClick={() => { setEarnTimeframe('7d'); setEarnFrom(new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10)); setEarnTo(''); setEarnPage(1) }} className={`px-2 py-1 rounded ${earnTimeframe==='7d'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>7d</button>
                      <button onClick={() => { setEarnTimeframe('30d'); setEarnFrom(new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10)); setEarnTo(''); setEarnPage(1) }} className={`px-2 py-1 rounded ${earnTimeframe==='30d'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>30d</button>
                      <button onClick={() => { setEarnTimeframe('all'); setEarnFrom(''); setEarnTo(''); setEarnPage(1) }} className={`px-2 py-1 rounded ${earnTimeframe==='all'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-gray-500" htmlFor="earn-status">Status:</label>
                      <select id="earn-status" value={earnStatus} onChange={(e)=>{ setEarnStatus(e.target.value as 'ALL' | 'PENDING' | 'PAID' | 'SKIPPED_SPLIT' | 'FAILED'); setEarnPage(1) }} className="px-2 py-1 border border-gray-300 rounded text-sm text-black" title="Filter by payout status">
                        <option value="ALL">All</option>
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="SKIPPED_SPLIT">Skipped Split</option>
                        <option value="FAILED">Failed</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-gray-500" htmlFor="earn-search">Search:</label>
                      <input id="earn-search" type="text" value={earnSearch} onChange={(e)=>{ setEarnSearch(e.target.value); setEarnPage(1) }} placeholder="Order # or design title" className="px-3 py-1.5 border border-gray-300 rounded text-sm text-black placeholder-gray-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="earn-from" className="block text-xs text-gray-600 mb-1">From</label>
                      <input id="earn-from" type="date" value={earnFrom} onChange={(e)=>{ setEarnFrom(e.target.value); setEarnPage(1) }} className="w-full px-3 py-2 border border-gray-300 rounded text-black" title="Start date" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label htmlFor="earn-to" className="block text-xs text-gray-600 mb-1">To</label>
                      <input id="earn-to" type="date" value={earnTo} onChange={(e)=>{ setEarnTo(e.target.value); setEarnPage(1) }} className="w-full px-3 py-2 border border-gray-300 rounded text-black" title="End date" />
                    </div>
                    <div className="col-span-1 md:col-span-2 flex items-end gap-2">
                      <button onClick={()=>{ setEarnSearch(''); setEarnFrom(''); setEarnTo(''); setEarnStatus('ALL'); setEarnSortBy('date'); setEarnSortOrder('desc'); setEarnPageSize(25); setEarnTimeframe('all'); setEarnPage(1); fetchEarnings(); }} className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Reset</button>
                      <label className="text-xs text-gray-500" htmlFor="earn-ps">Rows</label>
                      <select id="earn-ps" value={earnPageSize} onChange={(e)=>{ setEarnPageSize(parseInt(e.target.value,10)||25); setEarnPage(1) }} className="px-2 py-1 border border-gray-300 rounded text-sm text-black">
                        {[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <button onClick={exportEarningsCsv} disabled={exportingCsv} className={`ml-auto px-3 py-2 text-sm rounded text-white ${exportingCsv ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{exportingCsv ? 'Exporting…' : 'Export CSV'}</button>
                    </div>
                  </div>
                </div>

                {/* Totals summary for current filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                    <p className="text-xs text-gray-600">Sales</p>
                    <p className="text-xl font-semibold text-gray-900">{formatPrice(earnSums.saleAmount)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                    <p className="text-xs text-gray-600">Commission</p>
                    <p className="text-xl font-semibold text-red-600">-{formatPrice(earnSums.platformCommission)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                    <p className="text-xs text-gray-600">You Earn</p>
                    <p className="text-xl font-semibold text-green-600">{formatPrice(earnSums.sellerAmount)}</p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={()=>{ if(earnSortBy==='date'){ setEarnSortOrder(earnSortOrder==='asc'?'desc':'asc') } else { setEarnSortBy('date'); setEarnSortOrder('desc') } }} className={`inline-flex items-center gap-1 ${earnSortBy==='date'?'text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>Date {earnSortBy==='date' && <span>{earnSortOrder==='asc'?'▲':'▼'}</span>}</button>
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Design</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button onClick={()=>{ if(earnSortBy==='amount'){ setEarnSortOrder(earnSortOrder==='asc'?'desc':'asc') } else { setEarnSortBy('amount'); setEarnSortOrder('desc') } }} className={`inline-flex items-center gap-1 ${earnSortBy==='amount'?'text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>You Earn {earnSortBy==='amount' && <span>{earnSortOrder==='asc'?'▲':'▼'}</span>}</button>
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sale</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {earningsLoading ? (
                        <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
                      ) : earnings.length === 0 ? (
                        <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No earnings yet</td></tr>
                      ) : (
                        earnings.map((row) => (
                          <tr key={row.id} className="odd:bg-white even:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{new Date(row.createdAt).toLocaleString()}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              <Link href={`/profile/orders/${row.order.id}`} className="text-indigo-600 hover:underline">#{row.order.orderNumber}</Link>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 max-w-[16rem]">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                  <SafeImage src={row.design.imageUrl} alt={row.design.title} className="w-full h-full object-cover" />
                                </div>
                                <Link href={`/designs/${row.design.id}`} className="truncate text-indigo-600 hover:underline" title={row.design.title}>{row.design.title}</Link>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{row.quantity}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-green-700 text-right">{formatPrice(row.sellerAmount)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-red-700 text-right">-{formatPrice(row.platformCommission)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{formatPrice(row.saleAmount)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">
                              <span className={`inline-flex px-2 py-1 rounded-full font-semibold ${
                                row.payoutStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                                row.payoutStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                row.payoutStatus === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {row.payoutStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paging */}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    {earnTotal > 0 ? (()=>{ const start=(earnPage-1)*earnPageSize+1; const end=Math.min(earnPage*earnPageSize, earnTotal); return <span>Showing {start}-{end} of {earnTotal}</span>; })() : <span>Showing results</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=> setEarnPage(p => Math.max(1, p-1))} disabled={earnPage<=1} className={`px-2 py-1 rounded ${earnPage<=1?'bg-gray-100 text-gray-400 cursor-not-allowed':'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Prev</button>
                    <span className="text-gray-600">Page {earnPage}{earnTotal>0?` of ${Math.max(1, Math.ceil(earnTotal/earnPageSize))}`:''}</span>
                    <button onClick={()=> setEarnPage(p => p + 1)} disabled={earnTotal>0 ? earnPage >= Math.ceil(earnTotal/earnPageSize) : earnings.length < earnPageSize} className={`px-2 py-1 rounded ${earnTotal>0 && earnPage >= Math.ceil(earnTotal/earnPageSize) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Next</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Orders</h3>
                <p className="text-gray-600 mb-4">View your purchase history and open individual order details.</p>
                <Link
                  href="/profile/orders"
                  className="inline-flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Open Orders Page
                </Link>
              </div>
            )}

            {activeTab === 'account' && (
              <SellerAccountTab onSuccess={showSuccess} onError={showError} />
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
              Are you sure you want to delete &quot;{deleteConfirm.title}&quot;? This action cannot be undone.
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
function SellerAccountTab({
  onSuccess,
  onError,
}: {
  onSuccess: (message: string) => void
  onError: (message: string) => void
}) {
  interface SellerAccount {
    accountNumber: string
    accountName: string
    bankCode: string
    bankName: string
    isVerified?: boolean
    isActive?: boolean
  }
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
        // Check if manual verification is available
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
              sellerAccount.isVerified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
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
                // Prevent the raw paste so the browser doesn't insert formatting characters.
                e.preventDefault()
                const pasted = e.clipboardData?.getData('text') || ''
                const onlyDigits = pasted.replace(/\D/g, '').slice(0, 10)
                // Merge with existing value up to 10 chars to mimic natural paste behaviour
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
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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

// Inline modal for manual verification confirmation
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

// Export the SellerAccountTab for testing and reuse
export { SellerAccountTab }