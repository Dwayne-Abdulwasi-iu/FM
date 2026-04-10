/**
 * Currency Service
 * Multi-currency display and conversion for global users
 */

// Supported currencies with symbols and formatting
export interface CurrencyConfig {
  code: string
  name: string
  symbol: string
  locale: string
  decimals: number
  flag: string
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', decimals: 2, flag: '🇺🇸' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG', decimals: 0, flag: '🇳🇬' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', decimals: 2, flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', decimals: 2, flag: '🇪🇺' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', locale: 'en-GH', decimals: 2, flag: '🇬🇭' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE', decimals: 0, flag: '🇰🇪' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', decimals: 2, flag: '🇿🇦' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA', decimals: 2, flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', decimals: 2, flag: '🇦🇺' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN', decimals: 0, flag: '🇮🇳' },
]

// Exchange rates cache (updated via API)
// NOTE: These are fallback values only - live rates are fetched from API
// Last updated: January 2026 - update periodically as a safety net
let exchangeRatesCache: Record<string, number> = {
  USD: 1,
  NGN: 1372,  // Default fallback updated to match the latest live USD/NGN rate source
  GBP: 0.79,
  EUR: 0.92,
  GHS: 16,
  KES: 155,
  ZAR: 19,
  CAD: 1.38,
  AUD: 1.55,
  INR: 85,
}

let lastFetchTime = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

/**
 * Fetch current exchange rates from API
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now()
  
  // Return cached rates if still valid
  if (now - lastFetchTime < CACHE_DURATION) {
    return exchangeRatesCache
  }

  try {
    // Use a free exchange rate API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/USD`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )
    
    if (response.ok) {
      const data = await response.json()
      exchangeRatesCache = data.rates
      lastFetchTime = now
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    // Continue with cached/default rates
  }

  return exchangeRatesCache
}

/**
 * Convert amount from USD to target currency
 */
export function convertFromUSD(
  amountUSD: number,
  targetCurrency: string,
  rates: Record<string, number> = exchangeRatesCache
): number {
  const rate = rates[targetCurrency] || 1
  return amountUSD * rate
}

/**
 * Convert amount from any currency to USD
 */
export function convertToUSD(
  amount: number,
  sourceCurrency: string,
  rates: Record<string, number> = exchangeRatesCache
): number {
  const rate = rates[sourceCurrency] || 1
  return amount / rate
}

/**
 * Format price in specified currency
 */
export function formatPrice(
  amountUSD: number,
  currencyCode: string = 'USD',
  rates: Record<string, number> = exchangeRatesCache
): string {
  const config = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) 
    || SUPPORTED_CURRENCIES[0]
  
  const convertedAmount = convertFromUSD(amountUSD, currencyCode, rates)
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(convertedAmount)
}

/**
 * Format price with both original and converted display
 */
export function formatPriceWithConversion(
  amountUSD: number,
  displayCurrency: string,
  rates: Record<string, number> = exchangeRatesCache
): { original: string; converted: string; showBoth: boolean } {
  const original = formatPrice(amountUSD, 'USD', rates)
  
  if (displayCurrency === 'USD') {
    return { original, converted: original, showBoth: false }
  }
  
  const converted = formatPrice(amountUSD, displayCurrency, rates)
  return { original, converted, showBoth: true }
}

/**
 * Get currency config by code
 */
export function getCurrencyConfig(code: string): CurrencyConfig | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)
}

/**
 * Detect user's preferred currency based on locale/country
 */
export function detectUserCurrency(locale?: string): string {
  if (!locale) {
    if (typeof navigator !== 'undefined') {
      locale = navigator.language
    } else {
      return 'USD'
    }
  }

  const countryMappings: Record<string, string> = {
    'NG': 'NGN',
    'GB': 'GBP',
    'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
    'GH': 'GHS',
    'KE': 'KES',
    'ZA': 'ZAR',
    'CA': 'CAD',
    'AU': 'AUD',
    'IN': 'INR',
  }

  // Extract country code from locale (e.g., 'en-NG' -> 'NG')
  const parts = locale.split('-')
  const countryCode = parts[parts.length - 1].toUpperCase()
  
  return countryMappings[countryCode] || 'USD'
}

/**
 * Format a price that is already stored in NGN (e.g. boutique products).
 * Does NOT apply USD-to-NGN conversion — the value is already in Naira.
 */
export function formatNGNPrice(amountNGN: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountNGN)
}

/**
 * Format a price stored in NGN for a display currency.
 */
export function formatPriceFromNGN(
  amountNGN: number,
  displayCurrency: string = 'NGN',
  rates: Record<string, number> = exchangeRatesCache
): string {
  if (displayCurrency === 'NGN') {
    return formatNGNPrice(amountNGN)
  }

  const amountUSD = convertToUSD(amountNGN, 'NGN', rates)
  return formatPrice(amountUSD, displayCurrency, rates)
}

/**
 * Get all supported currencies for dropdown
 */
export function getSupportedCurrencies(): CurrencyConfig[] {
  return SUPPORTED_CURRENCIES
}
