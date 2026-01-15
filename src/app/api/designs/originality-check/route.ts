import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  checkDesignOriginality, 
  quickOriginalityCheck, 
  isOriginalityCheckConfigured 
} from '@/lib/originality-check';

/**
 * POST /api/designs/originality-check
 * Check if a design image is original
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if originality service is configured
    if (!isOriginalityCheckConfigured()) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'Originality check is not configured. Skipping verification.',
        result: {
          isOriginal: true,
          confidence: 100,
          flags: [],
          similarImages: [],
          recommendation: 'approve',
          details: 'Originality verification not configured'
        }
      });
    }

    const body = await request.json();
    const { imageUrl, mode = 'quick', strictMode = false } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { message: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // Quick check for obvious issues
    if (mode === 'quick') {
      const quickResult = await quickOriginalityCheck(imageUrl);
      
      return NextResponse.json({
        success: true,
        mode: 'quick',
        result: {
          pass: quickResult.pass,
          reason: quickResult.reason,
          isOriginal: quickResult.pass,
          confidence: quickResult.pass ? 80 : 30,
          recommendation: quickResult.pass ? 'approve' : 'review'
        }
      });
    }

    // Full originality check
    const result = await checkDesignOriginality(imageUrl, {
      strictMode,
      checkStockSites: true,
      checkSocialMedia: false
    });

    return NextResponse.json({
      success: true,
      mode: 'full',
      configured: true,
      result: {
        isOriginal: result.isOriginal,
        confidence: result.confidence,
        flags: result.flags,
        similarImages: result.similarImages.slice(0, 5), // Limit to 5 results
        recommendation: result.recommendation,
        details: result.details
      }
    });

  } catch (error) {
    console.error('Originality check error:', error);
    
    // Return permissive result on error (don't block uploads)
    return NextResponse.json({
      success: true,
      error: true,
      message: 'Originality check failed, proceeding with caution',
      result: {
        isOriginal: true,
        confidence: 50,
        flags: [{
          type: 'high_similarity',
          severity: 'info',
          message: 'Could not complete originality verification'
        }],
        similarImages: [],
        recommendation: 'review',
        details: 'Manual review recommended due to verification error'
      }
    });
  }
}

/**
 * GET /api/designs/originality-check/status
 * Check if originality verification is available
 */
export async function GET() {
  const configured = isOriginalityCheckConfigured();
  
  return NextResponse.json({
    configured,
    providers: {
      tineye: !!process.env.TINEYE_API_KEY,
      googleVision: !!process.env.GOOGLE_VISION_API_KEY
    },
    message: configured 
      ? 'Originality verification is available'
      : 'Configure TINEYE_API_KEY or GOOGLE_VISION_API_KEY to enable'
  });
}
