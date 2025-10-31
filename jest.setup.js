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
// Create a small in-file mock session store so tests can set session via the
// mocked SessionProvider(session={...}) and have useSession() read it.
const _mockSessionStore = { data: null, status: 'unauthenticated' }
jest.mock('next-auth/react', () => {
  // import React if needed
  return {
    useSession: () => _mockSessionStore,
    signIn: jest.fn(),
    signOut: jest.fn(),
    SessionProvider: ({ children, session }) => {
      if (session) {
        _mockSessionStore.data = session
        _mockSessionStore.status = 'authenticated'
      } else {
        _mockSessionStore.data = null
        _mockSessionStore.status = 'unauthenticated'
      }
      return children
    },
  }
})

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.DATABASE_URL = 'file:./test.db'

// Polyfill minimal Web Request/Response/Headers for Next internals used in tests
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.input = input
      this.init = init
    }
  }
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {}
}
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {}
}

// Provide a lightweight global fetch mock so components that call fetch in
// useEffect (like the Navbar cart fetch) won't throw during tests. Tests can
// still override `global.fetch` with more specific behavior when needed.
if (typeof global.fetch === 'undefined') {
  // `jest` is available in the test environment; use jest.fn() to allow
  // assertions and per-test overrides.
  // Default to an empty cart response so components render quietly in tests.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ count: 0 }),
  })
}