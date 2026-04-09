/**
 * Multi-Currency Pricing Service
 * Allows sellers to set prices in local currency with auto-conversion
 */

// Supported currencies with their configurations
export const SUPPORTED_CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2 },
  NGN: { symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG', decimals: 0 },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', locale: 'en-GH', decimals: 2 },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE', decimals: 0 },
  ZAR: { symbol: 'R', name: 'South African Rand', locale: 'en-ZA', decimals: 2 },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'sw-TZ', decimals: 0 },
  UGX: { symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG', decimals: 0 },
  RWF: { symbol: 'FRw', name: 'Rwandan Franc', locale: 'rw-RW', decimals: 0 },
  XOF: { symbol: 'CFA', name: 'West African CFA Franc', locale: 'fr-SN', decimals: 0 },
  XAF: { symbol: 'FCFA', name: 'Central African CFA Franc', locale: 'fr-CM', decimals: 0 },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', decimals: 2 },
  BRL: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', decimals: 2 },
  MXN: { symbol: '$', name: 'Mexican Peso', locale: 'es-MX', decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

// Cache for exchange rates
let exchangeRatesCache: {
  rates: Record<string, number>;
  baseCurrency: string;
  lastUpdated: Date;
} | null = null;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch current exchange rates from API
 */
export async function fetchExchangeRates(baseCurrency: CurrencyCode = 'USD'): Promise<Record<string, number>> {
  // Check cache first
  if (
    exchangeRatesCache &&
    exchangeRatesCache.baseCurrency === baseCurrency &&
    Date.now() - exchangeRatesCache.lastUpdated.getTime() < CACHE_TTL_MS
  ) {
    return exchangeRatesCache.rates;
  }

  try {
    // Try multiple exchange rate APIs
    let rates = await tryExchangeRateApi(baseCurrency);
    
    if (!rates) {
      rates = await tryOpenExchangeRates(baseCurrency);
    }
    
    if (!rates) {
      // Fallback to hardcoded rates if APIs fail
      rates = getFallbackRates(baseCurrency);
    }

    // Update cache
    exchangeRatesCache = {
      rates,
      baseCurrency,
      lastUpdated: new Date()
    };

    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return getFallbackRates(baseCurrency);
  }
}

/**
 * Try ExchangeRate-API (free tier)
 */
async function tryExchangeRateApi(baseCurrency: string): Promise<Record<string, number> | null> {
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.conversion_rates || null;
  } catch {
    return null;
  }
}

/**
 * Try Open Exchange Rates API
 */
async function tryOpenExchangeRates(baseCurrency: string): Promise<Record<string, number> | null> {
  const apiKey = process.env.OPENEXCHANGERATES_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${baseCurrency}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.rates || null;
  } catch {
    return null;
  }
}

/**
 * Fallback exchange rates (updated periodically)
 * These should be updated regularly to reflect approximate real rates
 * Last updated: January 2026 - aligned with paystack.ts fallback
 */
function getFallbackRates(baseCurrency: string): Record<string, number> {
  // Rates relative to USD as of January 2026 (approximate)
  const usdRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    NGN: 1372,
    GHS: 16,
    KES: 155,
    ZAR: 19,
    TZS: 2700,
    UGX: 3800,
    RWF: 1400,
    XOF: 610,
    XAF: 610,
    INR: 85,
    BRL: 5.0,
    MXN: 17.5
  };

  if (baseCurrency === 'USD') {
    return usdRates;
  }

  // Convert rates to requested base currency
  const baseRate = usdRates[baseCurrency] || 1;
  const convertedRates: Record<string, number> = {};
  
  for (const [currency, rate] of Object.entries(usdRates)) {
    convertedRates[currency] = rate / baseRate;
  }

  return convertedRates;
}

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await fetchExchangeRates(fromCurrency);
  const rate = rates[toCurrency];

  if (!rate) {
    throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
  }

  return amount * rate;
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode,
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
  }
): string {
  const { showSymbol = true, showCode = false, compact = false } = options || {};
  const config = SUPPORTED_CURRENCIES[currencyCode];

  if (!config) {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }

  const formatter = new Intl.NumberFormat(config.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currencyCode,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
    notation: compact ? 'compact' : 'standard'
  });

  let formatted = formatter.format(amount);

  if (showCode && !showSymbol) {
    formatted = `${formatted} ${currencyCode}`;
  }

  return formatted;
}

/**
 * Design price with multi-currency support
 */
export interface MultiCurrencyPrice {
  baseCurrency: CurrencyCode;
  baseAmount: number;
  displayPrices: Record<CurrencyCode, number>;
  lastUpdated: Date;
}

/**
 * Create multi-currency price from seller's local currency
 */
export async function createMultiCurrencyPrice(
  amount: number,
  sellerCurrency: CurrencyCode
): Promise<MultiCurrencyPrice> {
  // Convert seller's price to USD as base
  const usdAmount = sellerCurrency === 'USD' 
    ? amount 
    : await convertCurrency(amount, sellerCurrency, 'USD');

  // Generate display prices for all supported currencies
  const rates = await fetchExchangeRates('USD');
  const displayPrices: Partial<Record<CurrencyCode, number>> = {};

  for (const currencyCode of Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]) {
    const rate = rates[currencyCode] || 1;
    displayPrices[currencyCode] = roundToDisplayPrecision(usdAmount * rate, currencyCode);
  }

  return {
    baseCurrency: 'USD',
    baseAmount: usdAmount,
    displayPrices: displayPrices as Record<CurrencyCode, number>,
    lastUpdated: new Date()
  };
}

/**
 * Round price to appropriate precision for currency
 */
