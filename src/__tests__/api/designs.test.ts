import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/designs/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  design: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}))

const mockPrisma = require('@/lib/prisma')

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

    const req = new NextRequest('http://localhost:3000/api/designs')

    const response = await GET(req)

    expect(mockPrisma.design.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 0,
      take: 20,
    })
  })

  it('filters designs by category', async () => {
    const req = new NextRequest('http://localhost:3000/api/designs?category=Fashion%20Illustrations')

    const response = await GET(req)

    expect(mockPrisma.design.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          category: 'Fashion Illustrations',
        },
      })
    )
  })
})