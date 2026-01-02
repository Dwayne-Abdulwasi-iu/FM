import { NextRequest, NextResponse } from 'next/server'
import { retryFailedTransfers } from '@/lib/transfer-service'

/**
 * Background job to retry failed transfers
 * Call this endpoint periodically (e.g., every 5 minutes via external cron service)
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cron] Starting retry failed transfers job')
    const startTime = Date.now()

    await retryFailedTransfers()

    const duration = Date.now() - startTime
    console.log(`[Cron] Retry job completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Retry job completed',
      duration: `${duration}ms`
    })
  } catch (error) {
    console.error('[Cron] Retry job error:', error)
    return NextResponse.json(
      {
        error: 'Job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
