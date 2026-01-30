'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gift, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react'

interface TrialStatusCardProps {
  isActive: boolean
  expiresAt: Date | null
  activatedAt: Date | null
}

export function TrialStatusCard({ isActive, expiresAt, activatedAt }: TrialStatusCardProps) {
  const [daysRemaining, setDaysRemaining] = useState<number>(0)
  const [timeDisplay, setTimeDisplay] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (!expiresAt) return

      const now = new Date()
      const expiry = new Date(expiresAt)
      const diffMs = expiry.getTime() - now.getTime()

      if (diffMs <= 0) {
        setIsExpired(true)
        setDaysRemaining(0)
        setTimeDisplay('Expired')
        return
      }

      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      setDaysRemaining(diffDays)

      if (diffDays === 1) {
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        setTimeDisplay(`${diffDays} day, ${hours} hours left`)
      } else if (diffDays === 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        setTimeDisplay(`${hours} hours left`)
      } else {
        setTimeDisplay(`${diffDays} days left`)
      }
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!isActive && !isExpired) {
    return null
  }

  if (isExpired) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Pro Trial Expired</h3>
            <p className="text-red-800 text-sm mb-4">
              Your 30-day Pro trial has ended. You're back to standard seller rates and features.
            </p>
            <Link
              href="/seller/pro-subscription"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              <Zap className="w-4 h-4" />
              Upgrade to Pro Now
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <Gift className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-primary-900">30-Day Pro Trial Active</h3>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-primary-800 text-sm mb-4">
              Enjoy premium features and benefits while your trial is active.
            </p>

            {/* Trial Timeline */}
            <div className="bg-white bg-opacity-70 rounded-lg p-3 mb-4 border border-primary-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-primary-900">{timeDisplay}</span>
              </div>
              {expiresAt && (
                <p className="text-xs text-primary-700">
                  Expires: {new Date(expiresAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>

            {/* Trial Benefits */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-primary-900 uppercase tracking-wide">Pro Benefits:</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <li className="flex items-center gap-2 text-primary-800">
                  <span className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                  Featured listings: <strong>6 designs</strong> (vs 5)
                </li>
                <li className="flex items-center gap-2 text-primary-800">
                  <span className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                  Tier boost: <strong>+1 level</strong>
                </li>
                <li className="flex items-center gap-2 text-primary-800">
                  <span className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                  Commission discount: <strong>-1%</strong>
                </li>
                <li className="flex items-center gap-2 text-primary-800">
                  <span className="w-1.5 h-1.5 bg-primary-600 rounded-full" />
                  Priority support
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            {daysRemaining <= 7 && (
              <div className="flex gap-3">
                <Link
                  href="/seller/pro-subscription"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
                >
                  <Zap className="w-4 h-4" />
                  Upgrade Before Trial Ends
                </Link>
                {daysRemaining <= 3 && (
                  <span className="inline-flex items-center px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-semibold">
                    ⚠️ Expires soon!
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-shrink-0 text-right">
          <div className="text-3xl font-bold text-primary-600 mb-1">{daysRemaining}</div>
          <div className="text-xs text-primary-700 font-medium mb-3">days left</div>
          <div className="w-24 h-2 bg-primary-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${Math.max(0, (daysRemaining / 30) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
