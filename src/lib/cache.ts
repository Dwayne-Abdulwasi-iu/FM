import { getRedisClient } from './redis'

// Cache TTL definitions (in seconds)
export const CACHE_TTL = {
  UPDATES: 60, // 1 minute - updates don't change frequently
  CART: 30, // 30 seconds - cart can change frequently but some caching helps
  PREFERENCES: 3600, // 1 hour - preferences rarely change
  NOTIFICATIONS: 60, // 1 minute - notifications should be relatively fresh
  INBOX: 120, // 2 minutes
  EXCHANGE_RATES: 3600, // 1 hour - exchange rates are stable
}

/**
 * Get cached data or execute function if cache miss
 * @param key Cache key
 * @param ttl Time to live in seconds
 * @param fetcher Function to call if cache miss
 * @returns Cached or freshly fetched data
 */
export async function getCachedData<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient()
  if (!redis) {
    // Fall back to direct fetch if Redis not available
    return fetcher()
  }

  try {
    // Try to get from cache
    const cached = await redis.get(key)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch (parseError) {
        console.error(`Failed to parse cached data for key ${key}:`, parseError)
        // Fall back to fresh fetch if JSON is corrupted
        const data = await fetcher()
        // Re-cache the fresh data
        if (data !== null && data !== undefined) {
          await redis
            .setex(key, ttl, JSON.stringify(data))
            .catch(() => {
              // Silent fail - cache errors shouldn't break the app
            })
        }
        return data
      }
    }

    // Cache miss - fetch fresh data
    const data = await fetcher()

    // Store in cache (check for null/undefined explicitly, not just falsy)
    if (data !== null && data !== undefined) {
      await redis
        .setex(key, ttl, JSON.stringify(data))
        .catch(() => {
          // Silent fail - cache errors shouldn't break the app
        })
    }

    return data
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error)
    // On error, fall back to direct fetch
    return fetcher()
  }
}

/**
 * Invalidate a cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.del(key).catch((err: Error) => {
      console.warn(`Failed to delete cache key ${key}:`, err)
    })
  } catch (error) {
    console.error(`Failed to invalidate cache key ${key}:`, error)
  }
}

/**
 * Invalidate multiple cache keys with a pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys).catch((err: Error) => {
        console.warn(`Failed to delete pattern keys ${pattern}:`, err)
      })
    }
  } catch (error) {
    console.error(`Failed to invalidate cache pattern ${pattern}:`, error)
  }
}

/**
 * Clear all caches (be careful with this!)
 */
export async function clearAllCache() {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.flushdb()
  } catch (error) {
    console.error('Failed to clear all cache:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(pattern: string = '*') {
  const redis = getRedisClient()
  if (!redis)
    return {
      available: false,
      keys: 0,
      pattern,
    }

  try {
    const keys = await redis.keys(pattern)
    return {
      available: true,
      keys: keys.length,
      pattern,
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    return {
      available: false,
      keys: 0,
      pattern,
      error: String(error),
    }
  }
}
