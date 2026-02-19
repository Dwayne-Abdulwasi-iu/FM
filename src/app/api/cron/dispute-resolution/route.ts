import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runAutoResolutionBatch, getDisputeStats } from '@/lib/dispute-resolution'

/**
 * POST /api/cron/dispute-resolution
 * 
 * Automated dispute resolution cron job 
 * Runs every hour to check pending disputes and apply auto-resolution rules
 * 
 * Authorization: Bearer <CRON_SECRET>
 * 
 * Example:
 * curl -X POST https://yourdomain.com/api/cron/dispute-resolution \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
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

    console.log('[DISPUTE_CRON] Starting auto-resolution batch...')
    
    const startTime = Date.now()
    const result = await runAutoResolutionBatch()
    const duration = Date.now() - startTime

    console.log(`[DISPUTE_CRON] Completed in ${duration}ms:`, result)

    return NextResponse.json({
      success: true,
      ...result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DISPUTE_CRON] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to run auto-resolution',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/dispute-resolution
 * 
 * Retrieve dispute statistics for monitoring
 * 
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret using unified auth
    const auth = await verifyCronSecret(request)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.reason },
        { status: 401 }
      )
    }

    const stats = await getDisputeStats()

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DISPUTE_STATS] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to get dispute stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
