import { getConversionRate, applyRate } from '../../lib/currency'

describe('currency util', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
    delete global.fetch
  })

  test('getConversionRate returns rate from info.rate', async () => {
    const fake = { info: { rate: 2.5 } }
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => fake })
    const rate = await getConversionRate('USD', 'NGN')
    expect(rate).toBe(2.5)
    expect(global.fetch).toHaveBeenCalled()
  })

  test('getConversionRate returns rate from result fallback', async () => {
    const fake = { result: 1.234 }
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => fake })
    const rate = await getConversionRate('EUR', 'GBP')
    expect(rate).toBe(1.234)
  })

  test('applyRate computes and rounds correctly', () => {
    expect(applyRate(10, 1.2345)).toBe(12.35)
    expect(applyRate(0, 2)).toBe(0)
  })

  test('getConversionRate throws on network error', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(getConversionRate('USD', 'EUR')).rejects.toThrow()
  })
})
