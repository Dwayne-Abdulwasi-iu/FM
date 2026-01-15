import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPODStatusEmail, sendAdminPODAlert } from '@/lib/email';
import { queueFailedNotification } from '@/lib/notification-queue';
import crypto from 'crypto';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // max requests per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Verify Printful webhook signature using HMAC-SHA256
// NOTE: Printful does NOT sign webhooks by default. This is a custom implementation
// that requires manual configuration in Printful dashboard if they support it in the future.
// For now, we rely on the webhook URL being secret and rate limiting for security.
function verifyPrintfulSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/printful
 * Handle Printful webhook events for order status updates
 * 
 * Printful sends webhooks for:
 * - package_shipped: Order has been shipped
 * - package_returned: Package was returned
 * - order_created: Order was created in Printful
 * - order_updated: Order details changed
 * - order_failed: Order failed to process
 * - order_canceled: Order was canceled
 * - product_synced: Product sync status
 */

interface PrintfulWebhookEvent {
  type: string;
  created: number;
  retries: number;
  store: number;
  data: {
    order?: {
      id: number;
      external_id: string;
      status: string;
      shipping: string;
      created: number;
      updated: number;
      recipient: {
        name: string;
        address1: string;
        city: string;
        country_code: string;
      };
      items: Array<{
        id: number;
        external_id: string;
        variant_id: number;
        quantity: number;
        name: string;
      }>;
      shipments?: Array<{
        id: number;
        carrier: string;
        service: string;
        tracking_number: string;
        tracking_url: string;
        created: number;
        ship_date: string;
        shipped_at: number;
        reshipment: boolean;
        items: Array<{
          item_id: number;
          quantity: number;
        }>;
      }>;
    };
    shipment?: {
      id: number;
      carrier: string;
      service: string;
      tracking_number: string;
      tracking_url: string;
      created: number;
      ship_date: string;
      shipped_at: number;
    };
    reason?: string;
  };
}

// In-memory idempotency cache (for serverless, use Redis in production)
const processedWebhooks = new Map<string, number>();
const IDEMPOTENCY_TTL = 3600000; // 1 hour

function checkIdempotency(eventId: string): boolean {
  const now = Date.now();
  
  // Clean old entries
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL) {
      processedWebhooks.delete(key);
    }
  }
  
  if (processedWebhooks.has(eventId)) {
    return false; // Already processed
  }
  
  processedWebhooks.set(eventId, now);
  return true;
}

/**
 * GET /api/webhooks/printful
 * Handle Printful webhook validation requests
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Printful webhook endpoint is active',
    timestamp: new Date().toISOString()
  }, { status: 200 });
}

/**
 * HEAD /api/webhooks/printful
 * Handle Printful webhook validation HEAD requests
 */
