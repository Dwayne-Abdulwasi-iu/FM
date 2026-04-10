import { getCommissionBreakdown, getCommissionRate } from '@/lib/commission-tiers'

describe('Simulated Checkout → Payout Flow (no external processors)', () => {
  it('calculates correct commission and seller payout for SELLER_DIRECT (products+shipping)', () => {
    const saleAmount = 100.00 // USD
    const shipping = 10.00
    const total = saleAmount + shipping

    // Simulate seller with $600 total earnings (BRONZE)
    const sellerTotalEarnings = 600
    const isPro = false

    const breakdown = getCommissionBreakdown(total, sellerTotalEarnings, isPro)

    // Commission rate should match tier
    const rate = getCommissionRate(sellerTotalEarnings, isPro)
    expect(breakdown.commissionRate).toBeCloseTo(rate)

    // Platform fee = total * rate
    expect(breakdown.platformFee).toBeCloseTo(Number((total * rate).toFixed(2)))
    expect(breakdown.sellerReceives).toBeCloseTo(Number((total - total * rate).toFixed(2)))
  })

  it('calculates commission for ADMIN_STOCK (products only) correctly', () => {
    const productPrice = 80.00
    const shipping = 20.00
    const commissionable = productPrice // platform takes commission only on product for ADMIN_STOCK

    const sellerTotalEarnings = 12000 // PLATINUM
    const isPro = true

    const breakdown = getCommissionBreakdown(commissionable, sellerTotalEarnings, isPro)

    const rate = getCommissionRate(sellerTotalEarnings, isPro)
    expect(breakdown.commissionRate).toBeCloseTo(rate)
    expect(breakdown.platformFee).toBeCloseTo(Number((commissionable * rate).toFixed(2)))
  })

  it('aggregates multiple seller earnings into total commission', () => {
    const items = [
      { sellerId: 's1', amount: 50.0, sellerEarningsTotal: 50 },
      { sellerId: 's1', amount: 30.0, sellerEarningsTotal: 50 },
      { sellerId: 's2', amount: 200.0, sellerEarningsTotal: 600 }
    ]

    const earningsRecords: Array<{ sellerId: string; platformCommission: number; sellerAmount: number }> = []

    for (const item of items) {
      const rate = getCommissionRate(item.sellerEarningsTotal, false)
      const commission = Math.round((item.amount * rate) * 100) / 100
      const sellerAmount = Math.round((item.amount - commission) * 100) / 100
      earningsRecords.push({ sellerId: item.sellerId, platformCommission: commission, sellerAmount })
    }

    const totalCommission = earningsRecords.reduce((s, r) => s + r.platformCommission, 0)
    const totalSeller = earningsRecords.reduce((s, r) => s + r.sellerAmount, 0)

    expect(totalCommission).toBeGreaterThan(0)
    expect(totalSeller + totalCommission).toBeCloseTo(items.reduce((s, it) => s + it.amount, 0))
  })
})
