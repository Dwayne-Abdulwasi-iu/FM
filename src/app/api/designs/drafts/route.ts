import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const MAX_LIMIT = 50

/**
 * GET /api/designs/drafts
 * Get current user's draft designs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to view drafts' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), MAX_LIMIT)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    const [drafts, total] = await Promise.all([
      prisma.design.findMany({
        where: {
          designerId: userId,
          isDraft: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          ownershipPrice: true,
          imageUrl: true,
          thumbnailUrl: true,
          category: true,
          tags: true,
          buyingTypes: true,
          stockType: true,
          stockQuantity: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.design.count({
        where: {
          designerId: userId,
          isDraft: true
        }
      })
    ])

    return NextResponse.json({
      drafts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Get drafts error:', error)
    return NextResponse.json(
      { message: 'Failed to get drafts' },
      { status: 500 }
    )
  }
}
