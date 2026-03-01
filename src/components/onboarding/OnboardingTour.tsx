'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, CheckCircle, Sparkles, ShoppingBag, Users, Palette, Upload, DollarSign, Info, Search, Heart, ShoppingCart, Star } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  highlight?: string // CSS selector to highlight
}

// Main onboarding tour steps
const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to DesignDrop! 🎨',
    description: 'The global marketplace for fashion illustrations. Discover unique designs from talented creators worldwide or start selling your own artwork.',
    icon: <Sparkles className="w-8 h-8 text-primary-500" />,
  },
  {
    id: 'browse',
    title: 'Browse Designs',
    description: 'Explore thousands of fashion illustrations across categories like streetwear, haute couture, accessories, and more. Filter by style, price, or designer.',
    icon: <ShoppingBag className="w-8 h-8 text-indigo-500" />,
    action: {
      label: 'Explore Designs',
      href: '/designs',
    },
    highlight: '[data-tour="designs-link"]',
  },
  {
    id: 'designers',
    title: 'Meet Our Designers',
    description: 'Connect with fashion illustrators from around the world. Follow your favorites, request commissions, and build your collection.',
    icon: <Users className="w-8 h-8 text-pink-500" />,
    action: {
      label: 'View Designers',
      href: '/designers',
    },
    highlight: '[data-tour="designers-link"]',
  },
  {
    id: 'boutique',
    title: 'Shop the Boutique',
    description: 'Discover physical products like prints, apparel, and accessories made from original designs. Shop with confidence using our buyer protection.',
    icon: <Palette className="w-8 h-8 text-amber-500" />,
    action: {
      label: 'Visit Boutique',
      href: '/boutique',
    },
    highlight: '[data-tour="boutique-link"]',
  },
  {
    id: 'sell',
    title: 'Start Selling',
    description: 'Turn your fashion illustrations into income! Upload your designs, set your prices, and reach buyers globally. Keep up to 90% of your sales.',
    icon: <Upload className="w-8 h-8 text-green-500" />,
    action: {
      label: 'Become a Seller',
      href: '/seller/onboarding',
    },
  },
  {
    id: 'commission',
    title: 'Commission Tiers',
    description: 'Our fair commission structure rewards success. Start at just 0.1% commission and work your way down as you sell more. Top sellers keep 93%!',
    icon: <DollarSign className="w-8 h-8 text-emerald-500" />,
    action: {
      label: 'View Tiers',
      href: '/commissions',
    },
  },
]

// Page-specific tips shown after main tour or when visiting pages
interface PageTip {
  id: string
  path: string | RegExp
  tips: {
    title: string
    description: string
    icon: React.ReactNode
  }[]
}

const PAGE_TIPS: PageTip[] = [
  {
    id: 'designs-page',
    path: '/designs',
    tips: [
      {
        title: 'Search & Filter',
        description: 'Use the search bar to find specific styles. Filter by category, price range, or sort by newest, popular, or price.',
        icon: <Search className="w-6 h-6 text-indigo-500" />,
      },
      {
        title: 'Save to Wishlist',
        description: 'Click the heart icon on any design to save it to your wishlist for later. You\'ll be notified if the price drops!',
        icon: <Heart className="w-6 h-6 text-pink-500" />,
      },
      {
        title: 'Quick Add to Cart',
        description: 'Hover over a design and click the cart icon to quickly add it. Or click the design to see more details first.',
        icon: <ShoppingCart className="w-6 h-6 text-green-500" />,
      },
    ],
  },
  {
    id: 'designers-page',
    path: '/designers',
    tips: [
      {
        title: 'Follow Designers',
        description: 'Follow your favorite designers to get notified when they upload new designs or offer discounts.',
        icon: <Users className="w-6 h-6 text-pink-500" />,
      },
      {
        title: 'Request Commissions',
        description: 'Many designers accept custom work! Look for the "Accepts Commissions" badge to request a personalized design.',
        icon: <Palette className="w-6 h-6 text-purple-500" />,
      },
    ],
  },
  {
    id: 'boutique-page',
    path: '/boutique',
    tips: [
      {
        title: 'Physical Products',
        description: 'The boutique features real, tangible products created from designer artwork. Each item is quality-verified before shipping.',
        icon: <ShoppingBag className="w-6 h-6 text-amber-500" />,
      },
      {
        title: 'Buyer Protection',
        description: 'All boutique purchases are covered by our buyer protection policy. Get a refund if items don\'t match the description.',
        icon: <CheckCircle className="w-6 h-6 text-green-500" />,
      },
    ],
  },
  {
    id: 'design-detail',
    path: /^\/designs\/[^/]+$/,
    tips: [
      {
        title: 'Preview Files',
        description: 'View all included files in the gallery. Digital designs include high-resolution source files upon purchase.',
        icon: <Search className="w-6 h-6 text-indigo-500" />,
      },
      {
        title: 'Leave Reviews',
        description: 'After purchasing, come back to leave a review. Help other buyers and support your favorite designers!',
        icon: <Star className="w-6 h-6 text-yellow-500" />,
      },
    ],
  },
]

