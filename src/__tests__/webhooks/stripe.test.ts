/* eslint-disable @typescript-eslint/no-require-imports */

// Mock Stripe to avoid creating a real client during tests
jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn(() => { throw new Error('invalid signature') })
    }
  }))
}))

// Mock NextResponse to a lightweight shape used by route handlers
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: unknown) => ({ body, init })
  }
}))

const { POST } = require('@/app/api/webhooks/stripe/route')

describe('Stripe webhook handler', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns 400 when signature verification fails', async () => {
    const req = {
      text: async () => JSON.stringify({ id: 'evt_test' }),
      headers: { get: () => 'bad_sig' }
    } as unknown as { text: () => Promise<string>; headers: { get: (k: string) => string | null } }

    const res = await POST(req)

    expect(res).toBeDefined()
    // Our mocked NextResponse.json returns { body, init }
    expect(res.init).toBeDefined()
    expect(res.init.status).toBe(400)
    expect(res.body).toEqual(expect.objectContaining({ message: 'Webhook signature verification failed' }))
  })
})
