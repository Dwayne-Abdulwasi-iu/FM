import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const MAX_LIMIT = 50

/**
 * GET /api/designers/[id]
 * Get designer portfolio and public profile
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const designerId = params.id

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), MAX_LIMIT)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    // Get designer profile
    const designer = await prisma.user.findUnique({
      where: { id: designerId },
      select: {
        id: true,
        name: true,
        displayName: true,
        image: true,
        coverImage: true,
        bio: true,
        website: true,
        location: true,
        socialLinks: true,
        specialties: true,
        experience: true,
        education: true,
        achievements: true,
        portfolioUrl: true,
        isVerified: true,
        verificationBadge: true,
        designerTier: true,
        avgRating: true,
        totalSales: true,
        profileViews: true,
        createdAt: true,
        _count: {
          select: {
            designs: {
              where: {
                isActive: true,
                approvalStatus: 'APPROVED',
                isDraft: false
              }
            },
            reviews: true,
            followers: true,
            following: true
          }
        }
      }
    })

    if (!designer) {
      return NextResponse.json(
        { message: 'Designer not found' },
        { status: 404 }
      )
    }

    // Get designer's public designs
    const [designs, totalDesigns] = await Promise.all([
      prisma.design.findMany({
        where: {
          designerId,
          isActive: true,
          approvalStatus: 'APPROVED',
          isDraft: false
        },
        orderBy: [
          { featured: 'desc' },
          { totalSales: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          price: true,
          ownershipPrice: true,
          imageUrl: true,
          thumbnailUrl: true,
          category: true,
          tags: true,
          viewCount: true,
          totalSales: true,
          featured: true,
          createdAt: true,
          _count: {
            select: {
              reviews: true,
              favorites: true
            }
          }
        }
      }),
      prisma.design.count({
        where: {
          designerId,
          isActive: true,
          approvalStatus: 'APPROVED',
          isDraft: false
        }
      })
    ])

    // Get recent reviews for designer's work
    const recentReviews = await prisma.review.findMany({
      where: {
        design: {
          designerId
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: {
            name: true,
            image: true
          }
        },
        design: {
          select: {
            title: true,
            thumbnailUrl: true
          }
        }
      }
    })

    // Increment profile views (fire and forget)
    prisma.user.update({
      where: { id: designerId },
      data: { profileViews: { increment: 1 } }
    }).catch(() => {})  // Ignore errors

    // Calculate stats
    const stats = {
      totalDesigns: designer._count.designs,
      totalSales: designer.totalSales,
      avgRating: Math.round(designer.avgRating * 10) / 10,
      totalReviews: designer._count.reviews,
      followers: designer._count.followers,
      following: designer._count.following,
      memberSince: designer.createdAt
    }

    return NextResponse.json({
      designer: {
        id: designer.id,
        name: designer.displayName || designer.name,
        image: designer.image,
        coverImage: designer.coverImage,
        bio: designer.bio,
        website: designer.website,
        location: designer.location,
        socialLinks: designer.socialLinks,
        specialties: designer.specialties,
        experience: designer.experience,
        education: designer.education,
        achievements: designer.achievements,
        portfolioUrl: designer.portfolioUrl,
        isVerified: designer.isVerified,
        verificationBadge: designer.verificationBadge,
        designerTier: designer.designerTier
      },
      stats,
      designs,
      recentReviews,
      pagination: {
        total: totalDesigns,
        limit,
        offset,
        hasMore: offset + limit < totalDesigns
      }
    })

  } catch (error) {
    console.error('Get designer error:', error)
    return NextResponse.json(
      { message: 'Failed to get designer profile' },
      { status: 500 }
    )
  }
}
