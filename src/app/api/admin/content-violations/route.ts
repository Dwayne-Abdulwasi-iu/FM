import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/content-violations - Get all content violations
 * 
 * Query params:
 * - status: "all" | "pending" | "reviewed" (default: "pending")
 * - userId: Filter by specific user
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const userId = searchParams.get("userId");
    const pageParam = parseInt(searchParams.get("page") || "1");
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status === "pending") {
      where.reviewed = false;
    } else if (status === "reviewed") {
      where.reviewed = true;
    }
    // "all" = no filter
    
    if (userId) {
      where.userId = userId;
    }
    
    // Get total count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = await (prisma as any).contentViolation.count({ where });
    
    // Get violations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const violations = await (prisma as any).contentViolation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // Fetch user data separately for each violation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const violationsWithUsers = await Promise.all(
      violations.map(async (violation: any) => {
        try {
          const user = await (prisma as any).user.findUnique({
            where: { id: violation.userId },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });
          return { ...violation, user: user || { id: violation.userId, name: "Unknown", email: violation.userEmail } };
        } catch (err) {
          return { ...violation, user: { id: violation.userId, name: "Unknown", email: violation.userEmail } };
        }
      })
    );
    
    // Get stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = await (prisma as any).contentViolation.groupBy({
      by: ["violationType"],
      _count: { violationType: true },
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingCount = await (prisma as any).contentViolation.count({
      where: { reviewed: false },
    });
    
    return NextResponse.json({
      violations: violationsWithUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        pending: pendingCount,
        byType: stats.reduce((acc: Record<string, number>, item: { violationType: string; _count: { violationType: number } }) => {
          acc[item.violationType] = item._count.violationType;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Error fetching content violations:", error);
    
    // Log more details if it's a Prisma error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json(
      { error: "Failed to fetch violations", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
