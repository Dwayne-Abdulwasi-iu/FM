/**
 * Geo-Detection & Payment/Shipping Processor Selection
 * 
 * Routes requests based on buyer geography:
 * - Nigeria: Paystack + Admin Warehouse Shipping
 * - Africa (other): Paystack/Flutterwave + Seller Direct Shipping
 * - Rest of World: Stripe + Seller Direct Shipping
 */

// Countries that support Stripe (primarily developed markets)
export const STRIPE_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'NZ', 'JP', 'SG', 'HK', 'AE', 'DE', 'FR', 'IT', 'ES', 'NL',
  'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'GR', 'CZ', 'PL', 'IE'
]

// Paystack: Best for Nigeria with direct bank transfers
export const PAYSTACK_COUNTRIES = ['NG']

// Flutterwave: Broader African coverage
export const FLUTTERWAVE_COUNTRIES = [
  'GH', 'KE', 'TZ', 'RW', 'UG', 'ZA', 'MW', 'ZM', 'ET', 'MA', 'LS', 'SD', 'SN'
]

export type PaymentProcessor = 'STRIPE' | 'PAYSTACK' | 'FLUTTERWAVE'
export type FulfillmentMethod = 'ADMIN_STOCK' | 'SELLER_DIRECT'

export interface ShippingInfo {
  cost: number
  estimatedDays: number
  carrier: string
  notes?: string
}

export interface GeoLocation {
  countryCode: string
  countryName: string
  state?: string
  city?: string
}

/**
 * Determine payment processor based on buyer country
 * Priority: Paystack (Nigeria) > Stripe (developed) > Flutterwave (Africa)
 */
export function getPaymentProcessor(buyerCountry: string): PaymentProcessor {
  const normalizedCountry = (buyerCountry || '').toUpperCase().trim()
  
  if (PAYSTACK_COUNTRIES.includes(normalizedCountry)) {
    return 'PAYSTACK'
  }
  
  if (STRIPE_COUNTRIES.includes(normalizedCountry)) {
    return 'STRIPE'
  }
  
  if (FLUTTERWAVE_COUNTRIES.includes(normalizedCountry)) {
    return 'FLUTTERWAVE'
  }
  
  // Fallback: Use Stripe for unknown countries (has broadest coverage)
  return 'STRIPE'
}

/**
 * Determine fulfillment method based on country & product type
 * Nigeria: Prefer ADMIN_STOCK (warehouse fulfillment)
 * International: Prefer SELLER_DIRECT (seller handles shipping)
 */
export function getFulfillmentMethod(
  buyerCountry: string,
  productFulfillmentMethod: FulfillmentMethod
): FulfillmentMethod {
  // If product only supports one method, use that
  if (productFulfillmentMethod === 'ADMIN_STOCK') {
    return 'ADMIN_STOCK'
  }
  
  return 'SELLER_DIRECT'
}

/**
 * Calculate shipping cost based on fulfillment method and geography
 * ADMIN_STOCK (Nigeria): Platform handles domestic shipping
 * SELLER_DIRECT: Seller sets their own shipping rate
 */
