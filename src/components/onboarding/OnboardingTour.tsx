'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, CheckCircle, Sparkles, ShoppingBag, Users, Palette, Upload, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

const STORAGE_KEY = 'designdrop_onboarding_complete'
const STORAGE_VERSION_KEY = 'designdrop_onboarding_version'
const CURRENT_VERSION = '1.0.0'

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(STORAGE_KEY)
    const version = localStorage.getItem(STORAGE_VERSION_KEY)
    
    // Show tour if not completed or if there's a new version
    if (!completed || version !== CURRENT_VERSION) {
      // Delay showing tour to let page load
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION)
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

  const handleAction = useCallback((step: TourStep) => {
    if (step.action?.href) {
      router.push(step.action.href)
      handleComplete()
    } else if (step.action?.onClick) {
      step.action.onClick()
    }
  }, [router, handleComplete])

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

  if (!isOpen) return null

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
            className="fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-primary-500 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Resume tour"
          >
            <Sparkles className="w-6 h-6" />
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-lg mx-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-gray-200 dark:bg-gray-700">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Step {currentStep + 1} of {TOUR_STEPS.length}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="Skip tour"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {step.description}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currentStep > 0 && (
                      <button
                        onClick={handlePrev}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}
                    <button
                      onClick={handleSkip}
                      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      Skip Tour
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {step.action && (
                      <button
                        onClick={() => handleAction(step)}
                        className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
                      >
                        {step.action.label}
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-indigo-600 text-white rounded-lg font-medium hover:from-primary-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
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
                <div className="flex items-center justify-center gap-1.5 mt-6">
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
  )
}

// Export a hook to manually trigger the tour
export function useOnboardingTour() {
  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_VERSION_KEY)
    window.location.reload()
  }, [])

  const isTourCompleted = useCallback(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY) === 'true'
  }, [])

  return { resetTour, isTourCompleted }
}
