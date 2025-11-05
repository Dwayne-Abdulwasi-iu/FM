// Lightweight in-memory pub/sub for server-sent events (SSE).
// Note: This is best-effort and only works for single-process deployments.
// For multi-instance or serverless, replace with Redis/NGINX pubsub or another shared broker.

type NotifCallback = (payload: unknown) => void

import redisHelper from '@/lib/redis'

const subscribers = new Map<string, Set<NotifCallback>>()

export function subscribe(userId: string, cb: NotifCallback) {
  // If Redis is enabled, create a dedicated subscriber client for this callback
  if (redisHelper.isRedisEnabled) {
    const channel = `notifications:${userId}`
    const subPromise = redisHelper.createSubscriber()
    let subClient: unknown = null
    subPromise.then((c) => {
      if (!c) return
      subClient = c
      try {
        // ioredis supports subscribe + message events
        c.subscribe(channel).catch(() => {})
        c.on('message', (_chan: string, msg: string) => {
          try { cb(JSON.parse(msg)) } catch {}
        })
      } catch {
        // ignore subscribe errors
      }
    }).catch(() => {})

    return () => {
      try {
        const sc = subClient as { unsubscribe?: (ch: string) => void; disconnect?: () => void } | null
          if (sc) {
            try { sc.unsubscribe?.(channel) } catch {}
            try { sc.disconnect?.() } catch {}
          }
      } catch {}
    }
  }

  // Fallback to in-memory pubsub
  const set = subscribers.get(userId) || new Set<NotifCallback>()
  set.add(cb)
  subscribers.set(userId, set)
  return () => {
    set.delete(cb)
    if (set.size === 0) subscribers.delete(userId)
  }
}

export function publish(userId: string, payload: unknown) {
  // If Redis is enabled, publish to channel
  if (redisHelper.isRedisEnabled) {
    const r = redisHelper.getRedis()
    if (r) {
      try {
        r.publish(`notifications:${userId}`, JSON.stringify(payload)).catch(() => {})
      } catch {}
    }
    return
  }

  const set = subscribers.get(userId)
  if (!set) return
  for (const cb of Array.from(set)) {
    try {
      cb(payload)
    } catch {
      // ignore subscriber errors and remove the failing callback
      set.delete(cb)
    }
  }
}

export function subscriberCount(userId: string) {
  if (redisHelper.isRedisEnabled) return 1 // unknown; at least one due to Redis
  return subscribers.get(userId)?.size || 0
}

const exported = { subscribe, publish, subscriberCount }
export default exported
