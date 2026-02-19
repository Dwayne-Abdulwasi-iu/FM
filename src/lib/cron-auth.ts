import { NextRequest } from 'next/server'

/**
 * Unified cron job authentication helper
 * All cron endpoints should use this for consistent authorization
 * 
 * Expected header: Authorization: Bearer <CRON_SECRET>
 * CRON_SECRET env var must be set (e.g., 32 random bytes)
 * 
 * Usage:
 * const auth = await verifyCronSecret(request)
 * if (!auth.valid) {
 *   return NextResponse.json({ error: auth.reason }, { status: 401 })
 * }
 */

export interface CronAuthResult {
  valid: boolean
  reason?: string
}

export async function verifyCronSecret(request: NextRequest): Promise<CronAuthResult> {
  const cronSecret = process.env.CRON_SECRET

  // Allow in dev if no secret is configured
  if (!cronSecret) {
    console.warn('[CRON] CRON_SECRET not configured - cron authentication disabled (dev mode)')
    return { valid: true }
  }

  // Extract token from Authorization header
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.slice(7) // Remove "Bearer " prefix
    : null

  if (!token) {
    return {
      valid: false,
      reason: 'Missing Authorization header. Expected: Authorization: Bearer <CRON_SECRET>'
    }
  }

  // Check token validity
  if (token !== cronSecret) {
    return {
      valid: false,
      reason: 'Invalid CRON_SECRET'
    }
  }

  return { valid: true }
}

/**
 * Verify cron secret and return standardized error response if invalid
 * Use this in most cron endpoints as drop-in replacement for manual checks
 */
export async function requireCronAuth(request: NextRequest): Promise<boolean> {
  const auth = await verifyCronSecret(request)
  return auth.valid
}
