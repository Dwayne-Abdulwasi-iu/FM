'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, User, Mail, Globe, MapPin, FileText, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string | null
  displayName: string | null
  email: string
  bio: string | null
  website: string | null
  location: string | null
  image: string | null
  role: string
  createdAt: string
  isVerified: boolean
  designerTier: string | null
}

export default function EditProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    bio: '',
    website: '',
    location: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchProfile()
  }, [session, status, router])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile')
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setForm({
          name: data.user.name || '',
          displayName: data.user.displayName || '',
          bio: data.user.bio || '',
          website: data.user.website || '',
          location: data.user.location || ''
        })
      } else {
        setErrorMessage('Failed to load profile')
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setErrorMessage('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setErrorMessage(null)
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (response.ok) {
        setSuccessMessage('Profile updated successfully!')
        setTimeout(() => {
          router.push('/profile')
        }, 1500)
      } else {
        const error = await response.json()
        setErrorMessage(error.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      setErrorMessage('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/profile"
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-black"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-black">Edit Profile</h1>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Profile Picture Section */}
          <div className="flex items-center gap-4 pb-6 border-b">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100">
              {profile?.image ? (
                <Image
                  src={profile.image}
                  alt={profile.name || 'Profile'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-black">{profile?.email}</p>
              <p className="text-sm text-gray-600 capitalize">{profile?.role?.toLowerCase()} Account</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black placeholder-gray-400"
              placeholder="Your full name"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black placeholder-gray-400"
              placeholder="How your name appears to others"
            />
            <p className="mt-1 text-xs text-gray-600">This is how your name will appear on your designs</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-black placeholder-gray-400"
              placeholder="Tell others about yourself..."
            />
            <p className="mt-1 text-xs text-gray-600">{form.bio.length}/500 characters</p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              <Globe className="w-4 h-4 inline mr-2" />
              Website
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black placeholder-gray-400"
              placeholder="https://yourwebsite.com"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black placeholder-gray-400"
              placeholder="City, Country"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>

        {/* Email Notice */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700">Email Address</p>
              <p className="text-sm text-blue-600">
                Your email address ({profile?.email}) cannot be changed. Contact support if you need to update it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