export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      console.warn('[Printful Webhook] Rate limit exceeded for IP:', ip);
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    let body: PrintfulWebhookEvent;
    
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[Printful Webhook] Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    console.log('[Printful Webhook] Received event:', body.type);
    
    // Idempotency check - prevent duplicate processing
    const eventId = `printful_${body.type}_${body.created}_${body.data.order?.id || 'no-order'}`;
    if (!checkIdempotency(eventId)) {
      console.log('[Printful Webhook] Duplicate event detected, skipping:', eventId);
      return NextResponse.json({ received: true, duplicate: true });
    }
    
    // Verify webhook signature if secret is configured
    // NOTE: Printful webhooks are NOT signed by default. This is optional custom security.
    // The signature header is only checked if PRINTFUL_WEBHOOK_SECRET is set AND the header exists.
    const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
    const signature = request.headers.get('x-printful-signature');
    
    if (webhookSecret && signature) {
      if (!verifyPrintfulSignature(rawBody, signature, webhookSecret)) {
        console.error('[Printful Webhook] Invalid signature - rejecting request');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      console.log('[Printful Webhook] Signature verified successfully');
    } else {
      // Printful doesn't sign webhooks by default - this is expected
      console.log('[Printful Webhook] Processing without signature (Printful standard behavior)');
    }

    const { type, data } = body;
    const orderId = data.order?.external_id; // Our order ID stored as external_id
    
    if (!orderId) {
      console.log('[Printful Webhook] No external_id in webhook');
      return NextResponse.json({ received: true });
    }

    // Find the order in our database
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { podOrderId: String(data.order?.id) }
        ]
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        items: {
          include: {
            design: {
              include: {
                designer: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      console.log('[Printful Webhook] Order not found:', orderId);
      return NextResponse.json({ received: true });
    }

    // Handle different event types
    switch (type) {
      case 'package_shipped': {
        const shipment = data.shipment || data.order?.shipments?.[0];
        
        await prisma.order.update({
          where: { id: order.id },
          data: {
            podStatus: 'shipped',
            trackingNumber: shipment?.tracking_number,
            trackingUrl: shipment?.tracking_url
          }
        });

        // Notify customer
        if (order.customer?.email) {
          await sendPODStatusEmail({
            to: order.customer.email,
            customerName: order.customer.name || 'Customer',
            orderNumber: order.orderNumber,
            status: 'shipped',
            trackingNumber: shipment?.tracking_number,
            trackingUrl: shipment?.tracking_url,
            carrier: shipment?.carrier
          });
        }

        // Notify seller(s)
        await notifySellers(order, 'shipped', {
          trackingNumber: shipment?.tracking_number,
          trackingUrl: shipment?.tracking_url,
          carrier: shipment?.carrier
        });

        // Create notification records
        await createNotifications(order, 'shipped', 'Your POD order has been shipped!');
        
        console.log(`[Printful] Order ${order.orderNumber} shipped`);
        break;
      }

      case 'order_created': {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            podStatus: 'pending',
            podOrderId: String(data.order?.id)
          }
        });
        
        console.log(`[Printful] Order ${order.orderNumber} created in Printful`);
        break;
      }

      case 'order_updated': {
        const printfulStatus = data.order?.status;
        let podStatus = order.podStatus;
        
        // Map Printful status to our status
        if (printfulStatus === 'pending' || printfulStatus === 'draft') {
          podStatus = 'pending';
        } else if (printfulStatus === 'inprocess' || printfulStatus === 'in_production') {
          podStatus = 'in_production';
        } else if (printfulStatus === 'fulfilled') {
          podStatus = 'shipped';
        } else if (printfulStatus === 'canceled') {
          podStatus = 'canceled';
        }

        await prisma.order.update({
          where: { id: order.id },
          data: { podStatus }
        });

        // Notify on production start
        if (podStatus === 'in_production' && order.podStatus !== 'in_production') {
          await notifySellers(order, 'in_production');
          await createNotifications(order, 'in_production', 'Your POD order is now in production!');
        }
        
        console.log(`[Printful] Order ${order.orderNumber} updated to ${podStatus}`);
        break;
      }

      case 'order_failed': {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            podStatus: 'failed',
            paymentError: data.reason || 'Order failed in production'
          }
        });

        // Notify seller about failure
        await notifySellers(order, 'failed', { reason: data.reason });
        await createNotifications(order, 'failed', `POD order failed: ${data.reason || 'Unknown error'}`);
        
        // Alert admin about the failure
        await sendAdminPODAlert({
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: 'failed',
          provider: 'Printful',
          reason: data.reason,
          customerEmail: order.customer?.email || undefined,
          totalAmount: order.totalAmount
        });
        
        console.log(`[Printful] Order ${order.orderNumber} failed: ${data.reason}`);
        break;
      }

      case 'order_canceled': {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            podStatus: 'canceled',
            status: 'CANCELLED'
          }
        });

        // Notify customer
        if (order.customer?.email) {
          await sendPODStatusEmail({
            to: order.customer.email,
            customerName: order.customer.name || 'Customer',
            orderNumber: order.orderNumber,
            status: 'canceled',
            reason: data.reason
          });
        }

        // Notify seller
        await notifySellers(order, 'canceled', { reason: data.reason });
        await createNotifications(order, 'canceled', 'POD order has been canceled');
        
        // Alert admin about cancellation
        await sendAdminPODAlert({
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: 'canceled',
          provider: 'Printful',
          reason: data.reason,
          customerEmail: order.customer?.email || undefined,
          totalAmount: order.totalAmount
        });
        
        console.log(`[Printful] Order ${order.orderNumber} canceled`);
        break;
      }

      case 'package_returned': {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            podStatus: 'returned',
            paymentError: 'Package was returned to sender'
          }
        });

        // Notify seller
        await notifySellers(order, 'returned');
        await createNotifications(order, 'returned', 'POD package was returned to sender');
        
        // Alert admin about returned package
        await sendAdminPODAlert({
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: 'returned',
          provider: 'Printful',
          customerEmail: order.customer?.email || undefined,
          totalAmount: order.totalAmount
        });
        
        console.log(`[Printful] Order ${order.orderNumber} returned`);
        break;
      }

      default:
        console.log(`[Printful Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Printful Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Notify all sellers involved in an order
 */
async function notifySellers(
  order: {
    id: string;
    orderNumber: string;
    items: Array<{
      design: {
        designer: { id: string; name: string | null; email: string | null } | null;
      } | null;
    }>;
  },
  status: string,
  details?: { trackingNumber?: string; trackingUrl?: string; carrier?: string; reason?: string }
) {
  // Get unique sellers from order items
  const sellers = new Map<string, { id: string; name: string | null; email: string | null }>();
  
  for (const item of order.items) {
    const designer = item.design?.designer;
    if (designer && !sellers.has(designer.id)) {
      sellers.set(designer.id, designer);
    }
  }

  // Send email to each seller
  for (const seller of sellers.values()) {
    if (seller.email) {
      try {
        const emailSent = await sendPODStatusEmail({
          to: seller.email,
          customerName: seller.name || 'Seller',
          orderNumber: order.orderNumber,
          status: status,
          trackingNumber: details?.trackingNumber,
          trackingUrl: details?.trackingUrl,
          carrier: details?.carrier,
          reason: details?.reason,
          isSeller: true
        });
        
        // Queue for retry if email failed
        if (!emailSent) {
          await queueFailedNotification('email', {
            emailType: 'pod_status',
            to: seller.email,
            customerName: seller.name || 'Seller',
            orderId: order.orderNumber,
            status,
            trackingNumber: details?.trackingNumber,
            trackingUrl: details?.trackingUrl,
            carrier: details?.carrier,
            reason: details?.reason,
            isSeller: true,
          }, 'Initial send failed');
        }
      } catch (error) {
        console.error(`Failed to send email to seller ${seller.id}:`, error);
        // Queue for retry
        await queueFailedNotification('email', {
          emailType: 'pod_status',
          to: seller.email,
          customerName: seller.name || 'Seller',
          orderId: order.orderNumber,
          status,
        }, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
}

/**
 * Create in-app notifications for order status changes
 */
async function createNotifications(
  order: {
    id: string;
    orderNumber: string;
    customer: { id: string } | null;
    items: Array<{
      design: {
        designer: { id: string } | null;
      } | null;
    }>;
  },
  status: string,
  message: string
) {
  const notifications: Array<{ userId: string; type: string; title: string; message: string; link: string }> = [];

  // Notification for customer
  if (order.customer?.id) {
    notifications.push({
      userId: order.customer.id,
      type: 'POD_STATUS',
      title: `Order ${order.orderNumber} Update`,
      message: message,
      link: `/profile?tab=orders`
    });
  }

  // Notifications for sellers
  const sellerIds = new Set<string>();
  for (const item of order.items) {
    if (item.design?.designer?.id) {
      sellerIds.add(item.design.designer.id);
    }
  }

  for (const sellerId of sellerIds) {
    notifications.push({
      userId: sellerId,
      type: 'POD_STATUS',
      title: `POD Order ${order.orderNumber} - ${status.toUpperCase()}`,
      message: message,
      link: `/seller/orders/${order.id}`
    });
  }

  // Create all notifications
  if (notifications.length > 0) {
    try {
      await prisma.notification.createMany({
        data: notifications.map(n => ({
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          data: { link: n.link },
          isRead: false,
          createdAt: new Date()
        }))
      });
    } catch (error) {
      console.error('Failed to create notifications:', error);
      // Queue in-app notifications for retry
      for (const n of notifications) {
        await queueFailedNotification('in_app', {
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          data: { link: n.link },
        }, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
}
