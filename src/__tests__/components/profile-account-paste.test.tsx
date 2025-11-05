import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SellerAccountTab } from '../../app/profile/page'

// Minimal fetch mocking for the seller account tab loads
beforeEach(() => {
  ;(global as any).fetch = jest.fn((input: any) => {
    const url = String(input)
    if (url.includes('/api/seller/account')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sellerAccount: null }) } as any)
    }
    if (url.includes('/api/seller/banks')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ banks: [{ code: '001', name: 'Test Bank' }] }) } as any)
    }
    // default
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any)
  })
})

afterEach(() => {
  ;(global.fetch as jest.Mock).mockClear()
})

test('pasting formatted account numbers normalizes to digits', async () => {
  render(<SellerAccountTab onSuccess={jest.fn()} onError={jest.fn()} />)

  // Wait for Add Account button and click it
  const addBtn = await waitFor(() => screen.getByRole('button', { name: /Add Account|Update Account/i }))
  fireEvent.click(addBtn)

  // Find the account number input
  const input = await waitFor(() => screen.getByPlaceholderText('1234567890'))
  expect(input).toBeInTheDocument()

  // Simulate pasting a dashed format
  fireEvent.paste(input, {
    clipboardData: {
      getData: () => '123-456-7890'
    }
  } as any)

  await waitFor(() => expect((input as HTMLInputElement).value).toBe('1234567890'))

  // Clear and paste spaced format
  fireEvent.change(input, { target: { value: '' } })
  fireEvent.paste(input, {
    clipboardData: {
      getData: () => '123 456 7890'
    }
  } as any)

  await waitFor(() => expect((input as HTMLInputElement).value).toBe('1234567890'))
})
