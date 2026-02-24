'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Zap, Bell, WifiOff } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    setIsIOS(isIOSDevice)

    // Ensure the banner is not shown for the coming-soon page
    if (window.location.pathname === '/coming-soon') {
      setShowBanner(false)
      return
    }

    // Remove event listener for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowPrompt(true)
      }
      return
    }

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowBanner(false)
      setIsInstalled(true)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (isInstalled || (!deferredPrompt && !isIOS)) return null

  return (
    <>
      {/* Bottom Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg animate-slide-up">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Install Fashion Marketplace</p>
                <p className="text-sm text-white/80 hidden sm:block">
                  Get the full app experience - faster, offline access & notifications
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showPrompt && isIOS && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl animate-slide-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Install App</h2>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close install instructions"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Install Fashion Marketplace on your iPhone for the best experience:
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-indigo-600">1</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Tap the <strong>Share</strong> button in Safari
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-indigo-600">2</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-indigo-600">3</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Tap <strong>&quot;Add&quot;</strong> to install
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPrompt(false)}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Benefits section for install page */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

// Exportable benefits component for dedicated install page
export function PWABenefits() {
  const benefits = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Lightning Fast',
      description: 'Instant loading with app-like speed'
    },
    {
      icon: <WifiOff className="h-6 w-6" />,
      title: 'Works Offline',
      description: 'Browse designs even without internet'
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: 'Push Notifications',
      description: 'Get instant updates on orders & messages'
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: 'Home Screen Access',
      description: 'Launch instantly from your home screen'
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {benefits.map((benefit) => (
        <div key={benefit.title} className="p-4 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-3">
            {benefit.icon}
          </div>
          <h3 className="font-medium text-gray-900 mb-1">{benefit.title}</h3>
          <p className="text-sm text-gray-600">{benefit.description}</p>
        </div>
      ))}
    </div>
  )
}
