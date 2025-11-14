/**
 * @jest-environment node
 */
import { GET, PATCH } from '@/app/api/notifications/route'

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  }
}))

// Mock next-auth getServerSession
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const mockPrisma = jest.requireMock('@/lib/prisma') as {
  notification: { findMany: jest.Mock; count: jest.Mock; updateMany: jest.Mock }
}
const { getServerSession } = jest.requireMock('next-auth') as { getServerSession: jest.Mock }

describe('/api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET calls prisma.findMany and count for authenticated user', async () => {
    const mockItems = [
      { id: 'n1', title: 'T1', message: 'm', isRead: false, createdAt: new Date().toISOString() }
    ]
    mockPrisma.notification.findMany.mockResolvedValue(mockItems)
    mockPrisma.notification.count.mockResolvedValue(1)
    getServerSession.mockResolvedValue({ user: { id: 'u1' } })

    const req = { url: 'http://localhost/api/notifications?limit=5', headers: new Headers() } as unknown as Request
    await GET(req as unknown as import('next/server').NextRequest)

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }), take: 5 }))
    expect(mockPrisma.notification.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'u1', isRead: false }) }))
  })

  it('PATCH marks notification read and unread for authenticated user', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1' } })

    // mark read
    const reqRead = { json: async () => ({ id: 'n1', markRead: true }) } as unknown as import('next/server').NextRequest
    await PATCH(reqRead)
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({ where: { id: 'n1', userId: 'u1' }, data: { isRead: true } })

    jest.clearAllMocks()
    getServerSession.mockResolvedValue({ user: { id: 'u1' } })

    // mark unread
    const reqUnread = { json: async () => ({ id: 'n1', markRead: false }) } as unknown as import('next/server').NextRequest
    await PATCH(reqUnread)
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({ where: { id: 'n1', userId: 'u1' }, data: { isRead: false } })
  })
})
