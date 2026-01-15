import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/seller/analytics - Get seller analytics data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sellerId = session.user.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days
    const periodDays = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get designs with stats
    const designs = await prisma.design.findMany({
      where: { designerId: sellerId },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        imageUrl: true,
        price: true,
        viewCount: true,
        weeklyViews: true,
        totalSales: true,
        totalRevenue: true,
        createdAt: true,
        _count: {
          select: {
            favorites: true,
            reviews: true,
          },
        },
      },
      orderBy: { totalSales: 'desc' },
    });

    // Get earnings
    const earnings = await prisma.sellerEarning.findMany({
      where: {
        sellerId,
        createdAt: { gte: startDate },
      },
      select: {
        saleAmount: true,
        sellerAmount: true,
        createdAt: true,
        design: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get orders
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            design: { designerId: sellerId },
          },
        },
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
            image: true,
          },
        },
        items: {
          where: {
            design: { designerId: sellerId },
          },
          select: {
            quantity: true,
            price: true,
            purchaseType: true,
            design: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Calculate summary stats
    const totalViews = designs.reduce((sum, d) => sum + d.viewCount, 0);
    const totalSales = designs.reduce((sum, d) => sum + d.totalSales, 0);
    const totalRevenue = designs.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalFavorites = designs.reduce((sum, d) => sum + d._count.favorites, 0);

    // Calculate period-specific stats
    const periodEarnings = earnings.reduce((sum, e) => sum + e.sellerAmount, 0);
    const periodSales = earnings.length;

    // Calculate daily stats for chart
    const dailyStats: Record<string, { views: number; sales: number; revenue: number }> = {};
    for (let i = 0; i < periodDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats[dateKey] = { views: 0, sales: 0, revenue: 0 };
    }

    earnings.forEach((e) => {
      const dateKey = e.createdAt.toISOString().split('T')[0];
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].sales += 1;
        dailyStats[dateKey].revenue += e.sellerAmount;
      }
    });

    // Get top performing designs
    const topDesigns = designs
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Get recent reviews
    const recentReviews = await prisma.review.findMany({
      where: {
        design: { designerId: sellerId },
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            image: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Calculate average rating
    const allReviews = await prisma.review.findMany({
      where: { design: { designerId: sellerId } },
      select: { rating: true },
    });
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    // Calculate conversion rate (sales / views)
    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

    // Get commission earnings data - wrap in try/catch in case schema not yet migrated
    let completedCommissions: Array<{
      id: string;
      title: string;
      designerQuote: number | null;
      designerEarnings: number | null;
      platformFee: number | null;
      completedAt: Date | null;
      paidAt: Date | null;
      clientRating: number | null;
      clientReview: string | null;
      requester: { name: string | null; displayName: string | null; image: string | null } | null;
    }> = [];
    let activeCommissions: Array<{
      id: string;
      title: string;
      status: string;
      designerQuote: number | null;
      designerEarnings: number | null;
      workStartedAt: Date | null;
      deliveredAt: Date | null;
      requester: { name: string | null; displayName: string | null; image: string | null } | null;
    }> = [];
    let pendingCommissions: Array<{
      id: string;
      title: string;
      status: string;
      designerQuote: number | null;
      createdAt: Date;
      requester: { name: string | null; displayName: string | null } | null;
    }> = [];

    try {
      completedCommissions = await prisma.commissionRequest.findMany({
        where: {
          designerId: sellerId,
          status: 'COMPLETED',
        },
        select: {
          id: true,
          title: true,
          designerQuote: true,
          designerEarnings: true,
          platformFee: true,
          completedAt: true,
          paidAt: true,
          clientRating: true,
          clientReview: true,
          requester: {
            select: {
              name: true,
              displayName: true,
              image: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      });

      activeCommissions = await prisma.commissionRequest.findMany({
        where: {
          designerId: sellerId,
          status: {
            in: ['PAID', 'IN_PROGRESS', 'DELIVERED', 'REVISION'],
          },
        },
        select: {
          id: true,
          title: true,
          status: true,
          designerQuote: true,
          designerEarnings: true,
          workStartedAt: true,
          deliveredAt: true,
          requester: {
            select: {
              name: true,
              displayName: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      pendingCommissions = await prisma.commissionRequest.findMany({
        where: {
          designerId: sellerId,
          status: {
            in: ['FORWARDED', 'QUOTED'],
          },
        },
        select: {
          id: true,
          title: true,
          status: true,
          designerQuote: true,
          createdAt: true,
          requester: {
            select: {
              name: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      // CommissionRequest model may not exist yet
      console.log('Commission data not available:', err);
    }

    // Calculate commission stats
    const totalCommissionEarnings = completedCommissions.reduce(
      (sum: number, c) => sum + (c.designerEarnings || 0), 
      0
    );
    const totalCompletedCommissions = completedCommissions.length;
    const activeCommissionCount = activeCommissions.length;
    const pendingCommissionCount = pendingCommissions.length;
    const pendingCommissionValue = activeCommissions.reduce(
      (sum: number, c) => sum + (c.designerEarnings || 0),
      0
    );

    // Commission ratings
    const commissionReviews = completedCommissions.filter(c => c.clientRating);
    const avgCommissionRating = commissionReviews.length > 0
      ? commissionReviews.reduce((sum: number, c) => sum + (c.clientRating || 0), 0) / commissionReviews.length
      : 0;

    return NextResponse.json({
      summary: {
        totalViews,
        totalSales,
        totalRevenue,
        totalFavorites,
        totalDesigns: designs.length,
        avgRating: avgRating.toFixed(1),
        conversionRate: conversionRate.toFixed(2),
        // Commission summary
        totalCommissionEarnings,
        totalCompletedCommissions,
        activeCommissionCount,
        pendingCommissionCount,
        pendingCommissionValue,
        avgCommissionRating: avgCommissionRating.toFixed(1),
        // Combined total earnings
        totalEarnings: totalRevenue + totalCommissionEarnings,
      },
      period: {
        days: periodDays,
        sales: periodSales,
        earnings: periodEarnings,
      },
      dailyStats: Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .reverse(),
      topDesigns,
      recentOrders: orders,
      recentReviews,
      designs,
      // Commission data
      commissions: {
        completed: completedCommissions.slice(0, 10), // Last 10 completed
        active: activeCommissions,
        pending: pendingCommissions,
        stats: {
          totalEarnings: totalCommissionEarnings,
          completedCount: totalCompletedCommissions,
          activeCount: activeCommissionCount,
          pendingCount: pendingCommissionCount,
          pendingValue: pendingCommissionValue,
          avgRating: avgCommissionRating.toFixed(1),
        },
      },
    });
  } catch (error) {
    console.error("Get seller analytics error:", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}
