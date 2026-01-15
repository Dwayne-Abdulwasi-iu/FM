import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/pod/orders
 * Get all POD orders for admin
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: Record<string, unknown> = {
      orderType: 'POD'
    };
    
    if (status && status !== 'all') {
      where.podStatus = status;
    }
    
    if (provider && provider !== 'all') {
      where.podProvider = provider;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          select: {
            id: true,
            podProductName: true,
            quantity: true,
            price: true,
            purchaseType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalCount = await prisma.order.count({ where });

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Admin POD orders error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch POD orders'
    }, { status: 500 });
  }
}
