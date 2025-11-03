import Stripe from 'stripe'

let _stripe: Stripe | null = null

function initStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    // Defer failure until the first actual Stripe call at runtime
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  _stripe = new Stripe(key, { apiVersion: '2023-10-16' })
  return _stripe
}

// Lazy proxy: accessing any property will initialize Stripe on demand
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const s = initStripe()
    const key = prop as keyof Stripe
    const value = s[key]
    if (typeof value === 'function') {
      return (value as unknown as (...args: unknown[]) => unknown).bind(s)
    }
    return value as Stripe[keyof Stripe]
  },
}) as unknown as Stripe

export const PLATFORM_FEE_PERCENTAGE = 0.05 // 5%

export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_PERCENTAGE * 100) // Convert to cents
}

export function calculateSellerAmount(amount: number): number {
  const platformFee = calculatePlatformFee(amount)
  return Math.round(amount * 100) - platformFee // Convert to cents minus platform fee
}