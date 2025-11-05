import Redis from 'ioredis'

let client: Redis | null = null
let connected = false
let errorLogged = false

export const isRedisEnabled = Boolean(process.env.REDIS_URL)

function createClient() {
  // conservative options: avoid infinite retry storms and disable offline queue to fail fast
  return new Redis(process.env.REDIS_URL as string, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      // try a few quick reconnects, then stop
      if (times < 3) return 100 * times
      return null
    }
  })
}

export function getRedis(): Redis | null {
  if (!isRedisEnabled) return null
  if (client && connected) return client

  if (!client) {
    try {
      client = createClient()
      client.on('ready', () => { connected = true; })
      client.on('end', () => { connected = false })
      client.on('error', (err: unknown) => {
        // Log the first error to help debugging, then suppress to avoid noisy logs
        if (!errorLogged) {
          console.warn('Redis error (first seen):', err)
          errorLogged = true
        }
        connected = false
      })
    } catch {
      // creation failed, ensure we return null and don't throw
      return null
    }
  }

  // If client exists but isn't connected, return null so callers fall back
  if (!connected) return null
  return client
}

export async function createSubscriber() {
  if (!isRedisEnabled) return null
  try {
    const sub = createClient()
    // wait for ready once (but don't block long)
    // wait briefly for ready but don't require it
    await Promise.race([
      new Promise<void>((res) => sub.once('ready', () => res())),
      new Promise<void>((res) => setTimeout(res, 500))
    ])
    return sub
  } catch {
    return null
  }
}

export function isRedisConnected() {
  return Boolean(client && connected)
}

const exported = { getRedis, createSubscriber, isRedisEnabled, isRedisConnected }
export default exported