const STORAGEKEY = 'designdrop_onboarding_complete'
const STORAGE_VERSIONKEY = 'designdrop_onboarding_version'
const STORAGE_STEPKEY = 'designdrop_onboarding_step'
const STORAGE_PAGE_TIPSKEY = 'designdrop_page_tips_seen'
const CURRENTVERSION = '1.1.0' // Bump version to show updated tour

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showPageTips, setShowPageTips] = useState(false)
  const [currentPageTip, setCurrentPageTip] = useState<PageTip | null>(null)
  const [currentPageTipIndex, setCurrentPageTipIndex] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

  // Initialize tour from localStorage
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY)
    const version = localStorage.getItem(STORAGE_VERSION_KEY)
    const savedStep = localStorage.getItem(STORAGE_STEP_KEY)
    
    // Show tour if not completed or if there's a new version
    if (!completed || version !== CURRENT_VERSION) {
      // Restore saved step if exists
      if (savedStep) {
        setCurrentStep(parseInt(savedStep, 10))
      }
      // Delay showing tour to let page load
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  // Check for page-specific tips when pathname changes
  useEffect(() => {
    if (!pathname) return
    
    // Only show page tips if main tour is complete
    const tourComplete = localStorage.getItem(STORAGE_KEY) === 'true'
    if (!tourComplete) return

    // Check if we have tips for this page
    const seenTips = JSON.parse(localStorage.getItem(STORAGE_PAGE_TIPS_KEY) || '[]')
    
    const matchingTip = PAGE_TIPS.find(tip => {
      if (typeof tip.path === 'string') {
        return pathname === tip.path
      }
      return tip.path.test(pathname)
    })
    
    if (matchingTip && !seenTips.includes(matchingTip.id)) {
      const timer = setTimeout(() => {
        setCurrentPageTip(matchingTip)
        setCurrentPageTipIndex(0)
        setShowPageTips(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  // Save current step to localStorage for persistence across navigations
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(STORAGE_STEPKEY, currentStep.toString())
    }
  }, [currentStep, isOpen])

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGEKEY, 'true')
    localStorage.setItem(STORAGE_VERSIONKEY, CURRENT_VERSION)
    localStorage.removeItem(STORAGE_STEP_KEY)
    setIsOpen(false)
  }, [])

  const handleSkip = useCallback(() => {
    handleComplete()
  }, [handleComplete])

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }, [currentStep, handleComplete])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // Navigate to page without closing tour
  const handleAction = useCallback((step: TourStep) => {
    if (step.action?.href) {
      // Navigate to the page but keep tour open and advance to next step
      router.push(step.action.href)
      // Move to next step after navigation
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1)
      }
    } else if (step.action?.onClick) {
      step.action.onClick()
    }
  }, [router, currentStep])

  // Page tips handlers
  const handleDismissPageTips = useCallback(() => {
    if (currentPageTip) {
      const seenTips = JSON.parse(localStorage.getItem(STORAGE_PAGE_TIPS_KEY) || '[]')
      seenTips.push(currentPageTip.id)
      localStorage.setItem(STORAGE_PAGE_TIPSKEY, JSON.stringify(seenTips))
    }
    setShowPageTips(false)
    setCurrentPageTip(null)
  }, [currentPageTip])

  const handleNextPageTip = useCallback(() => {
    if (currentPageTip && currentPageTipIndex < currentPageTip.tips.length - 1) {
      setCurrentPageTipIndex(prev => prev + 1)
    } else {
      handleDismissPageTips()
    }
  }, [currentPageTip, currentPageTipIndex, handleDismissPageTips])

  const handlePrevPageTip = useCallback(() => {
    if (currentPageTipIndex > 0) {
      setCurrentPageTipIndex(prev => prev - 1)
    }
  }, [currentPageTipIndex])

  // Highlight effect for tour steps
  useEffect(() => {
    const step = TOUR_STEPS[currentStep]
    if (step.highlight && isOpen && !isMinimized) {
      const element = document.querySelector(step.highlight)
      if (element) {
        element.classList.add('tour-highlight')
        return () => element.classList.remove('tour-highlight')
      }
    }
  }, [currentStep, isOpen, isMinimized])

  const step = TOUR_STEPS[currentStep]
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100

  return (
    <>
      {/* CSS for highlight effect */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 1000;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3);
          border-radius: 8px;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.3), 0 0 30px rgba(99, 102, 241, 0.2);
          }
        }
      `}</style>

      {/* Main Tour */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
                onClick={() => setIsMinimized(true)}
              />
            )}
          </AnimatePresence>

          {/* Tour Card */}
          <AnimatePresence mode="wait">
            {isMinimized ? (
              <motion.button
                key="minimized"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] bg-gradient-to-r from-primary-500 to-indigo-600 text-white p-3 sm:p-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                aria-label="Resume tour"
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {TOUR_STEPS.length - currentStep}
                </span>
              </motion.button>
            ) : (
              <motion.div
                key={`step-${currentStep}`}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-4 left-2 right-2 sm:bottom-6 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-[9999] w-auto sm:w-full sm:max-w-lg"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden mx-auto">
                  {/* Progress bar */}
                  <div className="h-1 bg-gray-200 dark:bg-gray-700">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary-500 to-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className="p-4 sm:p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                          {step.icon}
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                            {step.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Step {currentStep + 1} of {TOUR_STEPS.length}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleSkip}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                        aria-label="Skip tour"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="flex items-center gap-2 order-2 sm:order-1">
                        {currentStep > 0 && (
                          <button
                            onClick={handlePrev}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                          </button>
                        )}
                        <button
                          onClick={handleSkip}
                          className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                          Skip Tour
                        </button>
                      </div>

                      <div className="flex items-center gap-2 order-1 sm:order-2">
                        {step.action && (
                          <button
                            onClick={() => handleAction(step)}
                            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors border border-primary-200 dark:border-primary-800 rounded-lg"
                          >
                            {step.action.label} →
                          </button>
                        )}
                        <button
                          onClick={handleNext}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary-500 to-indigo-600 text-white rounded-lg font-medium hover:from-primary-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                        >
                          {currentStep === TOUR_STEPS.length - 1 ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Get Started
                            </>
                          ) : (
                            <>
                              Next
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Step indicators */}
                    <div className="flex items-center justify-center gap-1.5 mt-4 sm:mt-6">
                      {TOUR_STEPS.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentStep(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentStep
                              ? 'bg-primary-500 w-6'
                              : index < currentStep
                              ? 'bg-primary-300'
                              : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                          aria-label={`Go to step ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Page-specific Tips */}
      <AnimatePresence>
        {showPageTips && currentPageTip && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[9998]"
              onClick={handleDismissPageTips}
            />
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-4 left-2 right-2 sm:bottom-6 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-[9999] w-auto sm:w-full sm:max-w-md"
            >
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-xl border border-indigo-100 dark:border-gray-700 p-4 sm:p-5 mx-auto">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                    {currentPageTip.tips[currentPageTipIndex].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          Tip {currentPageTipIndex + 1} of {currentPageTip.tips.length}
                        </span>
                      </div>
                      <button
                        onClick={handleDismissPageTips}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        aria-label="Dismiss tips"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mb-1">
                      {currentPageTip.tips[currentPageTipIndex].title}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      {currentPageTip.tips[currentPageTipIndex].description}
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-indigo-100 dark:border-gray-700">
                  <button
                    onClick={handlePrevPageTip}
                    disabled={currentPageTipIndex === 0}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <div className="flex gap-1">
                    {currentPageTip.tips.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          idx === currentPageTipIndex
                            ? 'bg-indigo-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleNextPageTip}
                    className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {currentPageTipIndex === currentPageTip.tips.length - 1 ? 'Got it!' : 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Export a hook to manually trigger the tour
export function useOnboardingTour() {
  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_VERSION_KEY)
    localStorage.removeItem(STORAGE_STEP_KEY)
    localStorage.removeItem(STORAGE_PAGE_TIPS_KEY)
    window.location.reload()
  }, [])

  const isTourCompleted = useCallback(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY) === 'true'
  }, [])

  const resetPageTips = useCallback(() => {
    localStorage.removeItem(STORAGE_PAGE_TIPS_KEY)
    window.location.reload()
  }, [])

  return { resetTour, isTourCompleted, resetPageTips }
}

