import prisma from '@/lib/prisma'

/**
 * Idempotency Key Utilities
 * 
 * Implements idempotent request handling using database storage.
 * Prevents duplicate order creation when requests are retried.
 * 
 * Usage:
 * 1. Extract idempotency key from request header 'Idempotency-Key'
 * 2. Call checkIdempotencyKey() to see if already processed
 * 3. If not, process request and call storeIdempotentResponse()
 */

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key'

/**
 * Get idempotency key from request headers
 */
export function getIdempotencyKey(headers: Headers): string | null {
  return headers.get(IDEMPOTENCY_KEY_HEADER)
}

/**
 * Check if we've already processed this idempotency key
 * @returns Cached response if exists, null if not found
 */
export async function checkIdempotencyKey(idempotencyKey: string): Promise<any | null> {
  try {
    const record = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey }
    })
    
    if (record) {
      console.log(`[IDEMPOTENCY] Cache hit for key: ${idempotencyKey.substring(0, 8)}...`)
      return record.responseData
    }
    
    return null
  } catch (error) {
    console.error(`[IDEMPOTENCY] Error checking key ${idempotencyKey}:`, error)
    return null
  }
}

/**
 * Store idempotent response for future requests
 * @param idempotencyKey - The idempotency key from request header
 * @param userId - The user ID making the request
 * @param responseData - The response data to cache
 * @param ttlMinutes - Time to live in minutes (default: 1440 = 24 hours)
 */
export async function storeIdempotentResponse(
  idempotencyKey: string,
  userId: string,
  responseData: any,
  ttlMinutes: number = 1440
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
    
    await prisma.idempotencyKey.upsert({
      where: { key: idempotencyKey },
      create: {
        key: idempotencyKey,
        userId,
        responseData,
        expiresAt
      },
      update: {
        userId,
        responseData,
        expiresAt,
        updatedAt: new Date()
      }
    })
    
    console.log(`[IDEMPOTENCY] Stored response for key: ${idempotencyKey.substring(0, 8)}...`)
  } catch (error) {
    console.error(`[IDEMPOTENCY] Error storing response for key ${idempotencyKey}:`, error)
    // Don't throw - allow request to continue even if caching fails
  }
}

/**
 * Clean up expired idempotency keys (run periodically as cron job)
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  try {
    const result = await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })
    
    console.log(`[IDEMPOTENCY] Cleaned up ${result.count} expired keys`)
    return result.count
  } catch (error) {
    console.error('[IDEMPOTENCY] Error cleaning up expired keys:', error)
    return 0
  }
}
