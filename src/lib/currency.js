// Minimal currency util using exchangerate.host
// Exposed as JS so tests can import without TS transform
export async function getConversionRate(from, to, signal) {
  if (!from || !to) throw new Error('Missing currency codes')
  const url = `https://api.exchangerate.host/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=1`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Rate fetch failed: ${res.status}`)
  const data = await res.json()
  const rate = (data && data.info && data.info.rate) || (typeof data.result === 'number' && data.result) || null
  if (!rate || typeof rate !== 'number') throw new Error('Invalid rate from provider')
  return rate
}

export function applyRate(amount, rate) {
  if (typeof amount !== 'number' || typeof rate !== 'number') return 0
  // Avoid floating point rounding surprises by using a safe round
  const value = amount * rate
  return Math.round((value + Number.EPSILON) * 100) / 100
}
