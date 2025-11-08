/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { POST } from '@/app/api/auth/reset/route'

jest.mock('@/lib/prisma', () => {
  const mock = {
    user: { update: jest.fn() },
    passwordResetToken: { findUnique: jest.fn(), update: jest.fn() }
  }
  return { __esModule: true, default: mock }
})

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed') }))

const mockPrisma = jest.requireMock('@/lib/prisma').default as any

describe('/api/auth/reset', () => {
  beforeEach(() => jest.clearAllMocks())

  it('resets password when token valid', async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({ token: 't1', userId: 'u1', used: false, expiresAt: future })
    const req = { json: async () => ({ token: 't1', password: 'newpass' }) } as unknown as Request
    const res = await POST(req as any)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { password: 'hashed' } })
    expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({ where: { token: 't1' }, data: { used: true } })
    const body = await res.json()
    expect(body.ok).toBeTruthy()
  })
})
