'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  Check, 
  Zap, 
  Crown, 
  TrendingUp, 
  MessageCircle, 
  BarChart3, 
  Star,
  Palette,
  Clock,
  Shield
} from 'lucide-react'

interface SubscriptionStatus {
  isProSubscriber: boolean
  tier: string | null
  benefits: {
    commissionDiscount: number
    featuredListings: number
    prioritySupport: boolean
    analyticsAccess: boolean
    customStorefront: boolean
    earlyAccess: boolean
  }
}

const PLANS = {
  monthly: {
    price: 9.99,
    interval: 'month',
    savings: null,
  },
  yearly: {
    price: 99.99,
    interval: 'year',
    savings: '17% off',
  },
}

const FEATURES = [
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: '1% Lower Commission',
    description: 'Pay less on every sale across all tiers',
    highlight: true,
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: '5 Featured Listings/Month',
    description: 'Get your designs prominently displayed',
    highlight: true,
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Advanced Analytics',
    description: 'Detailed insights on views, clicks, and conversions',
    highlight: false,
  },
  {
    icon: <Palette className="h-5 w-5" />,
    title: 'Custom Storefront',
    description: 'Personalize your seller page with custom branding',
    highlight: false,
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'Priority Support',
    description: '24-hour response time from our support team',
    highlight: false,
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: 'Early Access',
    description: 'Be first to try new features and tools',
    highlight: false,
  },
  {
    icon: <Crown className="h-5 w-5" />,
    title: 'Pro Badge',
    description: 'Stand out with a verified Pro seller badge',
    highlight: false,
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Design Protection',
    description: 'Enhanced watermarking and theft detection',
    highlight: false,
  },
]

export default function UpgradePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin?callbackUrl=/seller/upgrade')
      return
    }

    fetchSubscriptionStatus()
  }, [session, status, router])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/seller/subscribe')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error)
    }
  }

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/seller/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })

      const data = await response.json()

      if (data.demoMode) {
        // Demo mode - show message
        toast.error('Pro subscription is not yet available. We\'ll notify you when it launches!')
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to create subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  // Already a Pro subscriber
  if (subscriptionStatus?.isProSubscriber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="h-10 w-10 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              You&apos;re a Pro Seller! 🎉
            </h1>
            <p className="text-gray-600 mb-6">
              Thank you for being a Pro subscriber. Enjoy your exclusive benefits!
            </p>

            <div className="bg-purple-50 rounded-xl p-6 text-left">
              <h2 className="font-semibold text-purple-900 mb-4">Your Benefits</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-purple-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">1% lower commission</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">5 featured listings</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Advanced analytics</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Priority support</span>
                </div>
              </div>
            </div>

            <a
              href="/seller/dashboard"
              className="inline-block mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Upgrade to Pro
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Grow Your Fashion Business
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get lower commissions, featured listings, and powerful tools to boost your sales
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Features */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Everything in Pro
            </h2>
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`flex items-start gap-4 p-4 rounded-xl ${
                  feature.highlight
                    ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  feature.highlight ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
                {feature.highlight && (
                  <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full ml-auto">
                    Popular
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Pricing Card */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-8">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Crown className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Designer Pro</h2>
                </div>
                <p className="text-purple-100">
                  The professional toolkit for serious sellers
                </p>
              </div>

              <div className="p-6">
                {/* Plan Toggle */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6">
                  <button
                    onClick={() => setSelectedPlan('monthly')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      selectedPlan === 'monthly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setSelectedPlan('yearly')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      selectedPlan === 'yearly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Yearly
                    {PLANS.yearly.savings && (
                      <span className="ml-2 text-xs text-green-600 font-bold">
                        {PLANS.yearly.savings}
                      </span>
                    )}
                  </button>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      ${PLANS[selectedPlan].price.toFixed(2)}
                    </span>
                    <span className="text-gray-600">
                      /{PLANS[selectedPlan].interval}
                    </span>
                  </div>
                  {selectedPlan === 'yearly' && (
                    <p className="text-sm text-gray-500 mt-1">
                      That&apos;s just ${(PLANS.yearly.price / 12).toFixed(2)}/month
                    </p>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Start Pro {selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}
                    </>
                  )}
                </button>

                {/* Guarantee */}
                <p className="text-center text-sm text-gray-500 mt-4">
                  30-day money-back guarantee • Cancel anytime
                </p>

                {/* Trust indicators */}
                <div className="border-t border-gray-200 mt-6 pt-6">
                  <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span>Secure checkout</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      <span>No hidden fees</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-sm text-gray-600">
                Yes! You can cancel your subscription at any time. You&apos;ll continue to have Pro benefits until the end of your billing period.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                How does the 1% commission discount work?
              </h3>
              <p className="text-sm text-gray-600">
                The 1% discount applies on top of your tier rate. So if you&apos;re a Gold seller (8.5%), you&apos;d pay only 7.5% with Pro (minimum 6%).
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                What are featured listings?
              </h3>
              <p className="text-sm text-gray-600">
                Featured listings appear at the top of category pages and search results, significantly increasing visibility and sales.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-sm text-gray-600">
                We offer a 30-day money-back guarantee instead. Try Pro risk-free and get a full refund if it&apos;s not right for you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
