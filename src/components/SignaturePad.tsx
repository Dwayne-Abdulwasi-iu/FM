'use client'

import { useState } from 'react'

interface SignaturePadProps {
  onSignatureChange: (signature: string) => void
  label?: string
}

export default function SignaturePad({ onSignatureChange, label = 'Sign Below' }: SignaturePadProps) {
  const [signature, setSignature] = useState('')

  const handleChange = (value: string) => {
    setSignature(value)
    onSignatureChange(value)
  }

  return (
    <div className="w-full space-y-3">
      <label className="block text-xs sm:text-sm font-medium text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      
      <div className="space-y-2">
        <input
          type="text"
          value={signature}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
          placeholder="Type your full name or signature"
        />

        {signature && (
          <div className="border-2 border-gray-300 rounded p-4 bg-gray-50">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-2">Signature Preview:</p>
            <p 
              style={{
                fontFamily: 'cursive',
                fontSize: '32px',
                fontStyle: 'italic',
                color: '#1f2937',
                letterSpacing: '2px'
              }}
              className="text-gray-900"
            >
              {signature}
            </p>
          </div>
        )}
      </div>

      <p className="text-[10px] sm:text-xs text-gray-500">
        Type your name or signature as you would like it to appear on the legal document.
      </p>
    </div>
  )
}

