/* eslint-disable @typescript-eslint/no-require-imports */

// Mock Prisma to avoid DB calls in tests
jest.mock('@/lib/prisma', () => ({
  order: { create: jest.fn() },
  sellerEarning: { create: jest.fn() },
  design: { update: jest.fn() },
  purchase: { create: jest.fn() },
  sellerAccount: { findUnique: jest.fn(), update: jest.fn() },
  cartItem: { deleteMany: jest.fn() }
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: unknown) => ({ body, init })
  }
}))

const nodeCrypto = require('crypto')
const { POST: postHandler } = require('@/app/api/webhooks/paystack/route')

describe('Paystack webhook handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PAYSTACK_SECRET_KEY = 'test_secret'
  })

  it('returns 400 when no signature provided', async () => {
    const body = JSON.stringify({})
    const req = { text: async () => body, headers: { get: () => null } } as unknown as { text: () => Promise<string>; headers: { get: (k: string) => string | null } }

    const res = await postHandler(req)
    expect(res.init.status).toBe(400)
    expect(res.body).toEqual(expect.objectContaining({ message: 'No signature' }))
  })

  it('returns 400 for invalid signature', async () => {
    const body = JSON.stringify({})
    const sig = 'invalid'
    const req = { text: async () => body, headers: { get: () => sig } } as unknown as { text: () => Promise<string>; headers: { get: (k: string) => string | null } }

    const res = await postHandler(req)
    expect(res.init.status).toBe(400)
    expect(res.body).toEqual(expect.objectContaining({ message: 'Invalid signature' }))
  })

  it('returns 400 when metadata missing required fields', async () => {
    const payload = { event: 'charge.success', data: { reference: 'ref1', amount: 100, currency: 'NGN', metadata: {} } }
    const body = JSON.stringify(payload)
    const signature = nodeCrypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex')
    const req = { text: async () => body, headers: { get: () => signature } } as unknown as { text: () => Promise<string>; headers: { get: (k: string) => string | null } }

    const res = await postHandler(req)
    expect(res.init.status).toBe(400)
    expect(res.body).toEqual(expect.objectContaining({ message: 'Invalid metadata' }))
  })
})
