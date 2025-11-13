import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileTabs from '@/components/profile/ProfileTabs'

beforeEach(() => {
  ;(global as unknown as { fetch?: unknown }).fetch = jest.fn((input: RequestInfo, init?: RequestInit) => {
    const url = String(input)

    // Default responses for other endpoints used by the component
    if (url.includes('/api/profile/stats')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ stats: {} }) })
    }

    if (url.includes('/api/profile/earnings')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ earnings: [] }) })
    }

    // Handle profile GET
    if (url.includes('/api/profile') && (!init || init.method !== 'PUT')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: {
        id: 'u1', name: 'Client User', email: 'client@example.com', role: 'USER', isVerified: true, bio: 'Client', location: 'Earth', username: 'olduser', createdAt: '2025-01-01T00:00:00Z'
      } }) })
    }

    // Handle profile PUT (save)
    if (url.includes('/api/profile') && init && init.method === 'PUT') {
      try {
        const body = init.body ? JSON.parse(String(init.body)) : {}
        // wrong password case
        if (body.confirmPassword === 'wrongpass') {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'Incorrect password' }) })
        }

        // success case: return updated user
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { id: 'u1', name: 'Client User', email: 'client@example.com', role: 'USER', isVerified: true, bio: 'Client', location: 'Earth', username: body.username || 'olduser', createdAt: '2025-01-01T00:00:00Z' } }) })
      } catch (e) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'Bad request' }) })
      }
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

afterEach(() => {
  ;(global.fetch as jest.Mock).mockClear()
})

test('username change requires password re-entry and enforces server validation', async () => {
  const user = userEvent.setup()
  render(<ProfileTabs initialProfile={{ id: 'u1', name: 'Client User', username: 'olduser', email: 'client@example.com', role: 'USER', isVerified: true }} initialStats={{ totalDesigns: 0 }} />)

  // Enter edit mode
  await user.click(screen.getByText(/Edit/i))

  // change username
  const usernameInput = screen.getByPlaceholderText(/Username \(letters, numbers, - or _\)/i)
  await user.clear(usernameInput)
  await user.type(usernameInput, 'newuser')

  // click Save -> should open confirm modal (step 1)
  await user.click(screen.getByRole('button', { name: /Save/i }))
  expect(screen.getByText(/Confirm username change/i)).toBeInTheDocument()

  // advance to second step
  await user.click(screen.getByRole('button', { name: /Continue/i }))

  // password input should be visible
  const pwd = await screen.findByLabelText(/Enter your current password to confirm/i)
  await user.type(pwd, 'wrongpass')

  // confirm with wrong password -> modal will close and saveError should appear in the edit form
  await user.click(screen.getByRole('button', { name: /Change username/i }))

  await waitFor(() => expect(screen.getByText(/Incorrect password/i)).toBeInTheDocument())

  // reopen confirmation flow
  await user.click(screen.getByRole('button', { name: /Save/i }))
  await user.click(screen.getByRole('button', { name: /Continue/i }))

  const pwd2 = await screen.findByLabelText(/Enter your current password to confirm/i)
  await user.clear(pwd2)
  await user.type(pwd2, 'rightpass')

  // confirm with correct password -> should apply change and exit edit mode
  await user.click(screen.getByRole('button', { name: /Change username/i }))

  // Wait for the new username to appear on the profile header
  await waitFor(() => expect(screen.getByText(/@newuser/i)).toBeInTheDocument())
})
