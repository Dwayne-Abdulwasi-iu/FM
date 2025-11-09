/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { POST } from '@/app/api/auth/resend-reset-code/route'

jest.mock('@/lib/prisma', () => {
  const mock = {
    user: { findUnique: jest.fn() },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn() }
  }
  return { __esModule: true, default: mock }
})

jest.mock('@/lib/mail', () => ({ sendMail: jest.fn().mockResolvedValue({ ok: true }) }))

// Provide a simple redis mock that keeps counts in-memory
jest.mock('@/lib/redis', () => ({
  getRedis: jest.fn()
}))

const mockPrisma = jest.requireMock('@/lib/prisma').default
const mockRedisHelper = jest.requireMock('@/lib/redis')

describe('/api/auth/resend-reset-code', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('allows a single resend then rate-limits (in-memory fallback)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
    mockPrisma.passwordResetToken.updateMany.mockResolvedValue({})
    mockPrisma.passwordResetToken.create.mockResolvedValue({})
    mockRedisHelper.getRedis.mockReturnValue(null)

  const req: Partial<Request> = { json: async () => ({ email: 'a@b.com' }), headers: new Headers() }

  const first = await POST(req as any)
    const body1 = await first.json()
    expect(body1.ok).toBeTruthy()
    expect(body1.cooldownSeconds).toBeGreaterThan(0)

  const second = await POST(req as any)
    const body2 = await second.json()
    expect(second.status).toBe(429)
    expect(body2.cooldownSeconds).toBeGreaterThan(0)
  })

  it('uses redis when present and enforces limit', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2' })
    mockPrisma.passwordResetToken.updateMany.mockResolvedValue({})
    mockPrisma.passwordResetToken.create.mockResolvedValue({})

    // Redis fake: simple map per key
    const store = new Map<string, number>()
    const redisMock = {
      incr: jest.fn(async (k: string) => { const v = (store.get(k) || 0) + 1; store.set(k, v); return v }),
      pexpire: jest.fn(async () => true)
    }
    mockRedisHelper.getRedis.mockReturnValue(redisMock)

  const req: Partial<Request> = { json: async () => ({ email: 'b@b.com' }), headers: new Headers() }
  const first = await POST(req as any)
    const body1 = await first.json()
    expect(body1.ok).toBeTruthy()
    expect(body1.cooldownSeconds).toBeGreaterThan(0)

  const second = await POST(req as any)
    const body2 = await second.json()
    expect(second.status).toBe(429)
    expect(body2.cooldownSeconds).toBeGreaterThan(0)
  })
})
