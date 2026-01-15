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

// Verify Printify webhook signature using HMAC-SHA256
function verifyPrintifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/printify
 * Handle Printify webhook events for order status updates
 * 
 * Printify sends webhooks for:
 * - order:created - Order was created
 * - order:updated - Order status changed
 * - order:shipped - Order has shipped
 * - order:delivery:completed - Order delivered
 * - order:delivery:failed - Delivery failed
 * - order:canceled - Order was canceled
 */

interface PrintifyWebhookEvent {
  id: string;
  type: string;
  created_at: string;
  resource: {
    id: string;
    type: string;
    data: {
      id: string;
      external_id?: string;
      status: string;
      line_items?: Array<{
        id: string;
        quantity: number;
        product_id: string;
        variant_id: number;
        print_provider_id: number;
      }>;
      shipments?: Array<{
        carrier: string;
        number: string;
        url: string;
        delivered_at?: string;
        shipped_at?: string;
      }>;
      address_to?: {
        first_name: string;
        last_name: string;
        email: string;
        country: string;
        city: string;
      };
      metadata?: {
        order_id?: string;
      };
      total_price?: number;
      total_shipping?: number;
      total_tax?: number;
      created_at?: string;
      send_shipping_notification?: boolean;
    };
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
 * GET /api/webhooks/printify
 * Handle Printify webhook validation requests
 * Printify sends GET requests to validate webhook URLs before registration
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Printify webhook endpoint is active',
    timestamp: new Date().toISOString()
  }, { status: 200 });
}

