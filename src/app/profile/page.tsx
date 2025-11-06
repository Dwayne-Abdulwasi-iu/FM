import React from 'react'
import ProfileTabs from '@/components/profile/ProfileTabs'

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
              {/* Tab navigation is handled inside the client component so interactions are client-side only */}
            </nav>
          </div>

          <div className="p-4 xs:p-5 md:p-6">
            <ProfileTabs />
          </div>
        </div>
      </div>
    </div>
  )
}