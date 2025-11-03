// Client-safe currency helpers

export type SupportedCurrency = 'USD' | 'NGN'

// Static display conversion; align with server's convertUSDToNGN (800)
const USD_TO_NGN = 800

export function convertFromUSD(amountUSD: number, currency: SupportedCurrency): number {
  if (currency === 'NGN') return Math.round(amountUSD * USD_TO_NGN)
  return amountUSD
}

export function formatPriceLocalized(amountUSD: number, currency: SupportedCurrency, locale: string): string {
  const amount = convertFromUSD(amountUSD, currency)
  return new Intl.NumberFormat(locale || 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol'
  }).format(amount)
}
