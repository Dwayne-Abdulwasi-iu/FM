/**
 * Notification Queue System
 * 
 * Handles failed notifications with retry logic.
 * Uses database-backed queue for persistence across restarts.
 */

import prisma from '@/lib/prisma';

export type NotificationType = 'email' | 'in_app' | 'webhook';

export interface QueuedNotification {
  id?: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  lastError?: string;
  createdAt: Date;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min

/**
 * Queue a failed notification for retry
 */
export async function queueFailedNotification(
  type: NotificationType,
  payload: Record<string, unknown>,
  error: string
): Promise<void> {
  try {
    const nextRetryAt = new Date(Date.now() + RETRY_DELAYS[0]);
    
    await prisma.failedNotification.create({
      data: {
        type,
        payload: payload as object,
        attempts: 1,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        nextRetryAt,
        lastError: error,
      }
    });
    
    console.log(`[NotificationQueue] Queued ${type} notification for retry at ${nextRetryAt.toISOString()}`);
  } catch (err) {
    console.error('[NotificationQueue] Failed to queue notification:', err);
  }
}

/**
 * Get pending notifications ready for retry
 */
export async function getPendingNotifications(limit = 10): Promise<QueuedNotification[]> {
  try {
    const notifications = await prisma.failedNotification.findMany({
      where: {
        nextRetryAt: { lte: new Date() },
        attempts: { lt: MAX_RETRY_ATTEMPTS },
        resolved: false,
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });
    
    return notifications.map(n => ({
      id: n.id,
      type: n.type as NotificationType,
      payload: n.payload as Record<string, unknown>,
      attempts: n.attempts,
      maxAttempts: n.maxAttempts,
      nextRetryAt: n.nextRetryAt,
      lastError: n.lastError || undefined,
      createdAt: n.createdAt,
    }));
  } catch (err) {
    console.error('[NotificationQueue] Failed to get pending notifications:', err);
    return [];
  }
}

/**
 * Mark notification as successfully processed
 */
export async function markNotificationResolved(id: string): Promise<void> {
  try {
    await prisma.failedNotification.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() }
    });
    console.log(`[NotificationQueue] Notification ${id} resolved successfully`);
  } catch (err) {
    console.error('[NotificationQueue] Failed to mark notification resolved:', err);
  }
}

/**
 * Update notification after failed retry attempt
 */
export async function updateFailedRetry(id: string, error: string): Promise<void> {
  try {
    const notification = await prisma.failedNotification.findUnique({
      where: { id }
    });
    
    if (!notification) return;
    
    const newAttempts = notification.attempts + 1;
    const retryDelay = RETRY_DELAYS[Math.min(newAttempts - 1, RETRY_DELAYS.length - 1)];
    const nextRetryAt = new Date(Date.now() + retryDelay);
    
    if (newAttempts >= MAX_RETRY_ATTEMPTS) {
      // Mark as permanently failed
      await prisma.failedNotification.update({
        where: { id },
        data: {
          attempts: newAttempts,
          lastError: error,
          resolved: true,
          resolvedAt: new Date(),
        }
      });
      console.log(`[NotificationQueue] Notification ${id} permanently failed after ${newAttempts} attempts`);
    } else {
      // Schedule next retry
      await prisma.failedNotification.update({
        where: { id },
        data: {
          attempts: newAttempts,
          lastError: error,
          nextRetryAt,
        }
      });
      console.log(`[NotificationQueue] Notification ${id} scheduled for retry at ${nextRetryAt.toISOString()}`);
    }
  } catch (err) {
    console.error('[NotificationQueue] Failed to update notification:', err);
  }
}

/**
 * Clean up old resolved notifications (older than 7 days)
 */
export async function cleanupOldNotifications(): Promise<number> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = await prisma.failedNotification.deleteMany({
      where: {
        resolved: true,
        resolvedAt: { lt: sevenDaysAgo }
      }
    });
    
    console.log(`[NotificationQueue] Cleaned up ${result.count} old notifications`);
    return result.count;
  } catch (err) {
    console.error('[NotificationQueue] Failed to cleanup old notifications:', err);
    return 0;
  }
}
