import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'ok',
    redis: process.env.REDIS_URL ? 'configured' : 'not-configured',
  };

  // Check Redis availability (required for Pro Trial feature)
  const redis = getRedisClient();
  if (process.env.REDIS_URL && !redis) {
    health.redis = 'failed';
    health.warnings = ['Redis configured but not accessible - Pro Trial feature may fail'];
    return NextResponse.json(health, { status: 503 });
  }

  return NextResponse.json(health, { status: 200 });
}
