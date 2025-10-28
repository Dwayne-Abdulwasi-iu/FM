import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export const PLATFORM_FEE_PERCENTAGE = 0.05 // 5%

export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_PERCENTAGE * 100) // Convert to cents
}

export function calculateSellerAmount(amount: number): number {
  const platformFee = calculatePlatformFee(amount)
  return Math.round(amount * 100) - platformFee // Convert to cents minus platform fee
}