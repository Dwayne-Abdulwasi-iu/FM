import { NextRequest, NextResponse } from 'next/server'
import { expireAndRestoreSubscriptions } from '@/lib/tier-management'
import { getRedisClient } from '@/lib/redis'

/**
 * GET /api/cron/subscriptions/expire
 * 
 * Check for expired Pro subscriptions and restore sellers to natural tier
 * Call this every hour via cron (e.g., Vercel Cron, GitHub Actions)
 * 
 * Security: Verify CRON_SECRET in Authorization header
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting: prevent running multiple times per hour
  try {
    const redis = getRedisClient()
    if (redis) {
      const lastRun = await redis.get('cron:subscriptions:expire:last_run').catch(() => null)
      if (lastRun) {
        return NextResponse.json({ 
          error: 'Cron already ran recently. Next execution in 1 hour.' 
        }, { status: 429 })
      }
      // Set cooldown for 1 hour
      await redis.setex('cron:subscriptions:expire:last_run', 3600, 'running')
    }
  } catch (_err) {
    console.warn('[Cron] Redis rate limit check failed, continuing anyway')
  }

  try {
    console.log('[Cron] Running subscription expiration check...')
    const result = await expireAndRestoreSubscriptions()
    
    console.log('[Cron] Expiration check complete:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Subscription expiration check completed',
      ...result
    })
  } catch (error) {
    console.error('[Cron] Subscription expiration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
