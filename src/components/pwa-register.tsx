'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share2 } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Service Worker registered:', registration.scope)
        },
        (error) => {
          console.error('Service Worker registration failed:', error)
        }
      )
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      
      // Show banner after a delay
      setTimeout(() => {
        setShowInstallBanner(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show iOS prompt after delay if on iOS and not installed
    if (isIOSDevice && !isStandalone) {
      const hasSeenPrompt = localStorage.getItem('ios-install-prompt-seen')
      if (!hasSeenPrompt) {
        setTimeout(() => {
          setShowIOSPrompt(true)
        }, 5000)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    }

    setInstallPrompt(null)
    setShowInstallBanner(false)
  }

  const dismissBanner = () => {
    setShowInstallBanner(false)
    setShowIOSPrompt(false)
    localStorage.setItem('ios-install-prompt-seen', 'true')
  }

  // Android/Desktop install banner
  if (showInstallBanner && installPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50 animate-slide-up">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Install Fashion Marketplace</h3>
            <p className="text-sm text-gray-600">
              Add to your home screen for a better experience
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            Install
          </button>
          <button
            onClick={dismissBanner}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss install prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // iOS install instructions
  if (showIOSPrompt && isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50 animate-slide-up">
        <div className="max-w-xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Share2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Install Fashion Marketplace</h3>
              <p className="text-sm text-gray-600 mt-1">
                Tap the <Share2 className="w-4 h-4 inline" /> share button, then select 
                <strong> "Add to Home Screen"</strong>
              </p>
            </div>
            <button
              onClick={dismissBanner}
              className="p-2 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss iOS install instructions"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