function roundToDisplayPrecision(amount: number, currencyCode: CurrencyCode): number {
  const config = SUPPORTED_CURRENCIES[currencyCode];
  if (!config) return Math.round(amount * 100) / 100;

  if (config.decimals === 0) {
    // Round to nearest 10 or 100 for currencies with no decimals
    if (amount > 1000) {
      return Math.round(amount / 100) * 100;
    } else if (amount > 100) {
      return Math.round(amount / 10) * 10;
    }
    return Math.round(amount);
  }

  return Math.round(amount * Math.pow(10, config.decimals)) / Math.pow(10, config.decimals);
}

/**
 * Get user's preferred currency based on location/settings
 */
export function detectUserCurrency(options: {
  countryCode?: string;
  browserLocale?: string;
  savedPreference?: CurrencyCode;
}): CurrencyCode {
  const { countryCode, browserLocale, savedPreference } = options;

  // User's saved preference takes priority
  if (savedPreference && SUPPORTED_CURRENCIES[savedPreference]) {
    return savedPreference;
  }

  // Map country codes to currencies
  const countryToCurrency: Record<string, CurrencyCode> = {
    US: 'USD',
    GB: 'GBP',
    DE: 'EUR',
    FR: 'EUR',
    IT: 'EUR',
    ES: 'EUR',
    NL: 'EUR',
    NG: 'NGN',
    GH: 'GHS',
    KE: 'KES',
    ZA: 'ZAR',
    TZ: 'TZS',
    UG: 'UGX',
    RW: 'RWF',
    SN: 'XOF',
    CI: 'XOF',
    CM: 'XAF',
    IN: 'INR',
    BR: 'BRL',
    MX: 'MXN'
  };

  if (countryCode && countryToCurrency[countryCode]) {
    return countryToCurrency[countryCode];
  }

  // Try to detect from browser locale
  if (browserLocale) {
    const countryFromLocale = browserLocale.split('-')[1]?.toUpperCase();
    if (countryFromLocale && countryToCurrency[countryFromLocale]) {
      return countryToCurrency[countryFromLocale];
    }
  }

  // Default to USD
  return 'USD';
}

/**
 * Calculate price with local currency suggestion for sellers
 */
export async function suggestLocalPrice(
  usdPrice: number,
  sellerCurrency: CurrencyCode
): Promise<{
  suggested: number;
  formatted: string;
  roundedNice: number;
}> {
  const localPrice = await convertCurrency(usdPrice, 'USD', sellerCurrency);
  const roundedNice = getNiceRoundedPrice(localPrice, sellerCurrency);

  return {
    suggested: localPrice,
    formatted: formatCurrency(roundedNice, sellerCurrency),
    roundedNice
  };
}

/**
 * Round to a "nice" price for the currency
 */
function getNiceRoundedPrice(amount: number, currencyCode: CurrencyCode): number {
  const config = SUPPORTED_CURRENCIES[currencyCode];
  
  // For currencies with no decimals, round to nice numbers
  if (config?.decimals === 0) {
    if (amount > 10000) {
      return Math.ceil(amount / 1000) * 1000;
    } else if (amount > 1000) {
      return Math.ceil(amount / 500) * 500;
    } else if (amount > 100) {
      return Math.ceil(amount / 50) * 50;
    } else {
      return Math.ceil(amount / 10) * 10;
    }
  }

  // For currencies with decimals, round to .99 pricing
  if (amount > 100) {
    return Math.ceil(amount) - 0.01;
  } else if (amount > 10) {
    return Math.ceil(amount * 2) / 2 - 0.01; // Round to nearest 0.50
  }
  
  return Math.ceil(amount * 100) / 100;
}

/**
 * Get currency info by country code
 */
export function getCurrencyByCountry(countryCode: string): CurrencyCode {
  const countryToCurrency: Record<string, CurrencyCode> = {
    US: 'USD', CA: 'USD',
    GB: 'GBP',
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR',
    NG: 'NGN',
    GH: 'GHS',
    KE: 'KES',
    ZA: 'ZAR',
    TZ: 'TZS',
    UG: 'UGX',
    RW: 'RWF',
    SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF',
    CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
    IN: 'INR',
    BR: 'BRL',
    MX: 'MXN'
  };

  return countryToCurrency[countryCode] || 'USD';
}

/**
 * Validate if a price is reasonable for the currency
 */
export function validatePrice(
  amount: number,
  currencyCode: CurrencyCode,
  options?: {
    minUSD?: number;
    maxUSD?: number;
  }
): { valid: boolean; reason?: string } {
  const { minUSD = 0.50, maxUSD = 10000 } = options || {};
  
  if (amount <= 0) {
    return { valid: false, reason: 'Price must be greater than 0' };
  }

  // Convert to USD for comparison
  const rates = getFallbackRates('USD');
  const rate = rates[currencyCode] || 1;
  const usdEquivalent = amount / rate;

  if (usdEquivalent < minUSD) {
    return { 
      valid: false, 
      reason: `Price is too low. Minimum is approximately ${formatCurrency(minUSD * rate, currencyCode)}` 
    };
  }

  if (usdEquivalent > maxUSD) {
    return { 
      valid: false, 
      reason: `Price is too high. Maximum is approximately ${formatCurrency(maxUSD * rate, currencyCode)}` 
    };
  }

  return { valid: true };
}

/**
 * Export utilities for use in components
 */
export const CurrencyUtils = {
  SUPPORTED_CURRENCIES,
  formatCurrency,
  convertCurrency,
  detectUserCurrency,
  getCurrencyByCountry,
  validatePrice,
  suggestLocalPrice
};
