"use client"

import { useEffect, useState } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      setVisible(false)
      setDeferredPrompt(null)
    } catch (error) {
      // Non-fatal: hide prompt
      console.error('Install prompt failed', error)
      setVisible(false)
      setDeferredPrompt(null)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow p-3 flex items-center gap-3">
        <div className="text-sm text-gray-800">Install this app for a faster experience</div>
        <div className="flex items-center gap-2">
          <button onClick={handleInstall} className="px-3 py-1 bg-indigo-600 text-white rounded">Install</button>
          <button onClick={() => setVisible(false)} className="px-2 py-1 text-sm text-gray-600">Dismiss</button>
        </div>
      </div>
    </div>
  )
}
