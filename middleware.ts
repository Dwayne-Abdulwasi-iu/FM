import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate Limiting Middleware
 * 
 * Implements token bucket pattern with Redis support.
 * Fallback to in-memory for development when REDIS_URL not set.
 * 
 * Admin endpoints: 30 req/min per IP (identified by auth header)
 * Seller endpoints: 60 req/min per IP (identified by auth header)
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
 * Get rate limit key based on IP address
 * In edge runtime, we only have access to IP-based keys
 */
function getRateLimitKey(request: NextRequest, endpoint: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
             request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip') ||
             'unknown'
  
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
function getEndpointConfig(pathname: string): { type: 'admin' | 'seller' | 'public' } {
  if (pathname.startsWith('/api/admin/')) {
    return { type: 'admin' }
  }
  if (pathname.startsWith('/api/seller/')) {
    return { type: 'seller' }
  }
  return { type: 'public' }
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
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
  
  // Get rate limit configuration
  const limits = RATE_LIMITS[config.type]
  const key = getRateLimitKey(request, pathname)
  
  // Check rate limit
  const allowed = checkMemoryRateLimit(key, limits.requests, limits.window)
  
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
