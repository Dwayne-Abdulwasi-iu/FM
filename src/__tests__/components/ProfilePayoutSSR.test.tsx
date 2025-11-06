import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ProfileTabs from '../../components/profile/ProfileTabs'

beforeEach(() => {
  ;(global as unknown as { fetch?: unknown }).fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})

afterEach(() => {
  ;(global.fetch as jest.Mock).mockClear()
})

test('renders SSR payout summary without client fetches', async () => {
  const initialProfile = { id: 'u1', name: 'Sam SSR', email: 'sam@ssr.test', role: 'USER', isVerified: true, createdAt: '2025-01-01T00:00:00Z' }
  const initialStats = {
    totalDesigns: 4,
    totalSales: 2,
    totalRevenue: 300,
    totalEarnings: 240,
    platformCommission: 60,
    monthlyEarnings: [
      { month: 'Jun 2025', earnings: 10 },
      { month: 'Jul 2025', earnings: 20 },
      { month: 'Aug 2025', earnings: 30 }
    ]
  }
  const initialPayoutSummary = { lastPayoutStatus: 'PAID', lastPayoutDate: '2025-10-01T12:00:00Z' }

  render(<ProfileTabs initialProfile={initialProfile} initialStats={initialStats} initialPayoutSummary={initialPayoutSummary} />)

  // Payout status should show immediately from SSR data
  await waitFor(() => expect(screen.getByText(/Payout status/i)).toBeInTheDocument())
  expect(screen.getByText('PAID')).toBeInTheDocument()

  // Last payout date present (year check to be robust across locales)
  const lastPayoutLabel = screen.getByText(/Last payout date/i)
  const lastPayoutValue = lastPayoutLabel.nextElementSibling?.textContent || ''
  expect(lastPayoutValue).toMatch(/2025/)

  // Ensure no client fetches were performed for profile/stats/payouts
  expect((global.fetch as jest.Mock).mock.calls.length).toBe(0)
})
