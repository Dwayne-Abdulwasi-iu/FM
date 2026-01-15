import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/pod/stats
 * Get POD statistics for admin dashboard
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all POD orders
    const podOrders = await prisma.order.findMany({
      where: { orderType: 'POD' },
      select: {
        id: true,
        podStatus: true,
        podProvider: true,
        totalAmount: true,
        platformFee: true
      }
    });

    // Calculate statistics
    const stats = {
      totalOrders: podOrders.length,
      pendingOrders: podOrders.filter(o => o.podStatus === 'pending' || !o.podStatus).length,
      inProductionOrders: podOrders.filter(o => o.podStatus === 'in_production').length,
      shippedOrders: podOrders.filter(o => o.podStatus === 'shipped').length,
      deliveredOrders: podOrders.filter(o => o.podStatus === 'delivered').length,
      totalRevenue: podOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      totalPlatformFees: podOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0),
      byProvider: {
        printful: podOrders.filter(o => o.podProvider === 'printful').length,
        printify: podOrders.filter(o => o.podProvider === 'printify').length,
        other: podOrders.filter(o => o.podProvider && !['printful', 'printify'].includes(o.podProvider)).length
      }
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Admin POD stats error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch POD stats'
    }, { status: 500 });
  }
}
