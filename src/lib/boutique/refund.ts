// Boutique order refund utilities

import prisma from '@/lib/prisma';
import { isPaystackConfigured } from '@/lib/paystack';
import { sendEmail } from '@/lib/email';
import axios from 'axios';

// Paystack refund API helper
async function createPaystackRefund(transactionRef: string, amountKobo: number, reason: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error('Paystack not configured');
  
  const response = await axios.post(
    'https://api.paystack.co/refund',
    {
      transaction: transactionRef,
      amount: amountKobo,
      customer_note: reason,
    },
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  message: string;
  amount?: number;
}

/**
 * Initiate a refund for a boutique order
 */
export async function initiateBoutiqueRefund(
  orderId: string,
  reason: string
): Promise<RefundResult> {
  try {
    // Get order details
    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { email: true, name: true } },
      },
    });

    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (!order.paymentReference) {
      // No payment reference - might be unpaid or paid differently
      // Create refund request for manual processing
      await prisma.boutiqueRefund.create({
        data: {
          orderId: order.id,
          amount: order.total,
          currency: order.currency,
          reason,
          status: 'PENDING_MANUAL',
          requestedAt: new Date(),
        },
      });

      return { 
        success: true, 
        message: 'Refund request created for manual processing',
        amount: order.total,
      };
    }

    // Try automatic refund via Paystack
    if (isPaystackConfigured()) {
      try {
        // Paystack refund
        const refundResponse = await createPaystackRefund(
          order.paymentReference,
          Math.round(order.total * 100), // Convert to kobo
          `Boutique order ${order.orderNumber} refund: ${reason}`
        );

        if (refundResponse.status) {
          // Record successful refund
          await prisma.boutiqueRefund.create({
            data: {
              orderId: order.id,
              amount: order.total,
              currency: order.currency,
              reason,
              status: 'COMPLETED',
              providerRefundId: refundResponse.data.id?.toString(),
              requestedAt: new Date(),
              processedAt: new Date(),
            },
          });

          // Update order
          await prisma.boutiqueOrder.update({
            where: { id: orderId },
            data: {
              refundStatus: 'REFUNDED',
              refundedAt: new Date(),
              refundAmount: order.total,
            },
          });

          return {
            success: true,
            refundId: refundResponse.data.id?.toString(),
            message: 'Refund processed successfully',
            amount: order.total,
          };
        }
      } catch (paystackError) {
        console.error('Paystack refund failed:', paystackError);
        // Fall through to manual processing
      }
    }

    // Automatic refund failed or not available - create manual request
    await prisma.boutiqueRefund.create({
      data: {
        orderId: order.id,
        amount: order.total,
        currency: order.currency,
        reason,
        status: 'PENDING_MANUAL',
        requestedAt: new Date(),
        notes: 'Automatic refund failed, requires manual processing',
      },
    });

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `Manual Refund Required - Order #${order.orderNumber}`,
        html: `
          <h2>Manual Refund Required</h2>
          <p>Automatic refund failed for order #${order.orderNumber}.</p>
          <h3>Details</h3>
          <ul>
            <li><strong>Order ID:</strong> ${order.id}</li>
            <li><strong>Amount:</strong> ₦${order.total.toLocaleString()}</li>
            <li><strong>Buyer:</strong> ${order.buyer.email}</li>
            <li><strong>Reason:</strong> ${reason}</li>
            <li><strong>Payment Ref:</strong> ${order.paymentReference}</li>
          </ul>
          <p>Please process this refund manually.</p>
        `,
      });
    }

    return {
      success: true,
      message: 'Refund request created for manual processing',
      amount: order.total,
    };

  } catch (error) {
    console.error('Refund initiation error:', error);
    return {
      success: false,
      message: `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get refund status for an order
 */
export async function getRefundStatus(orderId: string) {
  const refund = await prisma.boutiqueRefund.findFirst({
    where: { orderId },
    orderBy: { requestedAt: 'desc' },
  });

  return refund;
}

/**
 * Process pending manual refunds (for admin use)
 */
export async function processPendingRefunds() {
  const pendingRefunds = await prisma.boutiqueRefund.findMany({
    where: { status: 'PENDING_MANUAL' },
    include: {
      order: {
        include: { buyer: true },
      },
    },
    orderBy: { requestedAt: 'asc' },
  });

  return pendingRefunds;
}
