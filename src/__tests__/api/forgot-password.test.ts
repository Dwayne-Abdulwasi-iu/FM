/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { POST } from '@/app/api/auth/forgot-password/route'

jest.mock('@/lib/prisma', () => {
  const mock = {
    user: { findUnique: jest.fn() },
    passwordResetToken: { create: jest.fn() }
  }
  return { __esModule: true, default: mock }
})

jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: jest.fn() })
}))

// Ensure internal mail wrapper is mocked so tests don't perform network fetches
jest.mock('@/lib/mail', () => ({
  sendMail: jest.fn().mockResolvedValue({ ok: true })
}))

const mockPrisma = jest.requireMock('@/lib/prisma').default as any

describe('/api/auth/forgot-password', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates token and returns ok when user exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' })
    const req = { json: async () => ({ email: 'a@b.com' }) } as unknown as Request
    const res = await POST(req as any)
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled()
    // response should be ok
    const body = await res.json()
    expect(body.ok).toBeTruthy()
  })

  it('returns ok even when user does not exist (no enumeration)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const req = { json: async () => ({ email: 'missing@example.com' }) } as unknown as Request
    const res = await POST(req as any)
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.ok).toBeTruthy()
  })
})
