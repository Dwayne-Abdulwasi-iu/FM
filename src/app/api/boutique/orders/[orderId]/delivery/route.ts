// POST /api/boutique/orders/[orderId]/delivery - Confirm delivery
// GET /api/boutique/orders/[orderId]/delivery - Check delivery status

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { releaseSellerPayout } from '@/lib/boutique/payout';
import { updateProductRating } from '@/lib/boutique/rating';
import { sendEmail } from '@/lib/email';

// Auto-delivery period in days after shipping
const AUTO_DELIVERY_DAYS = 14;

// POST - Confirm delivery (buyer or auto)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await getServerSession(authOptions);
    
    const body = await request.json().catch(() => ({}));
    const { isAutoConfirm, rating, feedback } = body;

    // Get order
    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, email: true, name: true } },
        seller: { select: { id: true, email: true, name: true } },
        product: { select: { title: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify authorization
    const isAdmin = session?.user?.role === 'ADMIN';
    const isBuyer = session?.user?.id === order.buyerId;
    const isCronJob = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;

    if (!isAdmin && !isBuyer && !isCronJob) {
      return NextResponse.json(
        { success: false, message: 'Not authorized to confirm delivery' },
        { status: 403 }
      );
    }

    // Check order status
    if (order.status !== 'SHIPPED') {
      return NextResponse.json(
        { success: false, message: `Order is ${order.status}, cannot confirm delivery` },
        { status: 400 }
      );
    }

    // Update order to DELIVERED
    await prisma.boutiqueOrder.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        buyerNotes: isAutoConfirm 
          ? `Auto-confirmed after ${AUTO_DELIVERY_DAYS} days`
          : feedback || undefined,
      },
    });

    // Create review if rating provided
    if (rating && isBuyer) {
      await prisma.boutiqueReview.create({
        data: {
          productId: order.productId,
          userId: order.buyerId,
          orderId: order.id,
          rating,
          comment: feedback || '',
          isVerifiedPurchase: true,
        },
      });

      // Update product average rating cache
      await updateProductRating(order.productId);
    }

    // Notify seller
    if (order.seller.email) {
      await sendEmail({
        to: order.seller.email,
        subject: `✅ Delivery Confirmed: Order #${order.orderNumber}`,
        html: `
          <h2>Delivery Confirmed!</h2>
          <p>Hi ${order.seller.name || 'Seller'},</p>
          
          <p>Order #${order.orderNumber} has been ${isAutoConfirm ? 'automatically confirmed' : 'confirmed by the buyer'}!</p>

          ${rating ? `
          <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
            ${feedback ? `<p style="margin: 8px 0 0 0;"><strong>Feedback:</strong> ${feedback}</p>` : ''}
          </div>
          ` : ''}

          <p>Your order will be marked as complete and funds will be released to your account soon.</p>

          <p style="margin-top: 24px;">
            <a href="${process.env.NEXTAUTH_URL}/seller/boutique/orders" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
              View Orders
            </a>
          </p>
        `,
      });
    }

    // Auto-complete after delivery (could add a delay for returns window)
    // For now, complete immediately
    await prisma.boutiqueOrder.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
      },
    });

    // Release seller payout
    const payoutResult = await releaseSellerPayout(orderId);

    return NextResponse.json({
      success: true,
      message: 'Delivery confirmed and order completed',
      payout: payoutResult,
    });

  } catch (error) {
    console.error('Delivery confirmation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to confirm delivery' },
      { status: 500 }
    );
  }
}

// GET - Check delivery status and eligibility for auto-confirm
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        shippedAt: true,
        deliveredAt: true,
        trackingNumber: true,
        carrier: true,
        fulfillmentMethod: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const canAutoConfirm = order.status === 'SHIPPED' && 
      order.shippedAt && 
      (now.getTime() - order.shippedAt.getTime()) >= AUTO_DELIVERY_DAYS * 24 * 60 * 60 * 1000;

    const daysUntilAutoConfirm = order.shippedAt
      ? Math.max(0, AUTO_DELIVERY_DAYS - Math.floor((now.getTime() - order.shippedAt.getTime()) / (24 * 60 * 60 * 1000)))
      : null;

    return NextResponse.json({
      success: true,
      delivery: {
        status: order.status,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        canAutoConfirm,
        daysUntilAutoConfirm,
        autoConfirmDate: order.shippedAt 
          ? new Date(order.shippedAt.getTime() + AUTO_DELIVERY_DAYS * 24 * 60 * 60 * 1000)
          : null,
      },
    });

  } catch (error) {
    console.error('Error getting delivery status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get delivery status' },
      { status: 500 }
    );
  }
}
