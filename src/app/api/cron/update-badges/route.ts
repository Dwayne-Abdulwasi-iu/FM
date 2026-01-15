import { NextRequest, NextResponse } from 'next/server'
import { updateAllSellerBadges } from '@/lib/badge-service'

/**
 * POST /api/cron/update-badges
 * Cron job to update all seller badges and tiers
 * Should be called daily (e.g., via Vercel Cron or external scheduler)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { message: 'Unauthorized' },
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
