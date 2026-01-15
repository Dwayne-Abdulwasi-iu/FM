import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Maximum limit to prevent memory exhaustion
const MAX_LIMIT = 50;

/**
 * GET /api/trending - Get trending designs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "WEEKLY";
    const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), MAX_LIMIT);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {
      isActive: true,
      approvalStatus: 'APPROVED',
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    // Get designs sorted by trending score
    const designs = await prisma.design.findMany({
      where: where as any,
      take: limit,
      orderBy: [
        { trendingScore: 'desc' },
        { weeklyViews: 'desc' },
        { totalSales: 'desc' },
      ],
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
            isVerified: true,
            verificationBadge: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
    });

    // Also get rising stars (new designs with high engagement)
    const risingStars = await prisma.design.findMany({
      where: {
        ...where as any,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      take: 6,
      orderBy: [
        { viewCount: 'desc' },
        { totalSales: 'desc' },
      ],
      include: {
        designer: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
    });

    return NextResponse.json({
      trending: designs,
      risingStars,
      period,
    });
  } catch (error) {
    console.error("Get trending error:", error);
    return NextResponse.json(
      { error: "Failed to get trending designs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trending/calculate - Calculate trending scores (cron job)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a cron job or admin request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active designs with their stats
    const designs = await prisma.design.findMany({
      where: { isActive: true, approvalStatus: 'APPROVED' },
      select: {
        id: true,
        viewCount: true,
        weeklyViews: true,
        monthlyViews: true,
        totalSales: true,
        createdAt: true,
        _count: {
          select: {
            favorites: true,
            reviews: true,
          },
        },
      },
    });

    // Calculate trending score for each design
    const updates = designs.map((design) => {
      // Factors:
      // - Recent views (weekly) - higher weight
      // - Total sales
      // - Favorites
      // - Recency (newer designs get a boost)
      
      const ageInDays = (Date.now() - new Date(design.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 1 - (ageInDays / 30)); // Boost for designs < 30 days old
      
      const trendingScore = 
        (design.weeklyViews * 3) + // Weekly views weighted heavily
        (design.totalSales * 10) + // Sales are important
        (design._count.favorites * 2) + // Favorites show interest
        (design._count.reviews * 5) + // Reviews indicate engagement
        (recencyBoost * 50); // Recency boost

      return prisma.design.update({
        where: { id: design.id },
        data: {
          trendingScore,
          lastTrendingCalc: new Date(),
        },
      });
    });

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      designsUpdated: designs.length,
    });
  } catch (error) {
    console.error("Calculate trending error:", error);
    return NextResponse.json(
      { error: "Failed to calculate trending" },
      { status: 500 }
    );
  }
}
