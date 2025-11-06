import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import OrdersTab from '@/components/profile/OrdersTab'

// Mock SafeImage to a plain img to avoid Next.js image limitations in tests
jest.mock('@/components/ui/safe-image', () => {
  const MockSafeImage: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt }) => (
    // keep a simple img for tests
    // eslint-disable-next-line @next/next/no-img-element
    React.createElement('img', { src, alt })
  )
  return { __esModule: true, default: MockSafeImage }
})

describe('OrdersTab', () => {
  const mockOrders = [{
    id: '1',
    orderNumber: 'ORD-123',
    totalAmount: 24.5,
    createdAt: new Date().toISOString(),
    items: [{ id: 'd1', design: { id: 'd1', title: 'Design One', imageUrl: '/img/one.png' } }]
  }]

  beforeEach(() => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ orders: mockOrders }) })
    ;(global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders recent orders after fetch', async () => {
    render(<OrdersTab />)

    // wait for the order number to appear
    await waitFor(() => expect(screen.getByText(/ORD-123/)).toBeInTheDocument())

    expect(screen.getByText(/\$24.50/)).toBeInTheDocument()
    expect(screen.getByAltText('Design One')).toBeInTheDocument()
  })
})
