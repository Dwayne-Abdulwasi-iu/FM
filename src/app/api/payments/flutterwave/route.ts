import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { initializePayment, getSupportedCountries, getFlutterwavePublicKey } from '@/lib/flutterwave';

/**
 * POST /api/payments/flutterwave - Initialize Flutterwave payment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, currency = 'NGN', paymentOptions } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Get order details
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: session.user.id,
        status: 'PENDING',
      },
      include: {
        customer: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or already processed' },
        { status: 404 }
      );
    }

    // Initialize payment with Flutterwave
    const result = await initializePayment({
      orderId: orderId,
      amount: order.totalAmount,
      currency: currency,
      email: order.customer.email,
      name: order.customer.name || 'Customer',
      redirectUrl: `${process.env.NEXTAUTH_URL}/checkout/success?provider=flutterwave&orderId=${orderId}`,
      paymentOptions: paymentOptions,
      customizations: {
        title: 'Fashion Marketplace',
        description: `Order #${orderId.slice(-8)}`,
        logo: `${process.env.NEXTAUTH_URL}/logo.png`,
      },
      meta: {
        orderId: orderId,
        userId: session.user.id,
      },
    });

    // Update order with Flutterwave reference
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'FLUTTERWAVE',
        flutterwaveRef: orderId, // tx_ref is our orderId
      },
    });

    return NextResponse.json({
      success: true,
      paymentLink: result.data.link,
      txRef: orderId,
    });
  } catch (error) {
    console.error('Flutterwave payment error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/flutterwave - Get supported countries and public key
 */
export async function GET() {
  try {
    const countries = getSupportedCountries();
    const publicKey = getFlutterwavePublicKey();

    return NextResponse.json({
      countries,
      publicKey,
      configured: !!publicKey,
    });
  } catch (error) {
    console.error('Flutterwave config error:', error);
    return NextResponse.json(
      { error: 'Failed to get Flutterwave config' },
      { status: 500 }
    );
  }
}
