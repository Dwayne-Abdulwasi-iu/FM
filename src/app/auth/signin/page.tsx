'use client'

import { useState, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Check if session was created successfully
        const session = await getSession()
        if (session) {
          router.push(callbackUrl)
        } else {
          setError('Failed to create session')
        }
      }
    } catch (_error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-4 sm:py-8 lg:py-12 px-2 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-base sm:text-xl">FM</span>
          </div>
        </div>
        <h2 className="mt-4 sm:mt-6 text-center text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-1.5 sm:mt-2 text-center text-xs sm:text-sm text-gray-600">
          Or{' '}
          <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-4 sm:mt-8 w-full max-w-md mx-auto">
        <div className="bg-white py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-10 shadow sm:rounded-lg">
          <form className="space-y-3 sm:space-y-4 lg:space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-2 sm:px-4 py-2 sm:py-3 rounded-md text-xs sm:text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-900">
                Email address
              </label>
              <div className="mt-0.5 sm:mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-2 sm:px-3 py-1.5 sm:py-2 pl-8 sm:pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white text-xs sm:text-base"
                  placeholder="Enter your email"
                />
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 absolute left-2.5 sm:left-3 top-1.5 sm:top-2.5" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-900">
                Password
              </label>
              <div className="mt-0.5 sm:mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-2 sm:px-3 py-1.5 sm:py-2 pl-8 sm:pl-10 pr-8 sm:pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white text-xs sm:text-base"
                  placeholder="Enter your password"
                />
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 absolute left-2.5 sm:left-3 top-1.5 sm:top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 sm:right-3 top-1.5 sm:top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-1.5 sm:py-2 px-3 sm:px-4 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignInContent />
    </Suspense>
  )
}