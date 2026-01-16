'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircle, ArrowLeft, RefreshCw, HelpCircle, Loader2 } from 'lucide-react'

function CheckoutFailedContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const reference = searchParams.get('ref')
  const status = searchParams.get('status')

  const getErrorMessage = () => {
    if (error === 'no_reference') {
      return 'No payment reference was provided. Please try again.'
    }
    if (error === 'verification_failed') {
      return 'We couldn\'t verify your payment. If money was deducted, please contact support.'
    }
    if (status === 'failed') {
      return 'Your payment failed. No money was charged. Please try again.'
    }
    if (status === 'abandoned') {
      return 'Payment was cancelled. No money was charged.'
    }
    return 'Something went wrong with your payment. Please try again or contact support.'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
        {/* Error Message */}
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Failed
          </h1>
          <p className="text-gray-600 mb-6">
            {getErrorMessage()}
          </p>
          
          {reference && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-500">Reference Number</p>
              <p className="font-mono text-gray-900">{reference}</p>
              <p className="text-xs text-gray-500 mt-2">
                Keep this reference if you need to contact support
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/boutique/checkout"
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </Link>
            <Link
              href="/boutique/cart"
              className="w-full bg-white text-gray-700 py-3 px-6 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Return to Cart
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-blue-900 mb-2">Need Help?</h2>
              <p className="text-sm text-blue-700 mb-4">
                If you were charged but didn&apos;t receive confirmation, or if you keep experiencing issues:
              </p>
              <ul className="text-sm text-blue-700 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800">1</span>
                  Check your bank statement or Paystack email
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800">2</span>
                  Wait a few minutes and check your orders page
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800">3</span>
                  Contact support with your reference number
                </li>
              </ul>
              <a
                href="mailto:support@example.com"
                className="inline-block mt-4 text-blue-600 font-medium hover:text-blue-700"
              >
                Contact Support →
              </a>
            </div>
          </div>
        </div>

        {/* Common Issues */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="font-medium mb-2">Common reasons for payment failure:</p>
          <ul className="space-y-1">
            <li>Insufficient funds in your account</li>
            <li>Card declined by your bank</li>
            <li>Network connection issues</li>
            <li>Session timeout during payment</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutFailedContent />
    </Suspense>
  )
}
