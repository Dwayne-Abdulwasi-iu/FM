import { NextRequest, NextResponse } from 'next/server';
import { 
  getPendingNotifications, 
  markNotificationResolved, 
  updateFailedRetry,
  cleanupOldNotifications 
} from '@/lib/notification-queue';
import { sendPODStatusEmail, sendAdminPODAlert } from '@/lib/email';
import prisma from '@/lib/prisma';

/**
 * GET /api/cron/process-notifications
 * Process failed notifications in the retry queue
 * 
 * This should be called by a cron job (e.g., every 5 minutes)
 * Set CRON_SECRET to secure this endpoint
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    cleaned: 0,
    errors: [] as string[],
  };

  try {
    // Get pending notifications
    const notifications = await getPendingNotifications(20);
    results.processed = notifications.length;

    console.log(`[NotificationProcessor] Processing ${notifications.length} pending notifications`);

    for (const notification of notifications) {
      if (!notification.id) continue;
      
      try {
        let success = false;

        switch (notification.type) {
          case 'email': {
            const payload = notification.payload as {
              emailType: string;
              to: string;
              customerName?: string;
              orderId?: string;
              orderNumber?: string;
              status?: string;
              trackingNumber?: string;
              trackingUrl?: string;
              reason?: string;
              carrier?: string;
              isSeller?: boolean;
            };

            if (payload.emailType === 'pod_status') {
              success = await sendPODStatusEmail({
                to: payload.to,
                customerName: payload.customerName || 'Customer',
                orderNumber: payload.orderNumber || payload.orderId || 'Unknown',
                status: payload.status || 'shipped',
                trackingNumber: payload.trackingNumber,
                trackingUrl: payload.trackingUrl,
                reason: payload.reason,
                carrier: payload.carrier,
                isSeller: payload.isSeller,
              });
            } else if (payload.emailType === 'admin_alert') {
              success = await sendAdminPODAlert({
                orderNumber: payload.orderNumber || payload.orderId || 'Unknown',
                orderId: payload.orderId || '',
                status: payload.status || 'failed',
                provider: 'Unknown',
                reason: payload.reason,
                customerEmail: payload.to,
              });
            }
            break;
          }

          case 'in_app': {
            const payload = notification.payload as {
              userId: string;
              type: string;
              title: string;
              message: string;
              data?: Record<string, unknown>;
            };

            await prisma.notification.create({
              data: {
                userId: payload.userId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                data: payload.data || {},
                isRead: false,
              }
            });
            success = true;
            break;
          }

          default:
            console.warn(`[NotificationProcessor] Unknown notification type: ${notification.type}`);
        }

        if (success) {
          await markNotificationResolved(notification.id);
          results.succeeded++;
        } else {
          await updateFailedRetry(notification.id, 'Notification send returned false');
          results.failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await updateFailedRetry(notification.id, errorMessage);
        results.failed++;
        results.errors.push(`${notification.id}: ${errorMessage}`);
      }
    }

    // Cleanup old resolved notifications
    results.cleaned = await cleanupOldNotifications();

    console.log(`[NotificationProcessor] Complete: ${results.succeeded} succeeded, ${results.failed} failed, ${results.cleaned} cleaned`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[NotificationProcessor] Fatal error:', error);
    return NextResponse.json(
      { 
        error: 'Processing failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
