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

// --- Network-backed conversion helpers (previously in currency.js)
type RateCacheEntry = { rate: number; provider: string; expiresAt: number }
const rateCache = new Map<string, RateCacheEntry>()
const DEFAULT_TTL = 2 * 60 * 1000 // 2 minutes

export async function getConversionRate(from: string, to: string, signal?: AbortSignal): Promise<{ rate: number; provider: string }> {
  if (!from || !to) throw new Error('Missing currency codes')
  const key = `${from}_${to}`

  const cached = rateCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return { rate: cached.rate, provider: cached.provider }
  }

  // Optionally use an API key passed via NEXT_PUBLIC_
  const apiKey = typeof process !== 'undefined' ? (process.env?.NEXT_PUBLIC_EXCHANGERATE_HOST_KEY || process.env?.EXCHANGERATE_HOST_KEY) : undefined

  // Primary provider: exchangerate.host
  try {
    let url = `https://api.exchangerate.host/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=1`
    if (apiKey) url += `&access_key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, { signal })
    if (res.ok) {
      const data = await res.json()
      const rate = (data && data.info && data.info.rate) || (typeof data.result === 'number' && data.result) || null
      if (rate && typeof rate === 'number') {
        rateCache.set(key, { rate, provider: 'exchangerate.host', expiresAt: Date.now() + DEFAULT_TTL })
        return { rate, provider: 'exchangerate.host' }
      }
    }
  } catch {
    // ignore and try fallback
  }

  // Fallback provider
  try {
    const url2 = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`
    const res2 = await fetch(url2, { signal })
    if (res2.ok) {
      const data2 = await res2.json()
      if (data2 && data2.rates && typeof data2.rates[to] === 'number') {
        const rate = data2.rates[to]
        rateCache.set(key, { rate, provider: 'open.er-api.com', expiresAt: Date.now() + DEFAULT_TTL })
        return { rate, provider: 'open.er-api.com' }
      }
    }
  } catch {
    // final failure
  }

  throw new Error('Invalid rate from providers')
}

export function applyRate(amount: number, rate: number): number {
  if (typeof amount !== 'number' || typeof rate !== 'number') return 0
  const value = amount * rate
  return Math.round((value + Number.EPSILON) * 100) / 100
}
