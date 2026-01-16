// GET /api/boutique/orders/[orderId] - Get single order for buyer

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
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

    const order = await prisma.boutiqueOrder.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId },
        ],
        buyerId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
          },
        },
        returns: true,
        refunds: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
