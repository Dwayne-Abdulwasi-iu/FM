import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SellerAccountTab from '@/components/profile/SellerAccountTab'

// Mock fetch globally for this test file
const mockBanks = [
  { code: '001', name: 'Test Bank A' },
  { code: '002', name: 'Second Bank' },
  { code: '003', name: 'Another Bank' }
]

// jsdom doesn't implement scrollIntoView; mock it to avoid errors
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).scrollIntoView = jest.fn()
})

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Element.prototype as any).scrollIntoView = undefined
})
beforeEach(() => {
  jest.spyOn(global, 'fetch').mockImplementation((...args: unknown[]) => {
    const url = args[0] as unknown
    if (typeof url === 'string' && url.includes('/api/seller/banks')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ banks: mockBanks }) } as unknown as Response)
    }
    if (typeof url === 'string' && url.includes('/api/seller/account')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ sellerAccount: null }) } as unknown as Response)
    }
    // default fallback
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as unknown as Response)
  })
})

afterEach(() => {
  ;(global.fetch as jest.Mock).mockRestore()
})

describe('SellerAccountTab bank search accessibility', () => {
  it('shows listbox with options and announces counts and selection', async () => {
    render(<SellerAccountTab />)

    // Wait for banks to be fetched and listed
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    // Wait for the Add Account button (loading finished), then open the form
    const addBtn = await waitFor(() => screen.getByText(/add account/i))
    fireEvent.click(addBtn)

    const input = await waitFor(() => screen.getByRole('combobox', { name: /search bank/i }))
    expect(input).toBeInTheDocument()

    // Type a query that matches two banks
    fireEvent.change(input, { target: { value: 'Bank' } })

    // live region should announce number of banks found
    await waitFor(() => {
      const live = screen.getByText(/banks? found/i)
      expect(live).toBeInTheDocument()
    })

    // Dropdown should be visible with role listbox
    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()

    // There should be options (role option)
    const options = await screen.findAllByRole('option')
    expect(options.length).toBeGreaterThanOrEqual(1)

    // Keyboard navigation: ArrowDown highlights first option
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    await waitFor(() => {
      // aria-activedescendant should point to the first option id
      const activeId = input.getAttribute('aria-activedescendant')
      expect(activeId).toBeTruthy()
      const activeEl = document.getElementById(activeId!)
      expect(activeEl).toBeInTheDocument()
    })

    // Press Enter to select highlighted option
    fireEvent.keyDown(input, { key: 'Enter' })

    // After selection, the input should show the selected bank name
    await waitFor(() => {
      const inputEl = screen.getByRole('combobox', { name: /search bank/i }) as HTMLInputElement
      expect(inputEl.value).toBeTruthy()
    })

    // The hidden select should have the selected value (if present)
    const selects = document.getElementsByTagName('select')
    if (selects.length > 0) {
      const sel = selects[0] as HTMLSelectElement
      expect(sel.value).not.toBe('')
    }
  })
})
