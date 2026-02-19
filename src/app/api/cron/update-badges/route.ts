import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { updateAllSellerBadges } from '@/lib/badge-service'

/**
 * POST /api/cron/update-badges
 * 
 * Cron job to update all seller badges and tiers based on sales metrics
 * Should be called daily (e.g., via Vercel Cron, Render Cron, or external scheduler)
 * 
 * Authorization: Bearer <CRON_SECRET>
 * 
 * Example:
 * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *   http://localhost:3000/api/cron/update-badges
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret using unified auth
    const auth = await verifyCronSecret(request)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.reason },
        { status: 401 }
      )
    }

    const result = await updateAllSellerBadges()

    return NextResponse.json({
      message: 'Badge update complete',
      updated: result.updated,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron update badges error:', error)
    return NextResponse.json(
      { message: 'Failed to update badges' },
      { status: 500 }
    )
  }
}
