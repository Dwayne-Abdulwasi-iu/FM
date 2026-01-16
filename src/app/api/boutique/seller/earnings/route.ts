// GET /api/boutique/seller/earnings - Get seller's boutique earnings and payouts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - parseInt(period));

    // Get completed orders with payouts
    const [
      totalEarnings,
      periodEarnings,
      pendingEarnings,
      payouts,
      recentOrders,
      ordersByStatus,
    ] = await Promise.all([
      // Total all-time earnings (completed orders)
      prisma.boutiqueOrder.aggregate({
        where: {
          sellerId: session.user.id,
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
        _sum: { sellerPayout: true },
      }),

      // Period earnings
      prisma.boutiqueOrder.aggregate({
        where: {
          sellerId: session.user.id,
          status: { in: ['COMPLETED', 'DELIVERED'] },
          deliveredAt: { gte: periodStart },
        },
        _sum: { sellerPayout: true },
      }),

      // Pending earnings (paid but not completed)
      prisma.boutiqueOrder.aggregate({
        where: {
          sellerId: session.user.id,
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED'] },
        },
        _sum: { sellerPayout: true },
      }),

      // Payout history
      prisma.boutiqueSellerPayout.findMany({
        where: { sellerId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent orders with earnings
      prisma.boutiqueOrder.findMany({
        where: {
          sellerId: session.user.id,
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          sellerPayout: true,
          platformFee: true,
          createdAt: true,
          deliveredAt: true,
          items: {
            select: {
              quantity: true,
              product: {
                select: { title: true, thumbnailUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Orders by status count
      prisma.boutiqueOrder.groupBy({
        by: ['status'],
        where: { sellerId: session.user.id },
        _count: true,
        _sum: { sellerPayout: true },
      }),
    ]);

    // Calculate available balance (completed orders minus paid out)
    const totalPaidOut = payouts.reduce((sum, p) => 
      p.status === 'COMPLETED' ? sum + p.amount : sum, 0
    );
    const availableBalance = (totalEarnings._sum.sellerPayout || 0) - totalPaidOut;

    return NextResponse.json({
      success: true,
      summary: {
        totalEarnings: totalEarnings._sum.sellerPayout || 0,
        periodEarnings: periodEarnings._sum?.sellerPayout || 0,
        pendingEarnings: pendingEarnings._sum.sellerPayout || 0,
        availableBalance,
        totalPaidOut,
      },
      payouts,
      recentOrders,
      ordersByStatus: ordersByStatus.map(s => ({
        status: s.status,
        count: s._count,
        earnings: s._sum.sellerPayout || 0,
      })),
      period: parseInt(period),
    });
  } catch (error) {
    console.error('Error fetching seller earnings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}
