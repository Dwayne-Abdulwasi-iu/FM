// POST /api/boutique/orders/[orderId]/confirm - Buyer confirms delivery
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { orderId } = await params;

    // Get order and verify ownership
    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { title: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify buyer owns this order
    if (order.buyerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Only DELIVERED orders can be confirmed
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { success: false, message: `Cannot confirm order with status: ${order.status}. Order must be marked as delivered first.` },
        { status: 400 }
      );
    }

    // Update order to COMPLETED
    await prisma.boutiqueOrder.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        buyerConfirmedAt: new Date(),
      },
    });

    // Get product title for emails
    const productTitle = order.items[0]?.product.title || 'your order';

    // Send email to seller - order completed, payout will be processed
    if (order.seller?.email) {
      await sendEmail({
        to: order.seller.email,
        subject: `Order #${order.orderNumber} Completed - Payout Processing`,
        html: `
          <h2>Order Completed! 🎉</h2>
          <p>Hi ${order.seller.name || 'Seller'},</p>
          <p>Great news! The buyer has confirmed delivery for order <strong>#${order.orderNumber}</strong>.</p>
          
          <h3>Order Details</h3>
          <ul>
            <li><strong>Product:</strong> ${productTitle}</li>
            <li><strong>Order Total:</strong> ₦${order.total.toLocaleString()}</li>
            <li><strong>Your Payout:</strong> ₦${order.sellerPayout?.toLocaleString() || 'N/A'}</li>
          </ul>
          
          <p>Your payout will be processed within 24-48 hours.</p>
          
          <p><a href="${process.env.NEXTAUTH_URL}/seller/boutique/orders">View Your Orders</a></p>
        `,
      });
    }

    // Send email to admin - order completed, ready for payout
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[ACTION] Order #${order.orderNumber} Completed - Process Seller Payout`,
        html: `
          <h2>Buyer Confirmed Delivery</h2>
          <p>Order <strong>#${order.orderNumber}</strong> has been confirmed as completed by the buyer.</p>
          
          <h3>Order Details</h3>
          <ul>
            <li><strong>Buyer:</strong> ${order.buyer.name || order.buyer.email}</li>
            <li><strong>Seller:</strong> ${order.seller?.name || 'N/A'} (${order.seller?.email})</li>
            <li><strong>Product:</strong> ${productTitle}</li>
            <li><strong>Order Total:</strong> ₦${order.total.toLocaleString()}</li>
            <li><strong>Seller Payout:</strong> ₦${order.sellerPayout?.toLocaleString() || 'N/A'}</li>
          </ul>
          
          <p><strong>Action Required:</strong> Process manual payout to seller.</p>
          
          <p><a href="${process.env.NEXTAUTH_URL}/admin/boutique/orders/${order.id}">View Order Details</a></p>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Order confirmed as completed. Thank you!',
    });
  } catch (error) {
    console.error('Order confirmation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to confirm order' },
      { status: 500 }
    );
  }
}
