import { NextResponse } from 'next/server'
import redisHelper from '@/lib/redis'

// Dev-only diagnostic endpoint to show whether Redis is enabled and connected.
// Returns 404 when NODE_ENV=production to avoid exposing infra details.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not available in production' }, { status: 404 })
  }

  try {
    const enabled = redisHelper.isRedisEnabled
    const connected = redisHelper.isRedisConnected()
    return NextResponse.json({ isRedisEnabled: enabled, isRedisConnected: connected })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
