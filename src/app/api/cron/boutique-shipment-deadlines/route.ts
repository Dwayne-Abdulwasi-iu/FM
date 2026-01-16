// GET /api/cron/boutique-shipment-deadlines - Auto-cancel products if shipment not received
// Run daily to check for overdue seller→admin shipments

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS, BOUTIQUE_DEFAULTS } from '@/lib/boutique/constants';
import { sendEmail } from '@/lib/email';
import { acquireDistributedLock } from '@/lib/redis';

// ===== CONFIGURATION =====
const CRON_LOCK_KEY = 'boutique-shipment-deadline-cron';
const CRON_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes max execution time

const SHIPMENT_DEADLINE_DAYS = BOUTIQUE_DEFAULTS.shipmentDeadlineDays || 7;
const WARNING_DAYS_BEFORE = 2; // Send warning 2 days before deadline
const WARNING_COOLDOWN_HOURS = 20; // Don't send another warning within 20 hours

// Pagination limits
const BATCH_SIZE = 50;

// ===== LOGGING =====
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

function createLogger() {
  const logs: LogEntry[] = [];
  const startTime = Date.now();

  return {
    info: (message: string, data?: Record<string, unknown>) => {
      const entry = { level: 'info' as const, message, data, timestamp: new Date().toISOString() };
      logs.push(entry);
      console.log(`[Cron] ${message}`, data || '');
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      const entry = { level: 'warn' as const, message, data, timestamp: new Date().toISOString() };
      logs.push(entry);
      console.warn(`[Cron] ${message}`, data || '');
    },
    error: (message: string, data?: Record<string, unknown>) => {
      const entry = { level: 'error' as const, message, data, timestamp: new Date().toISOString() };
      logs.push(entry);
      console.error(`[Cron] ${message}`, data || '');
    },
    getLogs: () => logs,
    getDuration: () => Date.now() - startTime,
  };
}

