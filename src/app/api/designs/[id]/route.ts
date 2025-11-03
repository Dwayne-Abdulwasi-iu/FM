import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const design = await prisma.design.findUnique({
      where: {
        id: params.id,
      },
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            bio: true,
            image: true,
            isVerified: true
          }
        },
        mediaFiles: {
          orderBy: {
            sortOrder: 'asc'
          }
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            reviews: true,
            favorites: true
          }
        }
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    // Gate access for exclusive (owned) designs: only admin or the buyer (ownedBy) can view
    if (design.isOwned) {
      const session = await getServerSession(authOptions)
      const userId = session?.user?.id
      const isAdmin = session?.user?.role === 'ADMIN'
      const isOwner = userId && design.ownedBy && userId === design.ownedBy
      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { message: 'Design not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json({ design })

  } catch (error) {
    console.error('Fetch design error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}