import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { prismaErrorResponse } from '@/lib/prismaError'
import crypto from 'crypto'
import redisHelper from '@/lib/redis'
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 20 // max requests per window per user

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ items: [], unreadCount: 0 })

    const url = new URL(request.url)
      const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
      const limit = Number(url.searchParams.get('limit') || 20)

      const where: any = { userId: session.user.id }
      if (unreadOnly) where.isRead = false

      // Prefer Redis-backed rate limiter when available
      const redis = redisHelper.getRedis()
      if (redis) {
        try {
          const key = `notif_rate:${session.user.id}`
          const count = await redis.incr(key)
          if (count === 1) {
            // set expiration window
            await redis.pexpire(key, RATE_LIMIT_WINDOW_MS)
          }
          if (count > RATE_LIMIT_MAX) {
            return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
          }
        } catch (e) {
          // if Redis fails, fall back to allowing the request
          console.error('Redis rate limiter error', e)
        }
      }

      const items = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit })
      const unreadCount = await prisma.notification.count({ where: { userId: session.user.id, isRead: false } })

      // Create a small payload for ETag generation (only fields that affect UI/state)
      const payload = {
        unreadCount,
        items: items.map((i) => ({ id: i.id, isRead: i.isRead, createdAt: i.createdAt }))
      }

      const etag = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex')
      const ifNone = request.headers.get('if-none-match')
      if (ifNone && ifNone === etag) {
        return new NextResponse(null, { status: 304 })
      }

      return NextResponse.json({ items, unreadCount }, { headers: { 'ETag': etag, 'Cache-Control': 'private, max-age=0, must-revalidate' } })
  } catch (err) {
    console.error('Notification GET error', err)
    const prismaResp = prismaErrorResponse(err, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json({ items: [], unreadCount: 0 }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, markRead } = body
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 })

    if (markRead) {
      await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { isRead: true } })
    } else {
      await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { isRead: false } })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Notification PATCH error', err)
    const prismaResp = prismaErrorResponse(err, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json({ message: 'Failed' }, { status: 500 })
  }
}
