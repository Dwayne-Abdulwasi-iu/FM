import { render } from '@testing-library/react'
import { Navbar } from '@/components/layout/navbar'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { CurrencyProvider } from '@/components/CurrencyProvider'
import type { ReactNode } from 'react'
import type { Session } from 'next-auth'

// Mock the session
const mockSession: Session = {
  user: {
    id: '1',
    role: 'USER',
    name: 'Test User',
    email: 'test@example.com',
  },
  expires: '2024-01-01',
}

type MockProps = { children: ReactNode; session?: Session | null }
const MockSessionProvider = ({ children, session = null }: MockProps) => (
  <SessionProvider session={session}>
    <LanguageProvider>
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
    </LanguageProvider>
  </SessionProvider>
)

describe('Navbar', () => {
  it('renders the navbar with logo', () => {
    const { getAllByText } = render(
      <MockSessionProvider>
        <Navbar />
      </MockSessionProvider>
    )

    expect(getAllByText('FM').length).toBeGreaterThan(0)
  })

  it('shows sign in button when not authenticated', () => {
    const { getByText } = render(
      <MockSessionProvider session={null}>
        <Navbar />
      </MockSessionProvider>
    )

    expect(getByText('Sign In')).toBeInTheDocument()
  })

  it('shows upload link when authenticated', () => {
    const { getByText } = render(
      <MockSessionProvider session={mockSession}>
        <Navbar />
      </MockSessionProvider>
    )

    expect(getByText('Upload')).toBeInTheDocument()
    expect(getByText('Sign Out')).toBeInTheDocument()
  })

  it('has proper navigation links', () => {
    const { getByText, getByPlaceholderText } = render(
      <MockSessionProvider>
        <Navbar />
      </MockSessionProvider>
    )

    expect(getByText('Designs')).toBeInTheDocument()
    expect(getByPlaceholderText('Search...')).toBeInTheDocument()
  })
})