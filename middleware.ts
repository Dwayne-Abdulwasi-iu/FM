import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter (per process). Suitable for small deployments.
// For distributed production, replace with Redis or another shared store.

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 60 // per IP per window

// Map<ip, Array<number>> of request timestamps
const buckets = new Map<string, number[]>()

function getIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  // fallback for local/dev
  return '127.0.0.1'
}

export function middleware(req: NextRequest) {
  // Only enforce in production
  if (process.env.NODE_ENV !== 'production') return NextResponse.next()

  const { pathname } = req.nextUrl

  // Only rate limit API routes, excluding health/status
  if (!pathname.startsWith('/api')) return NextResponse.next()
  if (pathname.startsWith('/api/health') || pathname.startsWith('/api/status')) {
    return NextResponse.next()
  }

  const now = Date.now()
  const ip = getIp(req)
  const list = buckets.get(ip) || []
  // prune window
  const fresh = list.filter((ts) => now - ts < WINDOW_MS)
  fresh.push(now)
  buckets.set(ip, fresh)

  if (fresh.length > MAX_REQUESTS) {
    const res = NextResponse.json(
      { message: 'Too many requests. Please slow down.' },
      { status: 429 }
    )
    res.headers.set('Retry-After', '60')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
