'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Bell,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  RefreshCw,
  Globe,
  Languages,
} from 'lucide-react'
import { useCurrency } from '@/components/CurrencyProvider'
import { useLanguage } from '@/contexts/LanguageContext'

interface BankAccount {
  bankName: string
  accountNumber: string
  accountName: string
  bankCode: string
  isVerified: boolean
}

interface SellerSettings {
  emailNotifications: boolean
  orderNotifications: boolean
  payoutNotifications: boolean
  bankAccount: BankAccount | null
}

export default function SellerSettingsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const { currency, setCurrency, currencies } = useCurrency()
  const { locale, setLocale, supportedLocales, currentLocaleConfig } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SellerSettings>({
    emailNotifications: true,
    orderNotifications: true,
    payoutNotifications: true,
    bankAccount: null,
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Bank account form
  const [showBankForm, setShowBankForm] = useState(false)
  const [banks, setBanks] = useState<{ code: string; name: string }[]>([])
  const [bankForm, setBankForm] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
  })
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (authStatus === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchSettings()
    fetchBanks()
  }, [session, authStatus, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/seller/account')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          emailNotifications: data.emailNotifications ?? true,
          orderNotifications: data.orderNotifications ?? true,
          payoutNotifications: data.payoutNotifications ?? true,
          bankAccount: data.bankAccount || null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/seller/banks')
      if (response.ok) {
        const data = await response.json()
        setBanks(data.banks || [])
      }
    } catch (error) {
      console.error('Failed to fetch banks:', error)
    }
  }

  const handleSaveNotifications = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/seller/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications: settings.emailNotifications,
          orderNotifications: settings.orderNotifications,
          payoutNotifications: settings.payoutNotifications,
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleVerifyAccount = async () => {
    if (!bankForm.bankCode || !bankForm.accountNumber) return

    setVerifying(true)
    setVerified(false)

    try {
      const response = await fetch('/api/seller/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankCode: bankForm.bankCode,
          accountNumber: bankForm.accountNumber,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setBankForm((prev) => ({ ...prev, accountName: data.accountName }))
        setVerified(true)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.message || 'Failed to verify account' })
      }
    } catch (error) {
      console.error('Failed to verify account:', error)
      setMessage({ type: 'error', text: 'Failed to verify account' })
    } finally {
      setVerifying(false)
    }
  }

  const handleSaveBankAccount = async () => {
    if (!verified || !bankForm.accountName) {
      setMessage({ type: 'error', text: 'Please verify your account first' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const selectedBank = banks.find((b) => b.code === bankForm.bankCode)
      const response = await fetch('/api/seller/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccount: {
            bankCode: bankForm.bankCode,
            bankName: selectedBank?.name || '',
            accountNumber: bankForm.accountNumber,
            accountName: bankForm.accountName,
            isVerified: true,
          },
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Bank account saved successfully!' })
        setShowBankForm(false)
        fetchSettings()
      } else {
        setMessage({ type: 'error', text: 'Failed to save bank account' })
      }
    } catch (error) {
      console.error('Failed to save bank account:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Link
            href="/seller/dashboard"
            className="inline-flex items-center text-xs sm:text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Seller Settings</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Manage your payout settings and preferences</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-3 sm:mb-4 md:mb-6 p-2.5 sm:p-3 md:p-4 rounded-lg flex items-center gap-2 text-xs sm:text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Bank Account Section */}
        <div id="bank" className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Bank Account</h2>
              <p className="text-xs sm:text-sm text-gray-500">Your payout destination</p>
            </div>
          </div>

          {settings.bankAccount ? (
            <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 md:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-xs sm:text-sm text-gray-900 truncate">{settings.bankAccount.bankName}</span>
                </div>
                {settings.bankAccount.isVerified && (
                  <span className="inline-flex items-center px-2 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                    <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">Verified</span>
                    <span className="sm:hidden">OK</span>
                  </span>
                )}
              </div>
              <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-gray-600">
                <p>
                  <span className="text-gray-400">Account Name:</span> {settings.bankAccount.accountName}
                </p>
                <p>
                  <span className="text-gray-400">Account #:</span> ****
                  {settings.bankAccount.accountNumber.slice(-4)}
                </p>
              </div>
              <button
                onClick={() => setShowBankForm(true)}
                className="mt-2 sm:mt-3 text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Update Bank Account
              </button>
            </div>
          ) : (
            <div className="text-center py-4 sm:py-6">
              <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
              <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">No bank account added yet</p>
              <button
                onClick={() => setShowBankForm(true)}
                className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white text-xs sm:text-sm rounded-lg hover:bg-indigo-700"
              >
                Add Bank Account
              </button>
            </div>
          )}

          {/* Bank Form */}
          {showBankForm && (
            <div className="mt-3 sm:mt-4 md:mt-6 pt-3 sm:pt-4 md:pt-6 border-t border-gray-200">
              <h3 className="font-medium text-xs sm:text-sm md:text-base text-gray-900 mb-2 sm:mb-3 md:mb-4">
                {settings.bankAccount ? 'Update' : 'Add'} Bank Account
              </h3>
              <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                <div>
                  <label htmlFor="bankCode" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Bank</label>
                  <select
                    id="bankCode"
                    value={bankForm.bankCode}
                    onChange={(e) => {
                      setBankForm({ ...bankForm, bankCode: e.target.value, accountName: '' })
                      setVerified(false)
                    }}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a bank</option>
                    {banks.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={bankForm.accountNumber}
                      onChange={(e) => {
                        setBankForm({ ...bankForm, accountNumber: e.target.value, accountName: '' })
                        setVerified(false)
                      }}
                      maxLength={10}
                      className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="10-digit account"
                    />
                    <button
                      onClick={handleVerifyAccount}
                      disabled={verifying || !bankForm.bankCode || bankForm.accountNumber.length < 10}
                      className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      {verifying ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {bankForm.accountName && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-2.5 md:p-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-green-700 text-xs sm:text-sm">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="font-medium">{bankForm.accountName}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowBankForm(false)
                      setBankForm({ bankCode: '', accountNumber: '', accountName: '' })
                      setVerified(false)
                    }}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBankAccount}
                    disabled={!verified || saving}
                    className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white text-xs sm:text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Save Bank Account</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Notifications</h2>
              <p className="text-xs sm:text-sm text-gray-500">Manage your notification preferences</p>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <div>
                <p className="font-medium text-xs sm:text-sm text-gray-900">Email Notifications</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Receive updates via email</p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, emailNotifications: e.target.checked })
                }
                className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <div>
                <p className="font-medium text-xs sm:text-sm text-gray-900">Order Notifications</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Get notified when you receive orders</p>
              </div>
              <input
                type="checkbox"
                checked={settings.orderNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, orderNotifications: e.target.checked })
                }
                className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
              />
            </label>

            <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <div>
                <p className="font-medium text-xs sm:text-sm text-gray-900">Payout Notifications</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Get notified about payout status</p>
              </div>
              <input
                type="checkbox"
                checked={settings.payoutNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, payoutNotifications: e.target.checked })
                }
                className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rounded focus:ring-indigo-500 flex-shrink-0"
              />
            </label>
          </div>

          <button
            onClick={handleSaveNotifications}
            disabled={saving}
            className="mt-3 sm:mt-4 md:mt-6 inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white text-xs sm:text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Save Preferences</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </button>
        </div>

        {/* Currency & Language Section */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Display Preferences</h2>
              <p className="text-xs sm:text-sm text-gray-500">Customize how prices and content are displayed</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Currency Selector */}
            <div>
              <label htmlFor="displayCurrency" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Display Currency
              </label>
              <select
                id="displayCurrency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value)
                  setMessage({ type: 'success', text: 'Currency preference saved!' })
                  setTimeout(() => setMessage(null), 3000)
                }}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.flag} {curr.code} - {curr.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                All prices will be displayed in your selected currency. Actual payments are processed in the original currency.
              </p>
            </div>

            {/* Language Selector */}
            <div className="pt-3 sm:pt-4 border-t border-gray-200">
              <label htmlFor="displayLanguage" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                <Languages className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Language
              </label>
              <select
                id="displayLanguage"
                value={locale}
                onChange={(e) => {
                  setLocale(e.target.value as typeof locale)
                  setMessage({ type: 'success', text: 'Language preference saved!' })
                  setTimeout(() => setMessage(null), 3000)
                }}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              >
                {supportedLocales.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                Interface text will be displayed in your selected language where available.
              </p>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Account Security</h2>
              <p className="text-xs sm:text-sm text-gray-500">Manage your account security</p>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <Link
              href="/profile/settings"
              className="block p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <p className="font-medium text-xs sm:text-sm text-gray-900">Change Password</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Update your account password</p>
            </Link>

            <Link
              href="/profile/edit"
              className="block p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <p className="font-medium text-xs sm:text-sm text-gray-900">Edit Profile</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Update your profile information</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