export function getShippingCost(
  fulfillmentMethod: FulfillmentMethod,
  buyerCountry: string,
  buyerState?: string,
  weight: number = 0.5
): ShippingInfo {
  const normalizedCountry = (buyerCountry || '').toUpperCase().trim()
  
  if (fulfillmentMethod === 'ADMIN_STOCK') {
    // Platform warehouse shipping (Nigeria only)
    if (normalizedCountry === 'NG') {
      // Base on state for domestic Nigerian shipping
      let baseCost = 3500 // Lagos default
      let days = 2
      
      if (buyerState) {
        // Zone-based pricing (can be extended with database lookup)
        const stateLower = buyerState.toLowerCase()
        if (stateLower === 'lagos') {
          baseCost = 2500
          days = 1
        } else if (['ogun', 'oyo', 'osun'].includes(stateLower)) {
          baseCost = 2500
          days = 2
        } else if (['edo', 'delta', 'rivers'].includes(stateLower)) {
          baseCost = 3000
          days = 3
        } else if (['kano', 'kaduna', 'katsina'].includes(stateLower)) {
          baseCost = 3500
          days = 4
        } else {
          baseCost = 3500
          days = 3
        }
      }
      
      // Add weight-based surcharge
      if (weight > 1) {
        baseCost += Math.ceil((weight - 1) * 500)
      }
      
      return {
        cost: baseCost,
        estimatedDays: days,
        carrier: 'Fashion Boutique Warehouse',
        notes: `Delivery in ${days}-${days + 1} business days within Nigeria`
      }
    }
    
    // International admin stock (if enabled) - high cost
    return {
      cost: 15000,
      estimatedDays: 7,
      carrier: 'DHL Express',
      notes: 'International warehouse shipping'
    }
  }
  
  // SELLER_DIRECT: Seller sets their own shipping
  // We return 0 here as seller will provide their own rate
  return {
    cost: 0,
    estimatedDays: 1,
    carrier: 'Seller',
    notes: 'Seller will provide shipping cost at checkout'
  }
}

/**
 * Get buyer location from IP (MaxMind or similar)
 * For now, returns default based on request headers
 * In production, use a GeoIP service
 */
export function extractGeoLocation(headers: Record<string, string | string[] | undefined>): GeoLocation {
  // Get country from CF-IPCountry header (Cloudflare), x-vercel-ip-country (Vercel), or default
  const cfCountry = headers['cf-ipcountry']
  const vercelCountry = headers['x-vercel-ip-country']
  const countryCode = (
    typeof cfCountry === 'string' ? cfCountry :
    typeof vercelCountry === 'string' ? vercelCountry :
    'NG' // Default to Nigeria
  ).toUpperCase()

  return {
    countryCode,
    countryName: getCountryName(countryCode),
  }
}

/**
 * Map ISO country code to country name
 */
function getCountryName(countryCode: string): string {
  const countryMap: Record<string, string> = {
    'NG': 'Nigeria',
    'GH': 'Ghana',
    'KE': 'Kenya',
    'TZ': 'Tanzania',
    'RW': 'Rwanda',
    'UG': 'Uganda',
    'ZA': 'South Africa',
    'MW': 'Malawi',
    'ZM': 'Zambia',
    'ET': 'Ethiopia',
    'MA': 'Morocco',
    'LS': 'Lesotho',
    'SD': 'Sudan',
    'SN': 'Senegal',
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom',
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'JP': 'Japan',
    'SG': 'Singapore',
    'HK': 'Hong Kong',
    'AE': 'United Arab Emirates',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
  }
  
  return countryMap[countryCode] || countryCode
}

/**
 * Validate if shipping is available to buyer country
 */
export function isShippingAvailable(
  fulfillmentMethod: FulfillmentMethod,
  buyerCountry: string
): boolean {
  const normalizedCountry = (buyerCountry || '').toUpperCase().trim()
  
  if (fulfillmentMethod === 'ADMIN_STOCK') {
    // Admin stock shipping available only to Nigeria for now
    return normalizedCountry === 'NG'
  }
  
  // SELLER_DIRECT: Available everywhere (seller decides)
  return true
}

/**
 * Get currency for country
 */
export function getCurrencyForCountry(countryCode: string): string {
  const currencyMap: Record<string, string> = {
    'NG': 'NGN',
    'GH': 'GHS',
    'KE': 'KES',
    'TZ': 'TZS',
    'RW': 'RWF',
    'UG': 'UGX',
    'ZA': 'ZAR',
    'US': 'USD',
    'CA': 'CAD',
    'GB': 'GBP',
    'AU': 'AUD',
    'JP': 'JPY',
    'SG': 'SGD',
    'HK': 'HKD',
    'AE': 'AED',
    'EU': 'EUR',
  }
  
  return currencyMap[countryCode] || 'USD'
}
