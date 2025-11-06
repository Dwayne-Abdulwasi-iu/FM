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
        platformCommission: 50,
        monthlyEarnings: [
          { month: 'Jun 2025', earnings: 10 },
          { month: 'Jul 2025', earnings: 15 },
          { month: 'Aug 2025', earnings: 20 }
        ]
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
        id: 'u1', name: 'Client User', email: 'client@example.com', role: 'USER', isVerified: true, bio: 'Client', location: 'Earth', createdAt: '2025-01-01T00:00:00Z'
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

test('client fetches populate the ProfileTabs UI when SSR data is absent', async () => {
  render(<ProfileTabs />)

  // Wait for profile aside labels to appear (they render after client fetch)
  await waitFor(() => expect(screen.getByText(/Total designs/i)).toBeInTheDocument())

  // Totals - check numeric siblings
  const designsLabel = screen.getByText(/Total designs/i)
  const designsValue = designsLabel.nextElementSibling?.textContent
  expect(designsValue).toBe('3')

  const salesLabel = screen.getByText(/Total sales/i)
  const salesValue = salesLabel.nextElementSibling?.textContent
  expect(salesValue).toBe('2')

  // Currency values
  const revenueLabel = screen.getByText(/Total revenue/i)
  const revenueValue = revenueLabel.nextElementSibling?.textContent || ''
  expect(revenueValue).toMatch(/\$250(?:\.00)?/)

  const earningsLabel = screen.getByText(/Your earnings/i)
  const earningsValue = earningsLabel.nextElementSibling?.textContent || ''
  expect(earningsValue).toMatch(/\$200(?:\.00)?/)

  // Payout summary populated from client fetches
  expect(screen.getByText(/Payout status/i)).toBeInTheDocument()
  expect(screen.getByText('PENDING')).toBeInTheDocument()

  // Verify fetch was called and included the key endpoints
  const urls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]))
  expect(urls.some(u => u.includes('/api/profile'))).toBeTruthy()
  expect(urls.some(u => u.includes('/api/profile/stats'))).toBeTruthy()
  expect(urls.some(u => u.includes('/api/profile/earnings'))).toBeTruthy()
  expect(urls.some(u => u.includes('/api/designs'))).toBeTruthy()
  expect(urls.some(u => u.includes('/api/orders'))).toBeTruthy()
})
