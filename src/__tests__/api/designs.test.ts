/* eslint-disable @typescript-eslint/no-require-imports */

// Avoid importing next-auth internals (which pull in ESM-only deps like `jose`) by
// mocking next-auth server functions before loading the route handler.
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  design: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}))

const mockPrisma = require('@/lib/prisma')

// Require the route after mocks are registered so heavy deps are not loaded.
// Mock next/server responses used by Next route handlers to avoid loading
// Next internals in the test environment.
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: unknown) => ({ body, init }),
  },
}))

const { GET } = require('@/app/api/designs/route')

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

    // Use a minimal request-like object instead of NextRequest to avoid
    // pulling Next internals (cookies/edge runtime) into the test environment.
  const req = { url: 'http://localhost:3000/api/designs' } as unknown as { url: string }

  await GET(req)

    // The route uses a default limit of 12 and currently returns all designs
    // (no isActive filter). Assert against the actual call shape.
    expect(mockPrisma.design.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        mediaFiles: {
          select: {
            accessType: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 0,
      take: 12,
    })
  })

  it('filters designs by category', async () => {
  const req = { url: 'http://localhost:3000/api/designs?category=Fashion%20Illustrations' } as unknown as { url: string }

  await GET(req)

    expect(mockPrisma.design.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          category: 'Fashion Illustrations',
        },
      })
    )
  })
})