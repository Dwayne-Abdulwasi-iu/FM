import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { retryFailedTransfers } from '@/lib/transfer-service'

/**
 * GET /api/cron/retry-transfers
 * 
 * Background job to retry failed seller payout transfers
 * Call this endpoint periodically (e.g., every 5 minutes via external cron service)
 * 
 * Authorization: Bearer <CRON_SECRET>
 * 
 * Example:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *   http://localhost:3000/api/cron/retry-transfers
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
