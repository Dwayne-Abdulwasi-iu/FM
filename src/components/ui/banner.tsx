"use client"

import React from 'react'

type BannerType = 'success' | 'error' | 'warning' | 'info'

export type BannerProps = {
  type?: BannerType
  children?: React.ReactNode
  message?: React.ReactNode
  onClose?: () => void
  className?: string
}

const toneStyles: Record<BannerType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

export default function Banner({ type = 'info', children, message, onClose, className = '' }: BannerProps) {
  const role: React.AriaRole | undefined = type === 'error' ? 'alert' : undefined

  return (
    <div
      {...(role ? { role } : {})}
      className={`mb-6 p-4 rounded-lg border flex items-start justify-between ${toneStyles[type]} ${className}`}
    >
      <div className="font-medium pr-4">{children ?? message}</div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="ml-4 opacity-75 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  )
}
