import Stripe from 'stripe'

/**
 * Lazily initialize Stripe to avoid throwing at module import time
 * (which can break Next.js builds when env vars are not provided at build-time).
 */
let _stripe: Stripe | null = null

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  _stripe = new Stripe(key, { apiVersion: '2023-10-16' })
  return _stripe
}

export const PLATFORM_FEE_PERCENTAGE = 0.05 // 5%

export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_PERCENTAGE * 100) // Convert to cents
}

export function calculateSellerAmount(amount: number): number {
  const platformFee = calculatePlatformFee(amount)
  return Math.round(amount * 100) - platformFee // Convert to cents minus platform fee
}