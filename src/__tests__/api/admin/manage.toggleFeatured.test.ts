import { POST } from '@/app/api/admin/designs/manage/route'

// Mock next/server to avoid Request/NextResponse runtime imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, opts?: any) => ({ status: (opts && opts.status) || 200, body: data })
  },
  NextRequest: class {}
}))

// Mock next-auth getServerSession
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

// Mock next/cache revalidatePath
const mockRevalidate = jest.fn()
jest.mock('next/cache', () => ({ revalidatePath: (p: string) => mockRevalidate(p) }))

// Prepare Prisma mocks
const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    design: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args),
    }
  }
}))

import { getServerSession } from 'next-auth'

describe('POST /api/admin/designs/manage toggleFeatured', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { role: 'ADMIN', email: 'admin@example.com' } })
  })

  it('adds featured tag when missing', async () => {
    mockFindUnique.mockResolvedValue({ id: 'd1', tags: [] })
    mockUpdate.mockResolvedValue({ id: 'd1', tags: ['featured'] })

    const req = { json: async () => ({ designId: 'd1', action: 'toggleFeatured' }) } as any
    const res: any = await POST(req)

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'd1' } })
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'd1' },
      data: { tags: ['featured'] }
    }))
    expect(res.status).toBe(200)
  })

  it('removes featured tag when present', async () => {
    mockFindUnique.mockResolvedValue({ id: 'd2', tags: ['featured', 'sale'] })
    mockUpdate.mockResolvedValue({ id: 'd2', tags: ['sale'] })

    const req = { json: async () => ({ designId: 'd2', action: 'toggleFeatured' }) } as any
    const res: any = await POST(req)

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'd2' } })
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'd2' },
      data: { tags: ['sale'] }
    }))
    expect(res.status).toBe(200)
  })
})
