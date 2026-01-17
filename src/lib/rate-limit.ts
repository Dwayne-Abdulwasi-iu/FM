import prisma from "@/lib/prisma";

/**
 * Database-backed rate limiting that scales across multiple server instances
 * 
 * Unlike in-memory rate limiting, this persists across restarts and works
 * correctly in multi-instance deployments (e.g., serverless, Kubernetes)
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check and increment rate limit for a given key
 * 
 * @param key - Unique identifier for the rate limit (e.g., "payment:user123:comm456")
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object indicating if request is allowed and remaining quota
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const expiresAt = new Date(now.getTime() + windowMs);

  try {
    // Use type assertion for new model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;

    // Try to find existing entry
    const existing = await prismaAny.rateLimitEntry.findUnique({
      where: { key },
    });

    if (existing) {
      // Check if window has expired
      if (existing.windowStart < windowStart) {
        // Window expired, reset counter
        const _updated = await prismaAny.rateLimitEntry.update({
          where: { key },
          data: {
            count: 1,
            windowStart: now,
            expiresAt,
          },
        });

        return {
          allowed: true,
          remaining: limit - 1,
          resetAt: expiresAt,
        };
      }

      // Window still active, check limit
      if (existing.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(existing.windowStart.getTime() + windowMs),
        };
      }

      // Increment counter
      const updated = await prismaAny.rateLimitEntry.update({
        where: { key },
        data: {
          count: existing.count + 1,
        },
      });

      return {
        allowed: true,
        remaining: limit - updated.count,
        resetAt: new Date(existing.windowStart.getTime() + windowMs),
      };
    }

    // No existing entry, create new one
    await prismaAny.rateLimitEntry.create({
      data: {
        key,
        count: 1,
        windowStart: now,
        expiresAt,
      },
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: expiresAt,
    };
  } catch (error) {
    // SECURITY: On error, deny the request (fail-closed for security)
    // This prevents abuse if the database is unavailable
    console.error("[RateLimit] Database error, denying request:", error);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }
}

/**
 * Generate a rate limit key for payment attempts
 */
export function paymentRateLimitKey(userId: string, commissionId: string): string {
  return `payment:${userId}:${commissionId}`;
}

/**
 * Generate a rate limit key for commission creation
 */
export function commissionCreationKey(userId: string): string {
  return `commission_create:${userId}`;
}

/**
 * Generate a rate limit key for dispute filing
 */
export function disputeRateLimitKey(userId: string, commissionId: string): string {
  return `dispute:${userId}:${commissionId}`;
}

/**
 * Generate a rate limit key for quote submissions
 */
export function quoteRateLimitKey(designerId: string, commissionId: string): string {
  return `quote:${designerId}:${commissionId}`;
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).rateLimitEntry.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`[RateLimit] Cleaned up ${result.count} expired entries`);
    return result.count;
  } catch (error) {
    console.error("[RateLimit] Cleanup error:", error);
    return 0;
  }
}

/**
 * Rate limit constants for different operations
 */
export const RATE_LIMITS = {
  PAYMENT_ATTEMPTS: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  COMMISSION_CREATION: { limit: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10 per day
  DISPUTE_FILING: { limit: 1, windowMs: 24 * 60 * 60 * 1000 }, // 1 per day per commission
  QUOTE_SUBMISSION: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour per commission
  ADMIN_MESSAGE: { limit: 50, windowMs: 60 * 60 * 1000 }, // 50 messages per hour per admin
  ADMIN_BROADCAST: { limit: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5 broadcasts per day
};

/**
 * Generate a rate limit key for admin messaging
 */
export function adminMessageRateLimitKey(adminId: string): string {
  return `admin_message:${adminId}`;
}

/**
 * Generate a rate limit key for admin broadcasts
 */
export function adminBroadcastRateLimitKey(adminId: string): string {
  return `admin_broadcast:${adminId}`;
}
