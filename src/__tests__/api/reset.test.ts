/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { POST } from '@/app/api/auth/reset-password-otp/route'

jest.mock('@/lib/prisma', () => {
  const mock = {
    user: { update: jest.fn(), findUnique: jest.fn() },
    passwordResetToken: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() }
  }
  return { __esModule: true, default: mock }
})

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed') }))

const mockPrisma = jest.requireMock('@/lib/prisma').default as any

describe('/api/auth/reset', () => {
  beforeEach(() => jest.clearAllMocks())

  it('resets password when OTP valid', async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60)
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
    mockPrisma.passwordResetToken.findFirst.mockResolvedValue({ id: 'pt1', userId: 'u1', token: 'hashed-otp', used: false, expiresAt: future })
    const req = { json: async () => ({ email: 'a@b.com', otp: '123456', password: 'newpass' }) } as unknown as Request
    const res = await POST(req as any)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { password: 'hashed' } })
    expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({ where: { id: 'pt1' }, data: { used: true } })
    const body = await res.json()
    expect(body.ok).toBeTruthy()
  })
})
