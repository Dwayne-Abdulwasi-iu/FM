'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Smartphone, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'

interface Session {
  id: string
  userAgent: string
  ipAddress: string
  lastActive: string
  isCurrent: boolean
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  recoveryCodesCount: number
  passwordLastChanged: string
  activeSessions: Session[]
  loginAttempts: Array<{
    timestamp: string
    ipAddress: string
    status: 'success' | 'failed'
    device: string
  }>
}

export default function AccountSecurityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [security, setSecurity] = useState<SecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)

  // Password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [changingPassword, setChangingPassword] = useState(false)

  // 2FA states
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [qrCode, setQrCode] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    fetchSecuritySettings()
  }, [status, router])

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/account/security')
      if (response.ok) {
        const data = await response.json()
        setSecurity(data.settings)
      }
    } catch (error) {
      console.error('Failed to fetch security settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      alert('New password must be at least 8 characters')
      return
    }

    try {
      setChangingPassword(true)
      const response = await fetch('/api/account/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (response.ok) {
        setShowPasswordForm(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        alert('Password changed successfully')
        await fetchSecuritySettings()
      } else {
        alert('Failed to change password')
      }
    } catch (error) {
      console.error('Failed to change password:', error)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleEnable2FA = async () => {
    try {
      const response = await fetch('/api/account/security/2fa/setup', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setQrCode(data.qrCode)
        setShow2FASetup(true)
      }
    } catch (error) {
      console.error('Failed to setup 2FA:', error)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('Disable two-factor authentication?')) return

    try {
      const response = await fetch('/api/account/security/2fa/disable', {
        method: 'POST',
      })
      if (response.ok) {
        alert('2FA disabled')
        await fetchSecuritySettings()
      }
    } catch (error) {
      console.error('Failed to disable 2FA:', error)
    }
  }

  const handleSignOutSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/account/security/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchSecuritySettings()
      }
    } catch (error) {
      console.error('Failed to sign out session:', error)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading security settings...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile/settings" className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account security and privacy</p>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password
          </h2>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
            <div>
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-sm text-gray-600 mt-1">
                Last changed: {security ? new Date(security.passwordLastChanged).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                Change
              </button>
            )}
          </div>

          {showPasswordForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Current Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black pr-10"
                  />
                  <button
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">New Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black pr-10"
                  />
                  <button
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">At least 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black pr-10"
                  />
                  <button
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPasswordForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2FA Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Two-Factor Authentication
          </h2>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Secure Your Account</p>
              <p className="text-sm text-gray-600 mt-1">
                {security?.twoFactorEnabled
                  ? '✓ Enabled - Your account is protected'
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
            {!security?.twoFactorEnabled ? (
              <button
                onClick={handleEnable2FA}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                Enable
              </button>
            ) : (
              <button
                onClick={handleDisable2FA}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition text-sm"
              >
                Disable
              </button>
            )}
          </div>

          {security?.twoFactorEnabled && security.recoveryCodesCount > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {security.recoveryCodesCount} recovery codes saved
              </p>
            </div>
          )}
        </div>

        {/* Active Sessions */}
        {security && security.activeSessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Sessions</h2>
            <div className="space-y-3">
              {security.activeSessions.map((sess) => (
                <div key={sess.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{sess.userAgent}</p>
                    <p className="text-sm text-gray-600 mt-1">{sess.ipAddress}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last active: {new Date(sess.lastActive).toLocaleString()}
                      {sess.isCurrent && ' (Current)'}
                    </p>
                  </div>
                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleSignOutSession(sess.id)}
                      className="px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition text-sm"
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

