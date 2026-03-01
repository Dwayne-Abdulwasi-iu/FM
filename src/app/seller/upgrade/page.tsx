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
  Shield,
  X,
  AlertCircle,
  Gift
} from 'lucide-react'

interface SubscriptionStatus {
  isProSubscriber: boolean
  tier: string | null
  effectiveTier?: string | null
  subscription?: any
  proSubscriptionLocked?: boolean
  totalEarnings?: number
  remainingToUnlock?: number
  benefits: {
    commissionDiscount: number
    featuredListings: number
    prioritySupport: boolean
    analyticsAccess: boolean
    customStorefront: boolean
    earlyAccess: boolean
  }
  trial?: {
    isEligible: boolean
    isActive: boolean
    activatedAt?: string
    expiresAt?: string
    remainingDays?: number | null
  }
}

interface TrialActivationState {
  step: 'none' | 'init' | 'verify'
  verificationId?: string
  verificationCode: string
  loading: boolean
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
    savings: '17% off', // $99.99/year = $8.33/month vs $9.99/month = $119.88/year
  },
}

// Define all subscription tiers
interface SubscriptionPlan {
  tier: 'STARTER' | 'PRO' | 'VIP'
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  yearlyDiscount: string
  discount: number // Commission discount (0.01 = 1%, 0.02 = 2%)
  tierBoost: boolean // +1 tier boost
  featuredListings: number
  prioritySupport: boolean
  highlighted?: boolean
}

const SUBSCRIPTION_TIERS: Record<string, SubscriptionPlan> = {
  STARTER: {
    tier: 'STARTER',
    name: 'Starter',
    description: 'Perfect for getting started',
    monthlyPrice: 4.99,
    yearlyPrice: 49.99,
    yearlyDiscount: '17% off',
    discount: 0.01, // 1%
    tierBoost: false, // No tier boost
    featuredListings: 2, // 2 featured listings
    prioritySupport: false,
  },
  PRO: {
    tier: 'PRO',
    name: 'Pro',
    description: 'For serious sellers',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    yearlyDiscount: '17% off',
    discount: 0.01, // 1%
    tierBoost: true, // +1 tier boost
    featuredListings: 6,
    prioritySupport: false,
    highlighted: true,
  },
  VIP: {
    tier: 'VIP',
    name: 'VIP',
    description: 'Premium everything',
    monthlyPrice: 14.99,
    yearlyPrice: 149.99,
    yearlyDiscount: '17% off',
    discount: 0.02, // 2%
    tierBoost: true, // +1 tier boost
    featuredListings: 10,
    prioritySupport: true,
  },
}

const FEATURES = [
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: '+1 Tier Boost',
    description: 'Instantly upgrade your tier level for all the tier benefits',
    highlight: true,
    tiers: ['PRO', 'VIP'],
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: '2 Featured Listings',
    description: 'Premium placements on category pages',
    highlight: false,
    tiers: ['STARTER'],
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: '6 Featured Listings',
    description: 'Premium placements on category pages',
    highlight: true,
    tiers: ['PRO'],
  },
  {
    icon: <Crown className="h-5 w-5" />,
    title: '10 Featured Listings',
    description: 'Maximum premium placements (VIP only)',
    highlight: true,
    tiers: ['VIP'],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: '1% Commission Discount',
    description: 'Save 1% on every sale (Starter & Pro)',
    highlight: true,
    tiers: ['STARTER', 'PRO'],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: '2% Commission Discount',
    description: 'Save 2% on every sale (VIP only)',
    highlight: true,
    tiers: ['VIP'],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Advanced Analytics',
    description: 'Detailed insights on views, clicks, and conversions',
    highlight: false,
    tiers: ['PRO', 'VIP'],
  },
  {
    icon: <Palette className="h-5 w-5" />,
    title: 'Custom Storefront',
    description: 'Personalize your seller page with custom branding',
    highlight: false,
    tiers: ['PRO', 'VIP'],
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'Priority Support',
    description: 'Fast response from our support team',
    highlight: false,
    tiers: ['VIP'],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: 'Early Access',
    description: 'Be first to try new features',
    highlight: false,
    tiers: ['PRO', 'VIP'],
  },
  {
    icon: <Crown className="h-5 w-5" />,
    title: 'Verified Badge',
    description: 'Stand out with a verified seller badge',
    highlight: false,
    tiers: ['PRO', 'VIP'],
  },
]