// ===== AUTH =====
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Require explicit opt-in for unauthenticated cron in dev
  if (!cronSecret) {
    if (process.env.ALLOW_UNAUTHENTICATED_CRON === 'true') {
      console.warn('[Cron] Running without auth - ALLOW_UNAUTHENTICATED_CRON is set');
      return true;
    }
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

// ===== EMAIL HELPERS =====
interface QueuedEmail {
  to: string;
  subject: string;
  html: string;
  metadata?: {
    type: 'warning' | 'cancellation' | 'admin_notification';
    shipmentId?: string;
    productIds?: string[];
  };
}

function buildWarningEmail(
  seller: { email: string; name: string | null },
  shipment: { id: string; trackingNumber: string | null },
  products: Array<{ title: string; id: string }>,
  daysRemaining: number
): QueuedEmail {
  return {
    to: seller.email,
    subject: `⚠️ Shipment deadline in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} - Action Required`,
    html: `
      <h2>⏰ Your shipment deadline is approaching!</h2>
      <p>Hi ${seller.name || 'Seller'},</p>
      
      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining!</h3>
        <p style="margin: 0;">Your shipment to our warehouse must arrive within ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.</p>
      </div>

      <h3>Products in this shipment:</h3>
      <ul>
        ${products.map(p => `<li>${p.title}</li>`).join('')}
      </ul>

      ${shipment.trackingNumber ? `
        <p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
        <p>Please ensure your package is on track for delivery. If there are shipping delays, contact us immediately.</p>
      ` : `
        <p><strong>⚠️ No tracking number recorded!</strong></p>
        <p>Please update your shipment with a tracking number so we can verify delivery.</p>
      `}

      <p style="color: #dc2626; font-weight: bold;">
        If the shipment doesn't arrive by the deadline, your product listings will be automatically cancelled.
      </p>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL}/seller/boutique" 
           style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Check Shipment Status
        </a>
      </p>
    `,
    metadata: {
      type: 'warning',
      shipmentId: shipment.id,
      productIds: products.map(p => p.id),
    },
  };
}

function buildCancellationEmail(
  seller: { email: string; name: string | null },
  products: Array<{ title: string; id: string }>,
  reason: string
): QueuedEmail {
  return {
    to: seller.email,
    subject: `❌ Products cancelled - Shipment not received`,
    html: `
      <h2>Your product listings have been cancelled</h2>
      <p>Hi ${seller.name || 'Seller'},</p>
      
      <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">Shipment Deadline Exceeded</h3>
        <p style="margin: 0;">${reason}</p>
      </div>

      <h3>Cancelled products:</h3>
      <ul>
        ${products.map(p => `<li>${p.title}</li>`).join('')}
      </ul>

      <p>If you believe this is an error (e.g., shipment was delayed by the carrier), please contact support immediately with your tracking information.</p>

      <h3>What you can do:</h3>
      <ul>
        <li>Contact support if your shipment was delayed</li>
        <li>Re-list your products if you still want to sell them</li>
        <li>Ensure faster shipping next time to avoid cancellations</li>
      </ul>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL}/contact?subject=Shipment%20Appeal" 
           style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Contact Support
        </a>
      </p>
    `,
    metadata: {
      type: 'cancellation',
      productIds: products.map(p => p.id),
    },
  };
}

function buildAdminNotificationEmail(
  shipmentOrProductId: string,
  seller: { name: string | null; email: string },
  products: Array<{ title: string; id: string }>,
  reason: string,
  type: 'shipment' | 'stuck_product'
): QueuedEmail | null {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return null;

  return {
    to: adminEmail,
    subject: `📦 Auto-cancelled: ${products.length} product(s) - ${type === 'shipment' ? 'Shipment not received' : 'Never shipped'}`,
    html: `
      <h2>Products Auto-Cancelled Due to ${type === 'shipment' ? 'Shipment Deadline' : 'No Shipment Created'}</h2>
      
      <h3>Details</h3>
      <ul>
        <li><strong>${type === 'shipment' ? 'Shipment ID' : 'Product IDs'}:</strong> ${shipmentOrProductId}</li>
        <li><strong>Seller:</strong> ${seller.name || seller.email}</li>
        <li><strong>Seller Email:</strong> ${seller.email}</li>
        <li><strong>Reason:</strong> ${reason}</li>
      </ul>

      <h3>Cancelled Products (${products.length}):</h3>
      <ul>
        ${products.map(p => `<li>${p.title} (${p.id})</li>`).join('')}
      </ul>

      <p>The seller has been notified. If they contact support, verify with the carrier before reinstating.</p>
    `,
    metadata: {
      type: 'admin_notification',
      shipmentId: type === 'shipment' ? shipmentOrProductId : undefined,
      productIds: products.map(p => p.id),
    },
  };
}

// ===== EMAIL SENDING WITH RETRY =====
async function sendEmailsWithRetry(
  emails: QueuedEmail[],
  logger: ReturnType<typeof createLogger>,
  maxRetries = 2
): Promise<{ sent: number; failed: number; failedEmails: QueuedEmail[] }> {
  let sent = 0;
  let failed = 0;
  const failedEmails: QueuedEmail[] = [];
  
  for (const email of emails) {
    let attempt = 0;
    let success = false;
    
    while (attempt < maxRetries && !success) {
      try {
        await sendEmail({ to: email.to, subject: email.subject, html: email.html });
        success = true;
        sent++;
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) {
          logger.error(`Email send failed after ${maxRetries} attempts`, { 
            to: email.to, 
            type: email.metadata?.type,
            error: String(err),
          });
          failed++;
          failedEmails.push(email);
        } else {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }
  }
  
  return { sent, failed, failedEmails };
}

// ===== MAIN HANDLER =====
export async function GET(request: NextRequest) {
  const logger = createLogger();
  logger.info('Cron job started');

  // Auth check
  if (process.env.NODE_ENV === 'production' && !verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Acquire distributed lock
  const lock = await acquireDistributedLock(CRON_LOCK_KEY, CRON_LOCK_TTL_MS);
  if (!lock.acquired) {
    logger.warn('Could not acquire lock - job already running');
    return NextResponse.json(
      { error: 'Cron job already in progress', code: 'LOCKED' },
      { status: 409 }
    );
  }

  logger.info('Lock acquired', { lockId: lock.lockId });

  try {
    const now = new Date();
    const results = {
      checked: 0,
      warnings: 0,
      cancelled: 0,
      emailsSent: 0,
      emailsFailed: 0,
      errors: [] as string[],
    };

    const emailsToSend: QueuedEmail[] = [];
    const warningUpdateQueue: Array<{ shipmentId: string }> = [];

    // ===== 1. PROCESS WARNINGS (with pagination) =====
    const warningCooloffTime = new Date(now.getTime() - WARNING_COOLDOWN_HOURS * 60 * 60 * 1000);
    const warningCutoff = new Date(now.getTime() + WARNING_DAYS_BEFORE * 24 * 60 * 60 * 1000);
    
    let warningCursor: string | undefined;
    let hasMoreWarnings = true;

    while (hasMoreWarnings) {
      const shipmentsNearingDeadline = await prisma.sellerToAdminShipment.findMany({
        where: {
          status: { in: ['SHIPPED', 'IN_TRANSIT'] },
          expectedDeliveryDate: {
            lte: warningCutoff,
            gt: now,
          },
          hasDiscrepancy: false,
          OR: [
            { deadlineWarningSentAt: null },
            { deadlineWarningSentAt: { lt: warningCooloffTime } },
          ],
        },
        include: {
          seller: { select: { email: true, name: true } },
        },
        take: BATCH_SIZE,
        ...(warningCursor ? { skip: 1, cursor: { id: warningCursor } } : {}),
        orderBy: { id: 'asc' },
      });

      if (shipmentsNearingDeadline.length === 0) {
        hasMoreWarnings = false;
        break;
      }

      results.checked += shipmentsNearingDeadline.length;

      // Batch fetch all products for these shipments
      const allProductIds = shipmentsNearingDeadline.flatMap(s => s.productIds);
      const allProducts = await prisma.boutiqueProduct.findMany({
        where: { id: { in: allProductIds } },
        select: { id: true, title: true },
      });
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      for (const shipment of shipmentsNearingDeadline) {
        try {
          const products = shipment.productIds
            .map(id => productMap.get(id))
            .filter((p): p is { id: string; title: string } => p !== undefined);

          if (products.length === 0) continue;

          const daysRemaining = Math.ceil(
            ((shipment.expectedDeliveryDate?.getTime() || now.getTime()) - now.getTime()) / 
            (24 * 60 * 60 * 1000)
          );

          // Queue warning email
          emailsToSend.push(buildWarningEmail(shipment.seller, shipment, products, daysRemaining));
          warningUpdateQueue.push({ shipmentId: shipment.id });
          results.warnings++;
        } catch (err) {
          const errorMsg = `Warning prep failed for shipment ${shipment.id}: ${err}`;
          results.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Check if there are more
      if (shipmentsNearingDeadline.length < BATCH_SIZE) {
        hasMoreWarnings = false;
      } else {
        warningCursor = shipmentsNearingDeadline[shipmentsNearingDeadline.length - 1].id;
      }
    }

    // ===== 2. PROCESS OVERDUE SHIPMENTS (with pagination) =====
    let overdueCursor: string | undefined;
    let hasMoreOverdue = true;

    while (hasMoreOverdue) {
      const overdueShipments = await prisma.sellerToAdminShipment.findMany({
        where: {
          status: { in: ['SHIPPED', 'IN_TRANSIT', 'PENDING'] },
          expectedDeliveryDate: { lt: now },
          deliveredAt: null,
        },
        include: {
          seller: { select: { id: true, email: true, name: true } },
        },
        take: BATCH_SIZE,
        ...(overdueCursor ? { skip: 1, cursor: { id: overdueCursor } } : {}),
        orderBy: { id: 'asc' },
      });

      if (overdueShipments.length === 0) {
        hasMoreOverdue = false;
        break;
      }

      results.checked += overdueShipments.length;

      // Batch fetch all products for these shipments
      const allProductIds = overdueShipments.flatMap(s => s.productIds);
      const allProducts = await prisma.boutiqueProduct.findMany({
        where: { 
          id: { in: allProductIds },
          status: { in: [PRODUCT_STATUS.CONTENT_APPROVED, PRODUCT_STATUS.SHIPPED_TO_ADMIN] },
        },
        select: { id: true, title: true },
      });
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      for (const shipment of overdueShipments) {
        try {
          const products = shipment.productIds
            .map(id => productMap.get(id))
            .filter((p): p is { id: string; title: string } => p !== undefined);

          if (products.length === 0) continue;

          const reason = shipment.status === 'PENDING' 
            ? 'Seller never shipped the product within the deadline'
            : 'Shipment did not arrive at warehouse within the deadline';

          // Use transaction for atomic cancellation
          await prisma.$transaction([
            prisma.sellerToAdminShipment.update({
              where: { id: shipment.id },
              data: {
                status: 'CANCELLED',
                adminNotes: `Auto-cancelled: ${reason}`,
                hasDiscrepancy: true,
                disputeStatus: 'SELLER_FAULT',
                disputeOpenedAt: now,
                disputeResolvedAt: now,
                disputeResolution: 'WRITTEN_OFF',
                disputeNotes: `Auto-cancelled by system: ${reason}`,
              },
            }),
            prisma.boutiqueProduct.updateMany({
              where: { id: { in: products.map(p => p.id) } },
              data: {
                status: PRODUCT_STATUS.CANCELLED,
                rejectionReason: reason,
                rejectionDate: now,
              },
            }),
          ]);

          logger.info('Shipment cancelled', { 
            shipmentId: shipment.id, 
            productCount: products.length,
            sellerEmail: shipment.seller.email,
          });

          // Queue emails
          emailsToSend.push(buildCancellationEmail(shipment.seller, products, reason));
          const adminEmail = buildAdminNotificationEmail(shipment.id, shipment.seller, products, reason, 'shipment');
          if (adminEmail) emailsToSend.push(adminEmail);

          results.cancelled += products.length;
        } catch (err) {
          const errorMsg = `Cancellation failed for shipment ${shipment.id}: ${err}`;
          results.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      if (overdueShipments.length < BATCH_SIZE) {
        hasMoreOverdue = false;
      } else {
        overdueCursor = overdueShipments[overdueShipments.length - 1].id;
      }
    }

    // ===== 3. PROCESS STUCK PRODUCTS (with pagination) =====
    const contentApprovedCutoff = new Date(
      now.getTime() - SHIPMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000
    );

    let stuckCursor: string | undefined;
    let hasMoreStuck = true;
    const stuckBySeller = new Map<string, Array<{ id: string; title: string; seller: { id: string; email: string; name: string | null } }>>();

    while (hasMoreStuck) {
      const stuckProducts = await prisma.boutiqueProduct.findMany({
        where: {
          status: PRODUCT_STATUS.CONTENT_APPROVED,
          contentReviewedAt: { lt: contentApprovedCutoff },
          shipmentId: null,
        },
        include: {
          seller: { select: { id: true, email: true, name: true } },
        },
        take: BATCH_SIZE,
        ...(stuckCursor ? { skip: 1, cursor: { id: stuckCursor } } : {}),
        orderBy: { id: 'asc' },
      });

      if (stuckProducts.length === 0) {
        hasMoreStuck = false;
        break;
      }

      // Group by seller
      for (const product of stuckProducts) {
        const sellerId = product.sellerId;
        if (!stuckBySeller.has(sellerId)) {
          stuckBySeller.set(sellerId, []);
        }
        stuckBySeller.get(sellerId)!.push({
          id: product.id,
          title: product.title,
          seller: product.seller,
        });
      }

      if (stuckProducts.length < BATCH_SIZE) {
        hasMoreStuck = false;
      } else {
        stuckCursor = stuckProducts[stuckProducts.length - 1].id;
      }
    }

    // Process stuck products grouped by seller
    for (const [, sellerProducts] of stuckBySeller) {
      if (sellerProducts.length === 0) continue;
      
      const seller = sellerProducts[0].seller;
      const reason = 'Seller never shipped the product after content approval';

      try {
        await prisma.$transaction([
          prisma.boutiqueProduct.updateMany({
            where: { id: { in: sellerProducts.map(p => p.id) } },
            data: {
              status: PRODUCT_STATUS.CANCELLED,
              rejectionReason: reason,
              rejectionDate: now,
            },
          }),
        ]);

        logger.info('Stuck products cancelled', {
          sellerEmail: seller.email,
          productCount: sellerProducts.length,
        });

        // Queue emails (one per seller)
        emailsToSend.push(buildCancellationEmail(seller, sellerProducts, reason));
        const adminEmail = buildAdminNotificationEmail(
          sellerProducts.map(p => p.id).join(', '),
          seller,
          sellerProducts,
          reason,
          'stuck_product'
        );
        if (adminEmail) emailsToSend.push(adminEmail);

        results.cancelled += sellerProducts.length;
      } catch (err) {
        const errorMsg = `Stuck product cancellation failed for seller ${seller.email}: ${err}`;
        results.errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    // ===== 4. SEND EMAILS =====
    logger.info('Sending emails', { count: emailsToSend.length });
    const emailResults = await sendEmailsWithRetry(emailsToSend, logger);
    results.emailsSent = emailResults.sent;
    results.emailsFailed = emailResults.failed;

    // ===== 5. UPDATE WARNING TIMESTAMPS (only after emails sent successfully) =====
    // Only update if warning email was in the successfully sent batch
    const successfulWarningShipmentIds = warningUpdateQueue
      .filter(w => !emailResults.failedEmails.some(e => e.metadata?.shipmentId === w.shipmentId))
      .map(w => w.shipmentId);

    if (successfulWarningShipmentIds.length > 0) {
      await prisma.sellerToAdminShipment.updateMany({
        where: { id: { in: successfulWarningShipmentIds } },
        data: { deadlineWarningSentAt: now },
      });
      logger.info('Updated warning timestamps', { count: successfulWarningShipmentIds.length });
    }

    logger.info('Cron job completed', {
      duration: logger.getDuration(),
      results,
    });

    return NextResponse.json({
      success: true,
      message: 'Shipment deadline check complete',
      results,
      duration: `${logger.getDuration()}ms`,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error('Cron job failed', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Cron job failed', logs: logger.getLogs() },
      { status: 500 }
    );
  } finally {
    await lock.release();
    logger.info('Lock released');
  }
}
