import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
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
        ,
        {
          designer: {
            username: { contains: searchTerm, mode: 'insensitive' }
          }
        }
      ]
    }

    if (category && category !== 'all') {
      where.category = category
    }

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
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
              username: true,
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
      prisma.design.count({ where }),
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
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}