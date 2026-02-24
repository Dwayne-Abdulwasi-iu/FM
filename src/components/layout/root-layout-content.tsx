'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './navbar'
import { Footer } from './footer'
import { PWARegister } from '@/components/pwa-register'
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt'

export function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Hide navbar and footer for coming-soon page
  const isComingSoon = pathname === '/coming-soon'

  return (
    <div className="min-h-screen flex flex-col">
      {!isComingSoon && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {!isComingSoon && <Footer />}
      <PWARegister />
      {!isComingSoon && <PWAInstallPrompt />}
    </div>
  )
}
