'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  const [currency, setCurrencyState] = useState('USD')
  const [rates, setRates] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load saved currency preference
    const savedCurrency = localStorage.getItem('preferredCurrency')
    if (savedCurrency) {
      setCurrencyState(savedCurrency)
    } else {
      // Detect based on locale
      const detected = detectUserCurrency()
      setCurrencyState(detected)
    }

    // Fetch exchange rates
    fetchExchangeRates()
      .then(setRates)
      .finally(() => setIsLoading(false))
  }, [])

  const setCurrency = (code: string) => {
    setCurrencyState(code)
    localStorage.setItem('preferredCurrency', code)
  }

  const formatPrice = (amountUSD: number) => {
    return formatPriceUtil(amountUSD, currency, rates)
  }

  const formatPriceWithOriginal = (amountUSD: number) => {
    return formatPriceWithConversion(amountUSD, currency, rates)
  }

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
