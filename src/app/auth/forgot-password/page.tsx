"use client"

import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } })
      if (res.ok) {
        setMessage('If an account exists for that email, a reset link has been sent.')
      } else {
        const j = await res.json()
        setMessage(j?.message || 'Failed to send reset link')
      }
    } catch {
      setMessage('An error occurred')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h2 className="text-center text-2xl font-bold">Forgot your password?</h2>
  <p className="mt-2 text-sm text-gray-600">Enter your email and we will send a link to reset your password.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {message && <div className="text-sm text-green-700">{message}</div>}
          <div>
            <label htmlFor="fp-email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="fp-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 block w-full border px-3 py-2 rounded" placeholder="you@example.com" />
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-indigo-600 text-white rounded disabled:opacity-50">{loading ? 'Sending...' : 'Send reset link'}</button>
          </div>

          <div className="text-sm text-center">
            <a href="/auth/signin" className="text-indigo-600">Back to sign in</a>
          </div>
        </form>
      </div>
    </div>
  )
}
