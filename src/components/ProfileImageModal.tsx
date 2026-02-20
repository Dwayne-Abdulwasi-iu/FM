'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Upload } from 'lucide-react'

interface ProfileImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string | null
  userName: string
  isOwnProfile: boolean
  onImageUpload?: (file: File) => Promise<void>
  isUploading?: boolean
}

export default function ProfileImageModal({
  isOpen,
  onClose,
  imageUrl,
  userName,
  isOwnProfile,
  onImageUpload,
  isUploading = false
}: ProfileImageModalProps) {
  const [uploading, setUploading] = useState(false)

  if (!isOpen) return null

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageUpload) return

    try {
      setUploading(true)
      await onImageUpload(file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">{userName}'s Profile Picture</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto">
          {imageUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={imageUrl}
                alt={`${userName}'s profile`}
                width={600}
                height={600}
                className="max-w-full max-h-full object-contain"
                priority
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">👤</span>
              </div>
              <p className="text-center">No profile picture yet</p>
            </div>
          )}
        </div>

        {/* Footer - Show upload button only for own profile */}
        {isOwnProfile && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              <button
                onClick={() => {
                  const fileInput = document.querySelector(
                    'input[type="file"]'
                  ) as HTMLInputElement
                  fileInput?.click()
                }}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Change Picture'}
              </button>
            </label>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Footer - Read-only for other users */}
        {!isOwnProfile && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
