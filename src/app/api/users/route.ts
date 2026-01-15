import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Maximum limit to prevent memory exhaustion
const MAX_LIMIT = 50;

/**
 * GET /api/users - Get list of users (public designer directory)
 * 
 * Query params:
 * - role: Filter by role (SELLER, USER, ADMIN)
 * - designers: If "true", show users who are SELLER or have uploaded designs
 * - acceptingCommissions: If "true", only show designers accepting commissions
 * - search: Search by name or displayName
 * - page: Page number (default 1)
 * - limit: Results per page (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const designers = searchParams.get("designers");
    const acceptingCommissions = searchParams.get("acceptingCommissions");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10)), MAX_LIMIT);

    // Build where clause
    const where: Record<string, unknown> = {};

    // If designers=true, show SELLERS or users with at least 1 design
    if (designers === "true") {
      where.OR = [
        { role: "SELLER" },
        { designs: { some: {} } }
      ];
      
      // Optionally filter to only those accepting commissions
      if (acceptingCommissions === "true") {
        where.acceptsCommissions = true;
        where.commissionStatus = "OPEN";
      }
    } else if (role) {
      where.role = role;
    }

    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
      
      // If we already have OR conditions, we need to use AND
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isVerified: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          displayName: true,
          image: true,
          bio: true,
          isVerified: true,
          verificationBadge: true,
          designerTier: true,
          role: true,
          createdAt: true,
          acceptsCommissions: true,
          commissionStatus: true,
          commissionMinBudget: true,
          commissionMaxBudget: true,
          commissionTurnaround: true,
          _count: {
            select: {
              designs: true,
              followers: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to get users" },
      { status: 500 }
    );
  }
}
