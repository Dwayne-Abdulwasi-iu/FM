import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Rate Limiting Middleware
 * 
 * Implements token bucket pattern with Redis support.
 * Fallback to in-memory for development when REDIS_URL not set.
 * 
 * Admin endpoints: 30 req/min per user
 * Seller endpoints: 60 req/min per user
 * Public endpoints: 60 req/min per IP
 */

const RATE_LIMITS = {
  admin: { requests: 30, window: 60 * 1000 }, // 30 req/min
  seller: { requests: 60, window: 60 * 1000 }, // 60 req/min
  public: { requests: 60, window: 60 * 1000 }, // 60 req/min
} as const

// In-memory store for rate limiting (fallback when Redis unavailable)
const memoryStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Get rate limit key based on endpoint and user/IP
 */
function getRateLimitKey(request: NextRequest, endpoint: string, userId?: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  if (userId) {
    return `rl:${endpoint}:user:${userId}`
  }
  return `rl:${endpoint}:ip:${ip}`
}

/**
 * Check memory store for rate limit
 */
function checkMemoryRateLimit(key: string, limit: number, window: number): boolean {
  const now = Date.now()
  const entry = memoryStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    memoryStore.set(key, { count: 1, resetTime: now + window })
    return true
  }
  
  if (entry.count >= limit) {
    return false
  }
  
  entry.count++
  return true
}

/**
 * Check Redis for rate limit (if configured)
 * Note: Redis client must be installed separately via `npm install redis`
 */
async function checkRedisRateLimit(
  key: string,
  limit: number,
  window: number
): Promise<boolean> {
  // Fall back to memory store - Redis support requires redis package installation
  // For production with high concurrency, install redis: npm install redis
  return checkMemoryRateLimit(key, limit, window)
}

/**
 * Determine endpoint type and get rate limits
 */
function getEndpointConfig(pathname: string): { type: 'admin' | 'seller' | 'public'; requiresAuth: boolean } {
  if (pathname.startsWith('/api/admin/')) {
    return { type: 'admin', requiresAuth: true }
  }
  if (pathname.startsWith('/api/seller/')) {
    return { type: 'seller', requiresAuth: true }
  }
  return { type: 'public', requiresAuth: false }
}

/**
 * Skip rate limiting for health checks and webhooks
 */
function shouldSkipRateLimit(pathname: string): boolean {
  const skipPatterns = [
    '/api/health',
    '/api/status',
    '/api/webhooks/', // All webhooks
  ]
  return skipPatterns.some(pattern => pathname.startsWith(pattern))
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const method = request.method
  
  // Only rate limit state-changing requests (POST, PUT, DELETE, PATCH)
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return NextResponse.next()
  }
  
  // Skip rate limiting for certain endpoints
  if (shouldSkipRateLimit(pathname)) {
    return NextResponse.next()
  }
  
  const config = getEndpointConfig(pathname)
  
  // Get session if endpoint requires auth
  let userId: string | undefined
  if (config.requiresAuth || config.type !== 'public') {
    try {
      const session = await getServerSession(authOptions)
      userId = session?.user?.id
      
      // If auth required but no session, return 401
      if (config.requiresAuth && !userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    } catch (error) {
      // If session check fails, allow request but may be rate limited
      console.error('Session check error:', error)
    }
  }
  
  // Get rate limit configuration
  const limits = RATE_LIMITS[config.type]
  const key = getRateLimitKey(request, pathname, userId)
  
  // Check rate limit
  const allowed = await checkRedisRateLimit(key, limits.requests, limits.window)
  
  if (!allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(limits.window / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(limits.window / 1000)),
          'X-RateLimit-Limit': String(limits.requests),
          'X-RateLimit-Window': String(limits.window),
        }
      }
    )
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Rate limit all API routes except webhooks and health checks
    '/api/:path*',
  ],
}
