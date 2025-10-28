import { render, screen } from '@testing-library/react'
import { Navbar } from '@/components/layout/navbar'
import { SessionProvider } from 'next-auth/react'

// Mock the session
const mockSession = {
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
  },
  expires: '2024-01-01',
}

const MockSessionProvider = ({ children, session = null }: any) => {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  )
}

describe('Navbar', () => {
  it('renders the navbar with logo', () => {
    render(
      <MockSessionProvider>
        <Navbar />
      </MockSessionProvider>
    )

    expect(screen.getByText('Fashion Marketplace')).toBeInTheDocument()
    expect(screen.getByText('FM')).toBeInTheDocument()
  })

  it('shows sign in button when not authenticated', () => {
    render(
      <MockSessionProvider session={null}>
        <Navbar />
      </MockSessionProvider>
    )

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('shows upload link when authenticated', () => {
    render(
      <MockSessionProvider session={mockSession}>
        <Navbar />
      </MockSessionProvider>
    )

    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('has proper navigation links', () => {
    render(
      <MockSessionProvider>
        <Navbar />
      </MockSessionProvider>
    )

    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search designs...')).toBeInTheDocument()
  })
})