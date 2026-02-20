// GET /api/cron/boutique-rating-aggregation - Recalculate all product ratings
// Call daily to refresh cached avgRating values

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { recalculateAllProductRatings } from '@/lib/boutique/rating';

/**
 * Cron job to recalculate all boutique product ratings
 * Refreshes the cached avgRating field based on approved reviews
 * Should be called daily
 * 
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const auth = await verifyCronSecret(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.reason }, { status: 401 });
    }

    // Recalculate all ratings
    const result = await recalculateAllProductRatings();

    return NextResponse.json({
      success: true,
      message: 'Product ratings recalculated',
      result,
    });

  } catch (error) {
    console.error('Rating aggregation cron error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
