import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/designers/featured
 * Get featured/top designers for homepage
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20)
    const category = searchParams.get('category')

    // Build where clause for designers with designs
    const designWhere: Record<string, unknown> = {
      isActive: true,
      approvalStatus: 'APPROVED',
      isDraft: false
    }

    if (category) {
      designWhere.category = category
    }

    // Get top designers based on sales and ratings
    const featuredDesigners = await prisma.user.findMany({
      where: {
        role: { in: ['SELLER', 'ADMIN'] },
        designs: {
          some: designWhere
        }
      },
      orderBy: [
        { isVerified: 'desc' },
        { totalSales: 'desc' },
        { avgRating: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        displayName: true,
        image: true,
        bio: true,
        isVerified: true,
        verificationBadge: true,
        designerTier: true,
        avgRating: true,
        totalSales: true,
        specialties: true,
        location: true,
        _count: {
          select: {
            designs: {
              where: designWhere
            },
            followers: true
          }
        },
        designs: {
          where: designWhere,
          orderBy: { totalSales: 'desc' },
          take: 4,
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            imageUrl: true,
            price: true
          }
        }
      }
    })

    // Format response
    const designers = featuredDesigners.map(designer => ({
      id: designer.id,
      name: designer.displayName || designer.name,
      image: designer.image,
      bio: designer.bio?.slice(0, 120) + (designer.bio && designer.bio.length > 120 ? '...' : ''),
      isVerified: designer.isVerified,
      verificationBadge: designer.verificationBadge,
      designerTier: designer.designerTier,
      avgRating: Math.round(designer.avgRating * 10) / 10,
      totalSales: designer.totalSales,
      specialties: designer.specialties,
      location: designer.location,
      designCount: designer._count.designs,
      followerCount: designer._count.followers,
      featuredWorks: designer.designs.map(d => ({
        id: d.id,
        title: d.title,
        image: d.thumbnailUrl || d.imageUrl,
        price: d.price
      }))
    }))

    return NextResponse.json({ designers })

  } catch (error) {
    console.error('Get featured designers error:', error)
    return NextResponse.json(
      { message: 'Failed to get featured designers' },
      { status: 500 }
    )
  }
}
