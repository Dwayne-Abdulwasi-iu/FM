/* eslint-disable @typescript-eslint/no-explicit-any */
import { getConversionRate, applyRate } from '@/lib/currency'

describe('currency network helpers', () => {
  const origFetch = global.fetch

  afterEach(() => {
    // restore fetch (may be undefined in Node); cast to any for test harness
    ;(global as unknown as any).fetch = origFetch
    jest.resetAllMocks()
  })

  test('getConversionRate uses primary provider when available', async () => {
    // primary provider returns { info: { rate } }
    // first fetch call is primary
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ info: { rate: 2.5 } }) })

    ;(global as unknown as any).fetch = mockFetch

    const res = await getConversionRate('USD', 'EUR')
    expect(res.rate).toBe(2.5)
    expect(res.provider).toBe('exchangerate.host')
    // ensure fetch was called at least once
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  test('getConversionRate falls back when primary fails', async () => {
    // primary returns ok: false, fallback returns rates map
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { GBP: 3.1 } }) })

    ;(global as unknown as any).fetch = mockFetch

    const res = await getConversionRate('USD', 'GBP')
    expect(res.rate).toBe(3.1)
    expect(res.provider).toBe('open.er-api.com')
  })

  test('applyRate rounds to 2 decimals safely', () => {
    const out = applyRate(10, 1.2345)
    // 10 * 1.2345 = 12.345 => rounds to 12.35
    expect(out).toBeCloseTo(12.35, 2)
  })
})