export default function UpgradePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD')
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [convertedPrices, setConvertedPrices] = useState<{ monthly: number; yearly: number }>({
    monthly: PLANS.monthly.price,
    yearly: PLANS.yearly.price,
  })
  const [trialActivation, setTrialActivation] = useState<TrialActivationState>({
    step: 'none',
    verificationCode: '',
    loading: false,
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin?callbackUrl=/seller/upgrade')
      return
    }

    // Set currency based on user preference or location
    const userCurrency = (session.user as any)?.preferredCurrency || 
                         (session.user as any)?.location === 'NG' ? 'NGN' : 'USD'
    setCurrency(userCurrency as 'USD' | 'NGN')

    fetchSubscriptionStatus()
    fetchExchangeRate()
  }, [session, status, router])

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('/api/exchange-rates')
      if (response.ok) {
        const data = await response.json()
        const rate = data.rate || 1650 // Fallback rate
        setExchangeRate(rate)
        
        // Calculate converted prices
        if (rate) {
          setConvertedPrices({
            monthly: Math.round(PLANS.monthly.price * rate),
            yearly: Math.round(PLANS.yearly.price * rate),
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error)
      // Use fallback rate
      const fallbackRate = 1650
      setExchangeRate(fallbackRate)
      setConvertedPrices({
        monthly: Math.round(PLANS.monthly.price * fallbackRate),
        yearly: Math.round(PLANS.yearly.price * fallbackRate),
      })
    }
  }

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscriptions/pro')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error)
    }
  }

  const handleSubscribe = async (processor: 'stripe' | 'paystack') => {
    setLoading(true)
    try {
      const response = await fetch('/api/subscriptions/pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          billingPeriod: selectedPlan === 'yearly' ? 'YEARLY' : 'MONTHLY',
          currency: currency,
          processor
        }),
      })

      const data = await response.json()

      if (data.demoMode) {
        // Demo mode - show message
        toast.error('Pro subscription is not yet available. We\'ll notify you when it launches!')
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Failed to create subscription:', error)
      toast.error('Failed to start subscription. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTrialActivationInit = async () => {
    setTrialActivation(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch('/api/subscriptions/pro-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'init' }),
      })

      const data = await response.json()

      if (data.verificationId) {
        setTrialActivation(prev => ({
          ...prev,
          step: 'verify',
          verificationId: data.verificationId,
          loading: false,
        }))
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Failed to start verification')
        setTrialActivation(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      console.error('Failed to initialize trial activation:', error)
      toast.error('Failed to initialize trial activation. Please try again.')
      setTrialActivation(prev => ({ ...prev, loading: false }))
    }
  }

  const handleTrialActivationVerify = async () => {
    if (!trialActivation.verificationCode) {
      toast.error('Please enter the verification code')
      return
    }

    setTrialActivation(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch('/api/subscriptions/pro-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'verify',
          verificationCode: trialActivation.verificationCode,
          verificationId: trialActivation.verificationId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('🎉 Your 30-day Pro trial has been activated!')
        setTrialActivation(prev => ({ ...prev, step: 'none', verificationCode: '' }))
        // Refresh subscription status
        setTimeout(() => fetchSubscriptionStatus(), 1000)
      } else {
        toast.error(data.error || 'Failed to verify code')
      }
    } catch (error) {
      console.error('Failed to verify trial activation:', error)
      toast.error('Failed to verify code. Please try again.')
    } finally {
      setTrialActivation(prev => ({ ...prev, loading: false }))
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

            <div className="bg-purple-50 rounded-xl p-6 text-left mb-6">
              <h2 className="font-semibold text-purple-900 mb-4">Your Current Status</h2>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-purple-200">
                  <span className="text-sm font-medium text-gray-900">Subscription Status:</span>
                  <span className="text-sm font-bold text-green-600">🟢 Active</span>
                </div>
                {subscriptionStatus?.subscription?.expiresAt && (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-purple-200">
                    <span className="text-sm font-medium text-gray-900">Expires:</span>
                    <span className="text-sm font-bold text-purple-600">
                      {new Date(subscriptionStatus.subscription.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-6 text-left mb-6">
              <h2 className="font-semibold text-purple-900 mb-4">Your Benefits</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-purple-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">+1 tier boost</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">6 featured listings</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">1% commission discount</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Priority support</span>
                </div>
              </div>
            </div>

            <a
              href="/seller/dashboard"
              className="inline-block w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 text-center transition-colors"
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
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
            <Zap className="h-3 w-3 md:h-4 md:w-4" />
            Upgrade to Pro
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
            Grow Your Fashion Business
          </h1>
          <p className="text-sm md:text-lg text-gray-600 max-w-2xl mx-auto">
            Get lower commissions, featured listings, and powerful tools to boost your sales
          </p>
        </div>

        {/* Show lock message when earnings < $100 */}
        {subscriptionStatus?.proSubscriptionLocked && (
          <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="text-2xl md:text-3xl flex-shrink-0">🔒</div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-1 md:mb-2 text-sm md:text-base">Subscriptions Locked</h3>
                  <p className="text-amber-800 mb-2 md:mb-3 text-xs md:text-sm">
                    Unlock subscriptions when you reach <span className="font-bold">$100 in earnings</span>. This ensures you're making consistent sales before upgrading.
                  </p>
                  <div className="bg-white rounded-lg p-2 md:p-3 border border-amber-200">
                    <p className="text-xs md:text-sm text-gray-700 mb-2">
                      Your earnings: <span className="font-bold text-amber-900">${subscriptionStatus.totalEarnings || 0}</span>
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        // eslint-disable-next-line -- dynamic width calculation
                        style={{ width: `${Math.min(((subscriptionStatus.totalEarnings ?? 0) / 100) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs md:text-sm text-gray-600">
                      <span className="font-bold">${subscriptionStatus.remainingToUnlock}</span> more to unlock
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FREE TRIAL SECTION - Always show but locked when earnings < $100 */}
        {subscriptionStatus?.trial?.isEligible && !subscriptionStatus?.trial?.isActive && (
          <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="text-3xl md:text-4xl flex-shrink-0">🎁</div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 mb-2 text-sm md:text-base">Try Pro Free for 30 Days!</h3>
                  <p className="text-green-800 mb-2 md:mb-4 text-xs md:text-sm">
                    Every new seller gets <span className="font-bold">one month free</span> to experience all Pro benefits:
                  </p>
                  <ul className="text-xs md:text-sm text-green-800 mb-3 md:mb-4 space-y-1">
                    <li>✓ +1 tier boost - Unlock higher seller status instantly</li>
                    <li>✓ 6 featured listings - Premium visibility for your designs</li>
                    <li>✓ 1% commission discount - Keep more of your earnings</li>
                    <li>✓ Full Pro access - All premium features</li>
                  </ul>
                  <p className="text-xs md:text-sm text-green-800 mb-3 md:mb-4 font-medium">
                    After 30 days, choose to subscribe (pay) or revert to your current tier—completely your choice!
                  </p>
                  <button
                    onClick={handleTrialActivationInit}
                    disabled={trialActivation.loading || subscriptionStatus?.proSubscriptionLocked}
                    className="px-4 md:px-6 py-2 md:py-3 bg-green-600 text-white rounded-lg font-medium text-sm md:text-base hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={subscriptionStatus?.proSubscriptionLocked ? "Unlock at $100 earnings" : ""}
                  >
                    {trialActivation.loading ? (
                      <>
                        <span className="animate-spin inline-block mr-2">⏳</span>
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Gift className="inline h-4 w-4 md:h-5 md:w-5 mr-2" />
                        Activate 30-Day Free Trial
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRIAL ACTIVE SECTION */}
        {subscriptionStatus?.trial?.isActive && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">✨</div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 mb-2">Your Pro Trial is Active!</h3>
                  <p className="text-blue-800 mb-4">
                    You're enjoying <span className="font-bold">free Pro benefits</span> for the next{' '}
                    <span className="font-bold text-lg text-blue-600">{subscriptionStatus.trial.remainingDays || '30'} days</span>
                  </p>
                  <p className="text-sm text-blue-700 mb-4">
                    Trial expires: <span className="font-semibold">{new Date(subscriptionStatus.trial.expiresAt!).toLocaleDateString()}</span>
                  </p>
                  <p className="text-sm text-blue-800">
                    When your trial ends, subscribe to continue enjoying Pro benefits. If you don't subscribe, you'll return to your current tier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Currency Toggle */}
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-6 md:mb-8 p-3 md:p-4 bg-white rounded-lg max-w-md mx-auto">
          <span className="text-xs md:text-sm font-medium text-gray-700">Currency:</span>
          <button
            onClick={() => setCurrency('USD')}
            className={`py-1.5 md:py-2 px-4 md:px-6 rounded-lg text-xs md:text-sm font-medium transition-colors ${
              currency === 'USD'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            USD ($)
          </button>
          <button
            onClick={() => setCurrency('NGN')}
            className={`py-1.5 md:py-2 px-4 md:px-6 rounded-lg text-xs md:text-sm font-medium transition-colors ${
              currency === 'NGN'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            NGN (₦)
          </button>
          {currency === 'NGN' && exchangeRate && (
            <span className="text-xs text-gray-600 ml-1 md:ml-2">
              1 USD ≈ ₦{exchangeRate.toLocaleString()}
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Features */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Everything in Pro
            </h2>

            {/* Tier Stacking Explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">How Tier Stacking Works</h3>
                  <p className="text-sm text-blue-700">
                    Your Pro subscription temporarily upgrades you +1 tier level. So if you&apos;re a Gold seller, you instantly get Diamond benefits! When your subscription expires, you return to your natural tier.
                  </p>
                </div>
              </div>
            </div>

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
        </div>

        {/* Pricing Cards - Grid Layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* STARTER MONTHLY */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 md:p-6 text-white">
                <h2 className="text-lg md:text-xl font-bold mb-0.5 md:mb-1">Starter</h2>
                <p className="text-blue-100 text-xs md:text-xs">Monthly Plan</p>
              </div>

              <div className="p-3 md:p-6 flex-1 flex flex-col">
                {/* Price */}
                <div className="mb-4 md:mb-6">
                  <div className="flex items-baseline gap-2 mb-1 md:mb-2">
                    <span className="text-2xl md:text-4xl font-bold text-gray-900">
                      {currency === 'USD' 
                        ? `$${SUBSCRIPTION_TIERS.STARTER.monthlyPrice.toFixed(2)}`
                        : `₦${Math.round(SUBSCRIPTION_TIERS.STARTER.monthlyPrice * (exchangeRate || 1650)).toLocaleString()}`
                      }
                    </span>
                    <span className="text-xs md:text-base text-gray-600">/mo</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-3 w-3 md:h-4 md:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs md:text-sm text-gray-700">1% Commission Discount</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3 w-3 md:h-4 md:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs md:text-sm text-gray-700">2 Featured Listings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-3 w-3 md:h-4 md:w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span className="text-xs md:text-sm text-gray-400">Priority Support</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-3 w-3 md:h-4 md:w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-400">Tier Boost</span>
                  </div>
                </div>

                {/* CTA */}
                {subscriptionStatus?.proSubscriptionLocked ? (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                    title="Unlock at $100 earnings"
                  >
                    🔒 Unlock at $100
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe('stripe')}
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>

            {/* STARTER YEARLY */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <h2 className="text-xl font-bold mb-1">Starter</h2>
                <p className="text-blue-100 text-xs">Yearly Plan (17% Off)</p>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {currency === 'USD' 
                        ? `$${SUBSCRIPTION_TIERS.STARTER.yearlyPrice.toFixed(2)}`
                        : `₦${Math.round(SUBSCRIPTION_TIERS.STARTER.yearlyPrice * (exchangeRate || 1650)).toLocaleString()}`
                      }
                    </span>
                    <span className="text-gray-600">/yr</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium">
                    Save {currency === 'USD' 
                      ? `$${(SUBSCRIPTION_TIERS.STARTER.monthlyPrice * 12 - SUBSCRIPTION_TIERS.STARTER.yearlyPrice).toFixed(2)}`
                      : `₦${Math.round((SUBSCRIPTION_TIERS.STARTER.monthlyPrice * 12 - SUBSCRIPTION_TIERS.STARTER.yearlyPrice) * (exchangeRate || 1650))}`
                    }/year
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">1% Commission Discount</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">2 Featured Listings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-400">Priority Support</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-400">Tier Boost</span>
                  </div>
                </div>

                {/* CTA */}
                {subscriptionStatus?.proSubscriptionLocked ? (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                    title="Unlock at $100 earnings"
                  >
                    🔒 Unlock at $100
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe('stripe')}
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>

            {/* PRO MONTHLY */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full relative border-2 border-purple-600">
              <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                POPULAR
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <h2 className="text-xl font-bold mb-1">Pro</h2>
                <p className="text-purple-100 text-xs">Monthly Plan</p>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {currency === 'USD' 
                        ? `$${SUBSCRIPTION_TIERS.PRO.monthlyPrice.toFixed(2)}`
                        : `₦${Math.round(SUBSCRIPTION_TIERS.PRO.monthlyPrice * (exchangeRate || 1650)).toLocaleString()}`
                      }
                    </span>
                    <span className="text-gray-600">/mo</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">+1 Tier Boost</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">6 Featured Listings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">1% Commission Discount</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-400">Priority Support</span>
                  </div>
                </div>

                {/* CTA */}
                {subscriptionStatus?.proSubscriptionLocked ? (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                    title="Unlock at $100 earnings"
                  >
                    🔒 Unlock at $100
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe('stripe')}
                    disabled={loading}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>

            {/* PRO YEARLY */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full relative border-2 border-purple-600">
              <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                POPULAR
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <h2 className="text-xl font-bold mb-1">Pro</h2>
                <p className="text-purple-100 text-xs">Yearly Plan (17% Off)</p>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {currency === 'USD' 
                        ? `$${SUBSCRIPTION_TIERS.PRO.yearlyPrice.toFixed(2)}`
                        : `₦${Math.round(SUBSCRIPTION_TIERS.PRO.yearlyPrice * (exchangeRate || 1650)).toLocaleString()}`
                      }
                    </span>
                    <span className="text-gray-600">/yr</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium">
                    Save {currency === 'USD' 
                      ? `$${(SUBSCRIPTION_TIERS.PRO.monthlyPrice * 12 - SUBSCRIPTION_TIERS.PRO.yearlyPrice).toFixed(2)}`
                      : `₦${Math.round((SUBSCRIPTION_TIERS.PRO.monthlyPrice * 12 - SUBSCRIPTION_TIERS.PRO.yearlyPrice) * (exchangeRate || 1650))}`
                    }/year
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">+1 Tier Boost</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">6 Featured Listings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">1% Commission Discount</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-400">Priority Support</span>
                  </div>
                </div>

                {/* CTA */}
                {subscriptionStatus?.proSubscriptionLocked ? (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                    title="Unlock at $100 earnings"
                  >
                    🔒 Unlock at $100
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe('stripe')}
                    disabled={loading}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>

            {/* VIP MONTHLY */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white">
                <h2 className="text-xl font-bold mb-1">VIP</h2>
                <p className="text-amber-100 text-xs">Monthly Plan</p>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {currency === 'USD' 
                        ? `$${SUBSCRIPTION_TIERS.VIP.monthlyPrice.toFixed(2)}`
                        : `₦${Math.round(SUBSCRIPTION_TIERS.VIP.monthlyPrice * (exchangeRate || 1650)).toLocaleString()}`
                      }
                    </span>
                    <span className="text-gray-600">/mo</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">+1 Tier Boost</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">10 Featured Listings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">2% Commission Discount</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Priority Support</span>
                  </div>
                </div>

                {/* CTA */}
                {subscriptionStatus?.proSubscriptionLocked ? (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                    title="Unlock at $100 earnings"
                  >
                    🔒 Unlock at $100
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe('stripe')}
                    disabled={loading}
                    className="w-full py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>

            {/* VIP YEARLY */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white">
                <h2 className="text-xl font-bold mb-1">VIP</h2>
                <p className="text-amber-100 text-xs">Yearly Plan (17% Off)</p>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {currency === 'USD' 
                        ? `$${SUBSCRIPTION_TIERS.VIP.yearlyPrice.toFixed(2)}`
                        : `₦${Math.round(SUBSCRIPTION_TIERS.VIP.yearlyPrice * (exchangeRate || 1650)).toLocaleString()}`
                      }
                    </span>
                    <span className="text-gray-600">/yr</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium">
                    Save {currency === 'USD' 
                      ? `$${(SUBSCRIPTION_TIERS.VIP.monthlyPrice * 12 - SUBSCRIPTION_TIERS.VIP.yearlyPrice).toFixed(2)}`
                      : `₦${Math.round((SUBSCRIPTION_TIERS.VIP.monthlyPrice * 12 - SUBSCRIPTION_TIERS.VIP.yearlyPrice) * (exchangeRate || 1650))}`
                    }/year
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">+1 Tier Boost</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">10 Featured Listings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">2% Commission Discount</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Priority Support</span>
                  </div>
                </div>

                {/* CTA */}
                {subscriptionStatus?.proSubscriptionLocked ? (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                    title="Unlock at $100 earnings"
                  >
                    🔒 Unlock at $100
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe('stripe')}
                    disabled={loading}
                    className="w-full py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Subscribe'}
                  </button>
                )}
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
                What does &quot;+1 tier boost&quot; mean?
              </h3>
              <p className="text-sm text-gray-600">
                It instantly upgrades your tier level. If you&apos;re a Gold seller, you get Diamond tier benefits including lower commissions and more featured listings. When your subscription ends, you return to Gold.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                How does the commission discount work?
              </h3>
              <p className="text-sm text-gray-600">
                You get 1% off your tier rate. A Gold seller (8.5%) pays 7.5% with Pro. If you also rank up tiers naturally, you keep the 1% discount on your new tier rate (minimum 6%).
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-sm text-gray-600">
                Yes! Cancel whenever you want. You&apos;ll keep Pro benefits until the end of your billing period, then revert to your natural tier.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                What if I rank up to a higher tier?
              </h3>
              <p className="text-sm text-gray-600">
                Great! You keep both benefits. Your effective tier becomes your new tier + 1. When the subscription expires, you drop back to your new tier level.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                Which payment methods do you accept?
              </h3>
              <p className="text-sm text-gray-600">
                We accept both Stripe (USD, international cards) and Paystack (NGN, local Nigerian payments). Choose your preferred currency on checkout.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-sm text-gray-600">
                Yes! Every new seller gets a 30-day free trial. Click &quot;Activate 30-Day Free Trial&quot; to start. After 30 days, you can subscribe to continue or return to your current tier.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Activation Modal - Step 1 & 2 */}
      {trialActivation.step !== 'none' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Activate Pro Trial</h2>
                <p className="text-green-100 text-sm mt-1">
                  {trialActivation.step === 'init' 
                    ? '30 days of free Pro access'
                    : 'Verify your identity'}
                </p>
              </div>
              <button
                onClick={() => setTrialActivation(prev => ({ ...prev, step: 'none', verificationCode: '' }))}
                className="text-white hover:bg-green-700 p-1 rounded"
                aria-label="Close modal"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* STEP 1: Information */}
              {trialActivation.step === 'init' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-2">How this works:</p>
                      <ul className="space-y-1 text-xs">
                        <li>✓ You get 30 days of free Pro access</li>
                        <li>✓ No payment required to activate</li>
                        <li>✓ Two-step verification for security</li>
                        <li>✓ After 30 days, choose to subscribe or revert</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">You'll get:</h3>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• +1 tier boost (temporary)</li>
                      <li>• 6 featured listings</li>
                      <li>• 1% commission discount</li>
                      <li>• Priority support</li>
                      <li>• All Pro features</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleTrialActivationInit}
                    disabled={trialActivation.loading}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {trialActivation.loading ? 'Sending verification code...' : 'Continue to Verification'}
                  </button>

                  <button
                    onClick={() => setTrialActivation(prev => ({ ...prev, step: 'none' }))}
                    className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* STEP 2: Verification Code */}
              {trialActivation.step === 'verify' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      A verification code has been sent to your phone or email. Enter it below to confirm.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={trialActivation.verificationCode}
                      onChange={(e) => setTrialActivation(prev => ({
                        ...prev,
                        verificationCode: e.target.value.replace(/\D/g, '').slice(0, 6)
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono bg-white text-black placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter the 6-digit code sent to your account
                    </p>
                  </div>

                  <button
                    onClick={handleTrialActivationVerify}
                    disabled={trialActivation.loading || trialActivation.verificationCode.length !== 6}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {trialActivation.loading ? 'Activating trial...' : 'Activate Trial'}
                  </button>

                  <button
                    onClick={() => setTrialActivation(prev => ({ ...prev, step: 'none', verificationCode: '' }))}
                    className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    Didn't get the code? Check your spam folder or contact support.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

