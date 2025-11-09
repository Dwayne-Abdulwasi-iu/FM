"use client"

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function LegacyResetRedirect() {
  const router = useRouter()
  const params = useParams()
  useEffect(() => {
    // Redirect legacy link-based flows to the OTP reset page
    router.replace('/auth/reset-otp')
  }, [router, params])

  return <div className="min-h-screen flex items-center justify-center">Redirecting to the new reset flow…</div>
}
