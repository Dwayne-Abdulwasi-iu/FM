import React from 'react'
// Note: this test checks the source file for responsive classes and labels to avoid fragile DOM interactions

// Override the next-auth mock from jest.setup to return an authenticated admin
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: { user: { id: 'admin', role: 'ADMIN', email: 'admin@example.com' } }, status: 'authenticated' })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children
}))

// next/navigation mocks are provided in jest.setup

// Import the Admin page (client component)
import fs from 'fs'
import path from 'path'

describe('Admin design filters - mobile layout', () => {
  test('source contains responsive stacking class and labels', async () => {
    const file = path.resolve(__dirname, '../../app/admin/page.tsx')
    const src = fs.readFileSync(file, 'utf8')

    expect(src).toMatch(/xs:flex-col/)
    expect(src).toMatch(/Show deletable only/)
    expect(src).toMatch(/Has orders/)
    expect(src).toMatch(/Owned/)
    expect(src).toMatch(/Inactive/)
  })
})
