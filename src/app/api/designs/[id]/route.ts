import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
            isVerified: true,
            designerTier: true,
            role: true,
            // Commission settings
            acceptsCommissions: true,
            commissionStatus: true,
            commissionMinBudget: true,
            commissionMaxBudget: true,
            commissionTurnaround: true,
            commissionTypes: true,
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

    // For now, allow viewing of pending designs for testing
    // In production, you might want to restrict this to admins or design owners
    // if (!design.isActive && design.approvalStatus !== 'APPROVED') {
    //   return NextResponse.json(
    //     { message: 'Design not found' },
    //     { status: 404 }
    //   )
    // }

    return NextResponse.json({ design })

  } catch (error) {
    console.error('Fetch design error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}