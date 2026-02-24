'use client'

import { Suspense } from 'react'
import ComingSoonContent from './content'

export default function ComingSoonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black" />}>
      <ComingSoonContent />
    </Suspense>
  )
}