/**
 * HEAD /api/webhooks/printify
 * Handle Printify webhook validation HEAD requests
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
      console.warn('[Printify Webhook] Rate limit exceeded for IP:', ip);
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    let body: PrintifyWebhookEvent;
    
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[Printify Webhook] Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    console.log('[Printify Webhook] Received event:', body.type);

    // Idempotency check - prevent duplicate processing
    const eventId = `printify_${body.id}_${body.type}`;
    if (!checkIdempotency(eventId)) {
      console.log('[Printify Webhook] Duplicate event detected, skipping:', eventId);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.PRINTIFY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-printify-signature');
      
      if (!signature) {
        console.error('[Printify Webhook] Missing signature - rejecting request');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      
      if (!verifyPrintifySignature(rawBody, signature, webhookSecret)) {
        console.error('[Printify Webhook] Invalid signature - rejecting request');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      
      console.log('[Printify Webhook] Signature verified successfully');
    } else {
      console.warn('[Printify Webhook] No webhook secret configured - signature verification skipped');
    }

    const { type, resource } = body;
    const printifyOrderId = resource.data.id;
    const externalId = resource.data.external_id || resource.data.metadata?.order_id;

    // Find the order in our database
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: externalId || '' },
          { podOrderId: printifyOrderId }
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
      console.log('[Printify Webhook] Order not found for:', printifyOrderId, externalId);
      return NextResponse.json({ received: true });
    }

    // Handle different event types
    switch (type) {
      case 'order:shipped': {
        const shipment = resource.data.shipments?.[0];
        
        await prisma.order.update({
          where: { id: order.id },
          data: {
            podStatus: 'shipped',
            trackingNumber: shipment?.number,
            trackingUrl: shipment?.url
          }
        });

        // Notify customer
        if (order.customer?.email) {
          await sendPODStatusEmail({
            to: order.customer.email,
            customerName: order.customer.name || 'Customer',
            orderNumber: order.orderNumber,
            status: 'shipped',
            trackingNumber: shipment?.number,
            trackingUrl: shipment?.url,
            carrier: shipment?.carrier
          });
        }

        // Notify sellers
        await notifySellers(order, 'shipped', {
          trackingNumber: shipment?.number,
          trackingUrl: shipment?.url,
          carrier: shipment?.carrier
        });

        await createNotifications(order, 'shipped', 'Your POD order has been shipped!');
        
        console.log(`[Printify] Order ${order.orderNumber} shipped`);
        break;
      }

      case 'order:created': {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            podStatus: 'pending',
            podOrderId: printifyOrderId
          }
        });
        
        console.log(`[Printify] Order ${order.orderNumber} created`);
        break;
      }

      case 'order:updated': {
        const printifyStatus = resource.data.status;
        let podStatus = order.podStatus;
        
        // Map Printify status to our status
        const statusMap: Record<string, string> = {
          'pending': 'pending',
          'pending-approval': 'pending',
          'approved': 'pending',
          'in-production': 'in_production',
          'on-hold': 'pending',
          'printing': 'in_production',
          'quality-check': 'in_production',
          'shipped': 'shipped',
          'delivered': 'delivered',
          'canceled': 'canceled',
          'refunded': 'canceled'
        };
        
        podStatus = statusMap[printifyStatus] || podStatus;

        await prisma.order.update({
          where: { id: order.id },
          data: { podStatus }
        });

        // Notify on production start
        if (podStatus === 'in_production' && order.podStatus !== 'in_production') {
          await notifySellers(order, 'in_production');
          await createNotifications(order, 'in_production', 'Your POD order is now in production!');
        }
        
        console.log(`[Printify] Order ${order.orderNumber} updated to ${podStatus}`);
        break;
      }

      case 'order:send-to-production': {
        // This event fires when order is sent to a print provider
        await prisma.order.update({
          where: { id: order.id },
          data: {
            podStatus: 'in_production'
          }
        });

        // Notify customer
        if (order.customer?.email) {
          await sendPODStatusEmail({
            to: order.customer.email,
            customerName: order.customer.name || 'Customer',
            orderNumber: order.orderNumber,
            status: 'in_production'
          });
        }

        // Notify sellers
        await notifySellers(order, 'in_production');
        await createNotifications(order, 'in_production', 'Your POD order is now in production!');
        
        console.log(`[Printify] Order ${order.orderNumber} sent to production`);
        break;
      }

      case 'order:delivery:completed': {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            podStatus: 'delivered',
            status: 'COMPLETED'
          }
        });

        // Notify customer
        if (order.customer?.email) {
          await sendPODStatusEmail({
            to: order.customer.email,
            customerName: order.customer.name || 'Customer',
            orderNumber: order.orderNumber,
            status: 'delivered'
          });
        }

        // Notify sellers - order complete, they earned their commission!
        await notifySellers(order, 'delivered');
        await createNotifications(order, 'delivered', 'POD order has been delivered successfully!');
        
        console.log(`[Printify] Order ${order.orderNumber} delivered`);
        break;
      }

      case 'order:delivery:failed': {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            podStatus: 'delivery_failed',
            paymentError: 'Delivery attempt failed'
          }
        });

        // Notify seller
        await notifySellers(order, 'delivery_failed');
        await createNotifications(order, 'delivery_failed', 'POD order delivery failed - may need reshipment');
        
        // Alert admin about delivery failure
        await sendAdminPODAlert({
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: 'delivery_failed',
          provider: 'Printify',
          customerEmail: order.customer?.email || undefined,
          totalAmount: order.totalAmount
        });
        
        console.log(`[Printify] Order ${order.orderNumber} delivery failed`);
        break;
      }

      case 'order:canceled': {
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
            status: 'canceled'
          });
        }

        // Notify seller
        await notifySellers(order, 'canceled');
        await createNotifications(order, 'canceled', 'POD order has been canceled');
        
        // Alert admin about cancellation
        await sendAdminPODAlert({
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: 'canceled',
          provider: 'Printify',
          customerEmail: order.customer?.email || undefined,
          totalAmount: order.totalAmount
        });
        
        console.log(`[Printify] Order ${order.orderNumber} canceled`);
        break;
      }

      default:
        console.log(`[Printify Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Printify Webhook] Error:', error);
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
  const sellers = new Map<string, { id: string; name: string | null; email: string | null }>();
  
  for (const item of order.items) {
    const designer = item.design?.designer;
    if (designer && !sellers.has(designer.id)) {
      sellers.set(designer.id, designer);
    }
  }

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
