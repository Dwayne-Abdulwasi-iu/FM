import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  usePathname: () => '',
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.DATABASE_URL = 'file:./test.db'

// Provide a basic fetch mock to avoid console noise from components that
// optimistically fetch in client effects (e.g., Navbar cart count)
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ count: 0 }),
  }))
}

// Silence non-fatal React "not wrapped in act(...)" warnings in tests
// that come from components with background effects (we still keep other
// console.error output intact).
const _origConsoleError = console.error
console.error = (...args) => {
  try {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
    if (/not wrapped in act\(\.\.\.\)/i.test(msg) || /not wrapped in act\(/i.test(msg)) {
      return
    }
  } catch {
    // fall through to original
  }
  _origConsoleError.apply(console, args)
}