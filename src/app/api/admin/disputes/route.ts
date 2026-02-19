import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { prismaErrorResponse } from "@/lib/prismaError";

// GET - List all disputed commissions for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // all, active, resolved
    const pageParam = parseInt(searchParams.get("page") || "1");
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100);
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: Record<string, unknown> = {
      isDisputed: true
    };
    
    if (status === "active") {
      where.disputeResolvedAt = null;
    } else if (status === "resolved") {
      where.disputeResolvedAt = { not: null };
    }
    
    const [disputes, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.commissionRequest.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          designerQuote: true,
          isDisputed: true,
          disputeReason: true,
          disputedAt: true,
          disputeResolvedAt: true,
          disputeResolution: true,
          paymentMethod: true,
          paymentReference: true,
          paidAt: true,
          createdAt: true,
          requesterId: true,
          requesterName: true,
          requesterEmail: true,
          designerId: true,
          designerName: true,
          designerEmail: true,
        },
        orderBy: [
          { disputeResolvedAt: "asc" }, // Unresolved first (null first)
          { disputedAt: "desc" }
        ],
        skip,
        take: limit
      }),
      prisma.commissionRequest.count({ where })
    ]);
    
    return NextResponse.json({
      disputes: disputes.map(d => ({
        ...d,
        requester: {
          id: d.requesterId,
          name: d.requesterName,
          email: d.requesterEmail,
        },
        designer: {
          id: d.designerId,
          name: d.designerName,
          email: d.designerEmail,
        }
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    const prismaResp = prismaErrorResponse(error, "Database temporarily unavailable");
    if (prismaResp) return prismaResp;
    
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}
