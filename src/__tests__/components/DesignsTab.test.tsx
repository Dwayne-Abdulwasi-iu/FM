import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import DesignsTab from '../../components/profile/DesignsTab'

beforeEach(() => {
  ;(global as unknown as { fetch?: unknown }).fetch = jest.fn((input: RequestInfo) => {
    const url = String(input)
    if (url.includes('/api/designs')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ designs: [
        { id: 'd1', title: 'Design One', category: 'Pattern', imageUrl: '/img1.png', thumbnailUrl: '/thumb1.png' },
        { id: 'd2', title: 'Design Two', category: 'Illustration', imageUrl: '/img2.png', thumbnailUrl: '/thumb2.png' }
      ] }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

afterEach(() => {
  ;(global.fetch as jest.Mock).mockClear()
})

test('renders recent designs list', async () => {
  render(<DesignsTab />)

  await waitFor(() => expect(screen.getByText('Design One')).toBeInTheDocument())
  expect(screen.getByText('Design Two')).toBeInTheDocument()
})
