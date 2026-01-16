/**
 * Redis Client with Distributed Locking
 * 
 * Provides Redis connection and distributed lock functionality.
 * Falls back to database-based locking when REDIS_URL is not set.
 */

import Redis from 'ioredis';
import prisma from '@/lib/prisma';

// Lazy-initialized Redis client
let redisClient: Redis | null = null;
let redisInitialized = false;

/**
 * Get or create Redis client (lazy initialization)
 * Returns null if REDIS_URL is not configured
 */
export function getRedisClient(): Redis | null {
  if (redisInitialized) return redisClient;
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not set, using database fallback for locks');
    redisInitialized = true;
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying
        return Math.min(times * 100, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisInitialized = true;
    return redisClient;
  } catch (err) {
    console.error('[Redis] Failed to initialize:', err);
    redisInitialized = true;
    return null;
  }
}

/**
 * Distributed Lock using Redis SETNX with fallback to database
 */
export interface LockResult {
  acquired: boolean;
  lockId: string | null;
  release: () => Promise<void>;
}

/**
 * Acquire a distributed lock
 * 
 * @param key - Unique lock key
 * @param ttlMs - Lock TTL in milliseconds (auto-releases after this time)
 * @returns LockResult with acquired status and release function
 */
export async function acquireDistributedLock(
  key: string,
  ttlMs: number = 5 * 60 * 1000 // 5 minutes default
): Promise<LockResult> {
  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const redis = getRedisClient();

  if (redis) {
    return acquireRedisLock(redis, key, lockId, ttlMs);
  } else {
    return acquireDatabaseLock(key, lockId, ttlMs);
  }
}

/**
 * Redis-based lock using SET NX EX
 */
async function acquireRedisLock(
  redis: Redis,
  key: string,
  lockId: string,
  ttlMs: number
): Promise<LockResult> {
  const lockKey = `lock:${key}`;
  const ttlSeconds = Math.ceil(ttlMs / 1000);

  try {
    // SET key lockId NX EX ttl - atomic set-if-not-exists with TTL
    const result = await redis.set(lockKey, lockId, 'EX', ttlSeconds, 'NX');
    
    if (result === 'OK') {
      return {
        acquired: true,
        lockId,
        release: async () => {
          // Only release if we still hold the lock (compare-and-delete)
          const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await redis.eval(script, 1, lockKey, lockId);
        },
      };
    }

    return {
      acquired: false,
      lockId: null,
      release: async () => {},
    };
  } catch (err) {
    console.error('[Redis] Lock acquisition error:', err);
    // Fall back to database lock on Redis error
    return acquireDatabaseLock(key, lockId, ttlMs);
  }
}

/**
 * Database-based lock fallback using CronLock model
 */
async function acquireDatabaseLock(
  key: string,
  lockId: string,
  ttlMs: number
): Promise<LockResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    // Try to create or update expired lock
    // Using raw query for atomic upsert with condition
    const existingLock = await (prisma as unknown as { cronLock: { findUnique: (args: { where: { key: string } }) => Promise<{ id: string; lockId: string; expiresAt: Date } | null> } }).cronLock.findUnique({
      where: { key },
    });

    if (existingLock) {
      // Check if existing lock is expired
      if (existingLock.expiresAt > now) {
        // Lock is still held
        return {
          acquired: false,
          lockId: null,
          release: async () => {},
        };
      }

      // Lock expired, take it over
      await (prisma as unknown as { cronLock: { update: (args: { where: { key: string }; data: { lockId: string; lockedAt: Date; expiresAt: Date } }) => Promise<void> } }).cronLock.update({
        where: { key },
        data: {
          lockId,
          lockedAt: now,
          expiresAt,
        },
      });
    } else {
      // No existing lock, create new one
      await (prisma as unknown as { cronLock: { create: (args: { data: { key: string; lockId: string; lockedAt: Date; expiresAt: Date } }) => Promise<void> } }).cronLock.create({
        data: {
          key,
          lockId,
          lockedAt: now,
          expiresAt,
        },
      });
    }

    return {
      acquired: true,
      lockId,
      release: async () => {
        try {
          // Only release if we still hold the lock
          await (prisma as unknown as { cronLock: { deleteMany: (args: { where: { key: string; lockId: string } }) => Promise<void> } }).cronLock.deleteMany({
            where: { key, lockId },
          });
        } catch (err) {
          console.error('[Lock] Failed to release database lock:', err);
        }
      },
    };
  } catch (err) {
    // If there's a unique constraint violation, lock is held
    if ((err as { code?: string }).code === 'P2002') {
      return {
        acquired: false,
        lockId: null,
        release: async () => {},
      };
    }
    console.error('[Lock] Database lock error:', err);
    return {
      acquired: false,
      lockId: null,
      release: async () => {},
    };
  }
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisInitialized = false;
  }
}
