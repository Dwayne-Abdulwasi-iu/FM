/**
 * @jest-environment node
 */
// import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/designs/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  design: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}))

const mockPrisma = jest.requireMock('@/lib/prisma') as {
  design: { findMany: jest.Mock; count: jest.Mock }
}

describe('/api/designs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns designs with pagination', async () => {
    const mockDesigns = [
      {
        id: '1',
        title: 'Test Design',
        price: 29.99,
        imageUrl: 'test.jpg',
        designer: { id: '1', name: 'Test Designer' },
        _count: { reviews: 0 },
      },
    ]

    mockPrisma.design.findMany.mockResolvedValue(mockDesigns)
    mockPrisma.design.count.mockResolvedValue(1)

    const req = { url: 'http://localhost:3000/api/designs' } as unknown as Request

  await GET(req as unknown as import('next/server').NextRequest)

    expect(mockPrisma.design.findMany).toHaveBeenCalled()
    expect(mockPrisma.design.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 12,
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it('filters designs by category', async () => {
    const req = { url: 'http://localhost:3000/api/designs?category=Fashion%20Illustrations' } as unknown as Request

  await GET(req as unknown as import('next/server').NextRequest)

    expect(mockPrisma.design.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'Fashion Illustrations',
        }),
      })
    )
  })
})