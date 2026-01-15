import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Maximum limit to prevent memory exhaustion
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '12', 10)), MAX_LIMIT)
    const category = searchParams.get('category')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        designs: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
        message: 'Search query must be at least 2 characters'
      })
    }

    const skip = (page - 1) * limit
    const searchTerm = query.trim()

    const where: Record<string, unknown> = {
      isActive: true,
      approvalStatus: 'APPROVED',
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
        {
          designer: {
            name: { contains: searchTerm, mode: 'insensitive' }
          }
        }
      ]
    }

    if (category && category !== 'all') {
      where.category = category
    }

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where: (where as any) /* eslint-disable-line @typescript-eslint/no-explicit-any */,
        skip,
        take: limit,
        orderBy: [
          { totalSales: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          designer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
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
      }),
      prisma.design.count({ where: (where as any) /* eslint-disable-line @typescript-eslint/no-explicit-any */ }),
    ])

    return NextResponse.json({
      designs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      searchTerm,
      resultsCount: designs.length
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}