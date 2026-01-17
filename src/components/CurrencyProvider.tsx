'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { usePreferencesSync, savePreference } from '@/hooks/usePreferencesSync'
import { 
  detectUserCurrency, 
  fetchExchangeRates, 
  formatPrice as formatPriceUtil,
  formatPriceWithConversion,
  getSupportedCurrencies,
  CurrencyConfig
} from '@/lib/currency'

interface CurrencyContextType {
  currency: string
  setCurrency: (code: string) => void
  rates: Record<string, number>
  formatPrice: (amountUSD: number) => string
  formatPriceWithOriginal: (amountUSD: number) => { original: string; converted: string; showBoth: boolean }
  currencies: CurrencyConfig[]
  isLoading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [currency, setCurrencyState] = useState('USD')
  const [rates, setRates] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Sync from database when user logs in (uses shared fetch with LanguageContext)
  const handlePreferencesSync = useCallback((data: { currency?: string | null }) => {
    if (data.currency) {
      setCurrencyState(data.currency)
      localStorage.setItem('preferredCurrency', data.currency)
    }
  }, [])
  
  usePreferencesSync(handlePreferencesSync)

  // Initial load: localStorage first for instant display
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency')
    if (savedCurrency) {
      setCurrencyState(savedCurrency)
    } else {
      const detected = detectUserCurrency()
      setCurrencyState(detected)
    }

    // Fetch exchange rates
    fetchExchangeRates()
      .then(setRates)
      .finally(() => setIsLoading(false))
  }, [])

  // Save to both localStorage and database
  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code)
    localStorage.setItem('preferredCurrency', code)
    
    // Sync to database in background if logged in
    if (status === 'authenticated') {
      savePreference('currency', code)
    }
  }, [status])

  const formatPrice = useCallback((amountUSD: number) => {
    return formatPriceUtil(amountUSD, currency, rates)
  }, [currency, rates])

  const formatPriceWithOriginal = useCallback((amountUSD: number) => {
    return formatPriceWithConversion(amountUSD, currency, rates)
  }, [currency, rates])

  return (
    <CurrencyContext.Provider 
      value={{ 
        currency, 
        setCurrency, 
        rates, 
        formatPrice, 
        formatPriceWithOriginal,
        currencies: getSupportedCurrencies(),
        isLoading 
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
