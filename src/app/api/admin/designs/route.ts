import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Maximum page size to prevent memory exhaustion
const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse pagination parameters
    const { searchParams } = new URL(request.url)
    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? DEFAULT_PAGE_SIZE : Math.min(limitParam, MAX_PAGE_SIZE)
    const skip = (page - 1) * limit
    const search = searchParams.get('search') || ''
    const onlyNotFeatured = searchParams.get('onlyNotFeatured') === 'true'

    // Build filter
    const where: any = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { designer: { name: { contains: search, mode: 'insensitive' } } },
        { designer: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Parallel fetch: designs and total count
    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        skip,
        take: limit,
        where,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          designer: {
            select: {
              id: true,
              name: true,
              email: true,
              displayName: true
            }
          },
          featuredInList: {
            select: {
              id: true
            },
            take: 1
          }
        }
      }),
      prisma.design.count({ where })
    ])

    // Map designs to include isFeatured flag and filter if needed
    let designsWithFeatured = designs.map(design => ({
      ...design,
      isFeatured: design.featuredInList.length > 0
    }))

    if (onlyNotFeatured) {
      designsWithFeatured = designsWithFeatured.filter(d => !d.isFeatured)
    }

    return NextResponse.json({ 
      designs: designsWithFeatured.map(d => {
        const { featuredInList, ...rest } = d
        return rest
      }),
      items: designsWithFeatured.map(d => {
        const { featuredInList, ...rest } = d
        return rest
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching designs:', error)

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: 'Database temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch designs. Please try again later.' },
      { status: 500 }
    )
  }
}