// Minimal currency util using exchangerate.host
// Exposed as JS so tests can import without TS transform
// In-memory cache for short-lived rates to avoid repeated network calls
const rateCache = new Map()
const DEFAULT_TTL = 2 * 60 * 1000 // 2 minutes

/**
 * Returns { rate, provider }
 */
export async function getConversionRate(from, to, signal) {
  if (!from || !to) throw new Error('Missing currency codes')
  const key = `${from}_${to}`

  // return cached if fresh
  const cached = rateCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return { rate: cached.rate, provider: cached.provider }
  }

  // detect API key (exposed to client via NEXT_PUBLIC_ prefix if needed)
  const apiKey = typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_EXCHANGERATE_HOST_KEY || process.env?.EXCHANGERATE_HOST_KEY)

  // Try primary provider (exchangerate.host)
  if (true) {
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
  }

  // Fallback provider: open.er-api.com (no API key, broad currency coverage)
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

export function applyRate(amount, rate) {
  if (typeof amount !== 'number' || typeof rate !== 'number') return 0
  // Avoid floating point rounding surprises by using a safe round
  const value = amount * rate
  return Math.round((value + Number.EPSILON) * 100) / 100
}
