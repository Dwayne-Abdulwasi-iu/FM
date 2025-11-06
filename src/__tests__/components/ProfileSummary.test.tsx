import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ProfileTabs from '../../components/profile/ProfileTabs'

beforeEach(() => {
  ;(global as unknown as { fetch?: unknown }).fetch = jest.fn((input: RequestInfo) => {
    const url = String(input)

    if (url.includes('/api/profile/stats')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ stats: {
        totalEarnings: 200,
        totalRevenue: 250,
        totalSales: 5,
        totalDesigns: 3,
        platformCommission: 50
      } }) })
    }

    if (url.includes('/api/profile/earnings') && url.includes('status=PAID')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ earnings: [ { payoutCompletedAt: '2025-10-01T12:00:00Z' } ] }) })
    }

    if (url.includes('/api/profile/earnings')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ earnings: [ { payoutStatus: 'PENDING' } ] }) })
    }

    if (url.includes('/api/profile')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: {
        id: 'u1', name: 'Alice Example', email: 'alice@example.com', role: 'USER', isVerified: true, bio: 'Designer', location: 'Earth', createdAt: '2025-01-01T00:00:00Z'
      } }) })
    }

    if (url.includes('/api/designs')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ pagination: { total: 3 } }) })
    }

    if (url.includes('/api/orders')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ orders: [ { id: 'o1' }, { id: 'o2' } ] }) })
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

afterEach(() => {
  ;(global.fetch as jest.Mock).mockClear()
})

test('renders profile totals and payout info', async () => {
  render(<ProfileTabs />)

  // Wait for profile totals to appear
  await waitFor(() => expect(screen.getByText(/Total designs/i)).toBeInTheDocument())

  // Totals - locate the numeric value next to each label to avoid collisions with Overview numbers
  const designsLabel = screen.getByText(/Total designs/i)
  const designsValue = designsLabel.nextElementSibling?.textContent
  expect(designsValue).toBe('3')

  const salesLabel = screen.getByText(/Total sales/i)
  const salesValue = salesLabel.nextElementSibling?.textContent
  expect(salesValue).toBe('2')

  // Currency formatted values - find values next to their labels to avoid collisions
  const revenueLabel = screen.getByText(/Total revenue/i)
  const revenueValue = revenueLabel.nextElementSibling?.textContent || ''
  expect(revenueValue).toMatch(/\$250(?:\.00)?/)

  const earningsLabel = screen.getByText(/Your earnings/i)
  const earningsValue = earningsLabel.nextElementSibling?.textContent || ''
  expect(earningsValue).toMatch(/\$200(?:\.00)?/)

  // Avg order value = 250 / 5 = 50
  expect(screen.getByText(/\$50(?:\.00)?/)).toBeInTheDocument()

  // Payout status and last payout date (year present)
  expect(screen.getByText(/PENDING/)).toBeInTheDocument()
  const lastPayoutLabel = screen.getByText(/Last payout date/i)
  const lastPayoutValue = lastPayoutLabel.nextElementSibling?.textContent || ''
  expect(lastPayoutValue).toMatch(/2025/)
})
