import { NextRequest, NextResponse } from 'next/server'
import { runAutoResolutionBatch, getDisputeStats } from '@/lib/dispute-resolution'

/**
 * Cron endpoint for automated dispute resolution
 * 
 * Should be called every hour to check pending disputes and apply
 * auto-resolution rules where applicable.
 * 
 * Example: Set up a cron job to call this endpoint hourly
 * 0 * * * * curl -X POST https://yourdomain.com/api/cron/dispute-resolution
 */

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = authHeader?.replace('Bearer ', '')
    
    // Allow if cron secret matches OR if no secret is configured (dev mode)
    if (CRON_SECRET && cronSecret !== CRON_SECRET) {
      return NextResponse.json(
        { message: 'Unauthorized' },
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
 * GET endpoint to retrieve dispute statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization for stats access
    const authHeader = request.headers.get('authorization')
    const cronSecret = authHeader?.replace('Bearer ', '')
    
    if (CRON_SECRET && cronSecret !== CRON_SECRET) {
      return NextResponse.json(
        { message: 'Unauthorized' },
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
