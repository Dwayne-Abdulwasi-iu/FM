"use client"

import React from 'react'

export type ConfirmModalProps = {
  open: boolean
  title?: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  confirming?: boolean
  tone?: 'default' | 'danger' | 'warning'
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirming = false,
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  const toneClasses =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : tone === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700'
      : 'bg-indigo-600 hover:bg-indigo-700'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md mx-4 rounded-lg bg-white shadow-lg"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          {description && (
            <div className="text-sm text-gray-700 mb-6">{description}</div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className={`flex-1 px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed ${toneClasses}`}
            >
              {confirming ? 'Working…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
