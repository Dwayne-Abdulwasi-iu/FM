'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'details' | 'otp' | 'password'>('details')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  const handleSendOtp = async () => {
    setLoading(true)
    setError('')
    setInfoMessage('')

    if (!formData.name || !formData.email || !formData.phone) {
      setError('Name, email, and phone are required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send-otp',
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setInfoMessage(data.message || 'OTP sent to your email.')
        setStep('otp')
      } else {
        setError(data.error || 'Failed to send OTP')
      }
    } catch (_error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLoading(true)
    setError('')
    setInfoMessage('')

    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP code')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-otp',
          email: formData.email,
          otp,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setInfoMessage(data.message || 'OTP verified. Set your password to continue.')
        setStep('password')
      } else {
        setError(data.error || 'Invalid OTP')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfoMessage('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete-registration',
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/auth/signin?message=Account created successfully! Please sign in.')
      } else {
        setError(data.error || 'Failed to create account')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">FM</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleCreateAccount}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                {infoMessage}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={step !== 'details'}
                  value={formData.name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your full name"
                />
                <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={step !== 'details'}
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your email"
                />
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1 relative">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  disabled={step !== 'details'}
                  value={formData.phone}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+234 xxx xxx xxxx"
                />
                <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Include country code. Used for important account notifications.
              </p>
            </div>

            {step === 'details' && (
              <div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP to Email'}
                </button>
              </div>
            )}

            {step === 'otp' && (
              <>
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Email OTP
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                    <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="py-2 px-4 text-sm font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="py-2 px-4 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                </div>
              </>
            )}

            {step === 'password' && (
              <>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your password"
                />
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Confirm your password"
                />
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
              </>
            )}

            <p className="text-xs text-center text-gray-500">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-indigo-600 hover:text-indigo-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
