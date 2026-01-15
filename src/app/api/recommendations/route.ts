import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  getPersonalizedRecommendations, 
  getSimilarDesigns 
} from '@/lib/recommendations'
import prisma from '@/lib/prisma'

/**
 * GET /api/recommendations
 * Get personalized design recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const searchParams = request.nextUrl.searchParams
    
    const type = searchParams.get('type') || 'personalized'
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50)
    const category = searchParams.get('category')
    const designId = searchParams.get('designId')  // For similar designs
    const excludeIds = searchParams.get('exclude')?.split(',').filter(Boolean) || []

    let recommendations

    if (type === 'similar' && designId) {
      // Get similar designs
      recommendations = await getSimilarDesigns(designId, limit)
    } else {
      // Get personalized recommendations
      recommendations = await getPersonalizedRecommendations({
        userId: session?.user?.id,
        limit,
        excludeIds,
        category: category || undefined
      })
    }

    // Fetch full design details for recommendations
    const designIds = recommendations.map(r => r.designId)
    
    const designs = await prisma.design.findMany({
      where: { id: { in: designIds } },
      select: {
        id: true,
        title: true,
        price: true,
        imageUrl: true,
        thumbnailUrl: true,
        category: true,
        tags: true,
        totalSales: true,
        featured: true,
        designer: {
          select: {
            id: true,
            name: true,
            image: true,
            isVerified: true,
            verificationBadge: true
          }
        },
        _count: {
          select: { reviews: true, favorites: true }
        }
      }
    })

    // Map designs to recommendations with scores and reasons
    const designMap = new Map(designs.map(d => [d.id, d]))
    
    const result = recommendations
      .map(rec => {
        const design = designMap.get(rec.designId)
        if (!design) return null
        
        return {
          ...design,
          recommendationScore: rec.score,
          recommendationReasons: rec.reasons
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      recommendations: result,
      type,
      personalized: !!session?.user?.id
    })

  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { message: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
