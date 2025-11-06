import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import OrdersTab from '@/components/profile/OrdersTab'

// Mock SafeImage to a plain img to avoid Next.js image limitations in tests
jest.mock('@/components/ui/safe-image', () => {
  const MockSafeImage: React.FC<{ src: string; alt?: string }> = ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    React.createElement('img', { src, alt })
  )
  return { __esModule: true, default: MockSafeImage }
})

describe('OrdersTab edge cases', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('shows empty state when there are no orders', async () => {
  const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ orders: [] }) })
  ;(global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch

    render(<OrdersTab />)

    await waitFor(() => expect(screen.getByText(/You have no orders yet/i)).toBeInTheDocument())
  })

  it('displays +N indicator when order has more than 3 items', async () => {
    const order = {
      id: 'o1',
      orderNumber: 'ORD-999',
      totalAmount: 99,
      createdAt: new Date().toISOString(),
      items: [
        { id: 'i1', design: { id: 'd1', title: 'A', imageUrl: '/a.png' } },
        { id: 'i2', design: { id: 'd2', title: 'B', imageUrl: '/b.png' } },
        { id: 'i3', design: { id: 'd3', title: 'C', imageUrl: '/c.png' } },
        { id: 'i4', design: { id: 'd4', title: 'D', imageUrl: '/d.png' } },
        { id: 'i5', design: { id: 'd5', title: 'E', imageUrl: '/e.png' } }
      ]
    }

  const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ orders: [order] }) })
  ;(global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch

    render(<OrdersTab />)

    // wait for order number
    await waitFor(() => expect(screen.getByText(/ORD-999/)).toBeInTheDocument())

    // should show +2 (5 - 3)
    expect(screen.getByText(/\+2/)).toBeInTheDocument()
  })
})
