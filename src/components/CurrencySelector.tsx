'use client'

import { useCurrency } from './CurrencyProvider'

interface CurrencySelectorProps {
  className?: string
  showFlag?: boolean
  compact?: boolean
}

export function CurrencySelector({ 
  className = '', 
  showFlag = true,
  compact = false 
}: CurrencySelectorProps) {
  const { currency, setCurrency, currencies, isLoading } = useCurrency()

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-20 ${className}`} />
    )
  }

  const currentCurrency = currencies.find(c => c.code === currency)

  if (compact) {
    return (
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className={`bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
        aria-label="Select currency"
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {showFlag ? `${c.flag} ` : ''}{c.code}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        aria-label="Select currency"
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {showFlag ? `${c.flag} ` : ''}{c.code} - {c.name}
          </option>
        ))}
      </select>
      
      {/* Dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {/* Current currency indicator */}
      {currentCurrency && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
          {currentCurrency.flag}
        </span>
      )}
    </div>
  )
}

/**
 * Price display component with automatic currency conversion
 */
interface PriceDisplayProps {
  amountUSD: number
  showOriginal?: boolean
  className?: string
  originalClassName?: string
}

export function PriceDisplay({ 
  amountUSD, 
  showOriginal = false,
  className = '',
  originalClassName = 'text-gray-500 text-sm'
}: PriceDisplayProps) {
  const { formatPrice, formatPriceWithOriginal, currency } = useCurrency()

  if (!showOriginal || currency === 'USD') {
    return <span className={className}>{formatPrice(amountUSD)}</span>
  }

  const { original, converted } = formatPriceWithOriginal(amountUSD)

  return (
    <span className={className}>
      {converted}
      <span className={`ml-1 ${originalClassName}`}>
        ({original})
      </span>
    </span>
  )
}
