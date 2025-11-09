"use client"

import { useState, useEffect } from 'react'

export default function ResetOtpPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/reset-password-otp', { method: 'POST', body: JSON.stringify({ email, otp, password }), headers: { 'Content-Type': 'application/json' } })
      if (res.ok) {
        setMessage('Password changed successfully. You can now sign in.')
      } else {
        const j = await res.json()
        setMessage(j?.message || 'Failed to reset password')
      }
    } catch {
      setMessage('An error occurred')
    } finally { setLoading(false) }
  }

  const resend = async () => {
    if (!email) { setMessage('Enter your email to resend the code'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/resend-reset-code', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } })
        if (res.ok) {
          // Server may include cooldownSeconds in JSON; prefer that to keep client in sync
          const j = await res.json().catch(() => null)
          setMessage('If the email exists, a new code has been sent.')
          const cd = j?.cooldownSeconds ? Number(j.cooldownSeconds) : null
          setResendCooldown(cd ?? 300)
        }
      else {
        const j = await res.json().catch(() => null)
  setMessage(j?.message || 'Failed to resend code')
  // if server returned Retry-After header, use it
  const retry = res.headers.get('Retry-After')
  if (retry) setResendCooldown(Number(retry))
      }
    } catch {
      setMessage('Failed to resend code')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => setResendCooldown((s) => { if (s <= 1) { clearInterval(id); return 0 } return s - 1 }), 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="text-center text-2xl font-bold">Reset your password (OTP)</h2>
        <p className="mt-2 text-sm text-gray-600">Enter your email, the 6-digit code you received, and a new password.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {message && <div className="text-sm text-green-700">{message}</div>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 flex">
              <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="flex-1 block w-full border px-3 py-2 rounded" placeholder="you@example.com" />
              <button type="button" onClick={resend} disabled={loading || !email || resendCooldown > 0} className="ml-2 px-3 py-2 bg-gray-100 rounded text-sm">
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Reset code</label>
            <input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} type="text" required className="mt-1 block w-full border px-3 py-2 rounded" placeholder="123456" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">New password</label>
            <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 block w-full border px-3 py-2 rounded" placeholder="Choose a strong password" />
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-indigo-600 text-white rounded disabled:opacity-50">{loading ? 'Resetting...' : 'Reset password'}</button>
          </div>

          <div className="text-sm text-center">
            <a href="/auth/signin" className="text-indigo-600">Back to sign in</a>
          </div>
        </form>
      </div>
    </div>
  )
}
