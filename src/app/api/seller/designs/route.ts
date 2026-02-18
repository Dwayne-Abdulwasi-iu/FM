import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Maximum page size to prevent memory exhaustion
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sellerId = session.user.id;

    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const requestedLimit = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10);
    const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const whereClause = {
      designerId: sellerId,
    };

    // Get all designs by this seller with stats
    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          imageUrl: true,
          thumbnailUrl: true,
          category: true,
          viewCount: true,
          totalSales: true,
          totalRevenue: true,
          createdAt: true,
          _count: {
            select: {
              favorites: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.design.count({ where: whereClause })
    ]);

    // Get admin-featured status for these designs
    const designIds = designs.map(d => d.id)
    const adminFeaturedDesigns = await prisma.adminFeaturedItem.findMany({
      where: {
        itemType: 'DESIGN',
        itemId: { in: designIds }
      },
      select: { itemId: true }
    })
    
    const adminFeaturedIds = new Set(adminFeaturedDesigns.map(item => item.itemId))

    // Return designs with placeholder rating (reviews relation may not exist)
    const designsWithRating = designs.map(design => {
      return {
        ...design,
        avgRating: 0, // Reviews may not be available in this model
        addedByAdmin: adminFeaturedIds.has(design.id)
      };
    });

    return NextResponse.json({ 
      designs: designsWithRating,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get seller designs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch designs" },
      { status: 500 }
    );
  }
}
