import { NextRequest, NextResponse } from 'next/server';
import { findSimilarDesigns, getPersonalizedRecommendations } from '@/lib/visual-search';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/designs/similar?designId=xxx
 * Get similar designs based on visual and metadata similarity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const designId = searchParams.get('designId');
    const type = searchParams.get('type') || 'similar'; // 'similar' or 'recommended'
    const limit = parseInt(searchParams.get('limit') || '12');

    // For recommendations, require authentication
    if (type === 'recommended') {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { message: 'Authentication required for recommendations' },
          { status: 401 }
        );
      }

      const recommendations = await getPersonalizedRecommendations(session.user.id, limit);
      
      return NextResponse.json({
        success: true,
        type: 'recommended',
        designs: recommendations,
        count: recommendations.length
      });
    }

    // For similar designs, require designId
    if (!designId) {
      return NextResponse.json(
        { message: 'designId parameter is required' },
        { status: 400 }
      );
    }

    const includeColorMatch = searchParams.get('colorMatch') !== 'false';
    const includeStyleMatch = searchParams.get('styleMatch') !== 'false';
    const minScore = parseFloat(searchParams.get('minScore') || '0.3');

    const similarDesigns = await findSimilarDesigns(designId, {
      limit,
      includeColorMatch,
      includeStyleMatch,
      includeCategoryMatch: true,
      minScore
    });

    return NextResponse.json({
      success: true,
      type: 'similar',
      sourceDesignId: designId,
      designs: similarDesigns,
      count: similarDesigns.length
    });

  } catch (error) {
    console.error('Error finding similar designs:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to find similar designs',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
