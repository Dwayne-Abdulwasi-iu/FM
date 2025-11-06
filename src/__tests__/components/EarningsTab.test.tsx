import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import EarningsTab from '../../components/profile/EarningsTab'

beforeEach(() => {
  ;(global as unknown as { fetch?: unknown }).fetch = jest.fn((input: RequestInfo) => {
    const url = String(input)
    if (url.includes('/api/profile/stats')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ stats: {
        totalEarnings: 120.5,
        totalRevenue: 150,
        platformCommission: 29.5,
        monthlyEarnings: [
          { month: 'Jun 2025', earnings: 10 },
          { month: 'Jul 2025', earnings: 15 },
          { month: 'Aug 2025', earnings: 20 }
        ]
      } }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

afterEach(() => {
  ;(global.fetch as jest.Mock).mockClear()
})

test('renders earnings totals and sparkline', async () => {
  render(<EarningsTab />)

  await waitFor(() => expect(screen.getByText(/Total Earnings/i)).toBeInTheDocument())
  expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument()
  expect(screen.getByText(/Platform Commission/i)).toBeInTheDocument()
})
