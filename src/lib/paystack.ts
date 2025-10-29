const PayStack = require('paystack')(process.env.PAYSTACK_SECRET_KEY || 'sk_test_REDACTED')

export { PayStack as paystack }

export function calculatePaystackFee(amount: number): number {
  // Paystack charges 1.5% + NGN 100 cap at NGN 2,000
  // For international cards: 3.9%
  // Using 3.9% for international transactions (USD)
  return Math.round(amount * 0.039)
}

export function isPaystackConfigured(): boolean {
  return !!(
    process.env.PAYSTACK_SECRET_KEY && 
    process.env.PAYSTACK_SECRET_KEY !== 'sk_test_REDACTED' &&
    process.env.PAYSTACK_PUBLIC_KEY &&
    process.env.PAYSTACK_PUBLIC_KEY !== 'pk_test_your_paystack_public_key_here'
  )
}

export function convertUSDToNGN(usdAmount: number): number {
  // Using approximate exchange rate USD to NGN (1 USD = 800 NGN)
  // In production, you should use a real-time exchange rate API
  const exchangeRate = 800
  return Math.round(usdAmount * exchangeRate)
}

export function convertNGNToUSD(ngnAmount: number): number {
  // Using approximate exchange rate NGN to USD (800 NGN = 1 USD)
  const exchangeRate = 800
  return ngnAmount / exchangeRate
}