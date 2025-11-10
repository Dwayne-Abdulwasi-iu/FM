import { formatPriceLocalized } from '@/lib/currency'

describe('formatPriceLocalized', () => {
  test('formats USD by default', () => {
    const s = formatPriceLocalized(10, 'USD', 'en-US')
    // e.g. "$10.00"
    expect(typeof s).toBe('string')
    expect(s).toMatch(/\$\s?10(\.00)?/)
  })

  test('converts to NGN and formats', () => {
    const s = formatPriceLocalized(10, 'NGN', 'en-US')
    // Using the static conversion (USD_TO_NGN = 800) this should be ~ 8,000
    // Accept either the NGN symbol or the currency code (Intl may render either)
    expect(s).toMatch(/(?:₦|NGN)\s?8,000/)
  })
})
