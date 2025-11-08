"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPage({ params }: { params: { token: string } }) {
  const token = params?.token
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setMessage('Password must be at least 8 characters'); return }
    if (password !== confirm) { setMessage('Passwords do not match'); return }
    setLoading(true); setMessage(null)
    try {
      const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
      if (res.ok) {
        setMessage('Password updated. Redirecting to sign in...')
        setTimeout(() => router.push('/auth/signin'), 1200)
      } else {
        const j = await res.json()
        setMessage(j?.message || 'Failed to reset password')
      }
    } catch {
      setMessage('An error occurred')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="text-center text-2xl font-bold">Reset your password</h2>
        <p className="mt-2 text-sm text-gray-600">Enter a new password for your account.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {message && <div className="text-sm text-red-700">{message}</div>}

          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700">New password</label>
            <input id="reset-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 block w-full border px-3 py-2 rounded" placeholder="New password" />
          </div>

          <div>
            <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700">Confirm password</label>
            <input id="reset-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required className="mt-1 block w-full border px-3 py-2 rounded" placeholder="Confirm password" />
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-indigo-600 text-white rounded disabled:opacity-50">{loading ? 'Updating...' : 'Update password'}</button>
          </div>

          <div className="text-sm text-center">
            <a href="/auth/signin" className="text-indigo-600">Back to sign in</a>
          </div>
        </form>
      </div>
    </div>
  )
}
