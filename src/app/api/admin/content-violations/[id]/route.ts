import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/content-violations/[id] - Get single violation details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const violation = await (prisma as any).contentViolation.findUnique({
      where: { id },
    });
    
    if (!violation) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }
    
    // Get user's violation history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userHistory = await (prisma as any).contentViolation.findMany({
      where: { userId: violation.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    
    return NextResponse.json({
      violation,
      userHistory,
      userViolationCount: userHistory.length,
    });
  } catch (error) {
    console.error("Error fetching violation:", error);
    return NextResponse.json(
      { error: "Failed to fetch violation" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/content-violations/[id] - Review/take action on violation
 * 
 * Body:
 * - action: "WARNED" | "BANNED" | "DISMISSED"
 * - notes: Admin notes (optional)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;
    
    if (!action || !["WARNED", "BANNED", "DISMISSED"].includes(action)) {
      return NextResponse.json(
        { error: "Valid action required: WARNED, BANNED, or DISMISSED" },
        { status: 400 }
      );
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const violation = await (prisma as any).contentViolation.findUnique({
      where: { id },
    });
    
    if (!violation) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }
    
    // Update the violation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).contentViolation.update({
      where: { id },
      data: {
        reviewed: true,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        action,
        adminNotes: notes || null,
      },
    });
    
    // If action is BANNED, we could also update the user's status
    if (action === "BANNED") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).user.update({
        where: { id: violation.userId },
        data: {
          // Add a flag or update role - depends on your user model
          // For now, just log it
        },
      });
      console.log(`[Content Violation] User ${violation.userId} marked for ban due to violation ${id}`);
    }
    
    // Create notification for the user if warned
    if (action === "WARNED") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).notification.create({
          data: {
            userId: violation.userId,
            type: "POLICY_WARNING",
            title: "Message Policy Warning",
            message: "Your message contained contact information that was redacted. Sharing contact details to avoid platform fees is against our terms of service. Repeated violations may result in account suspension.",
            data: {
              violationId: id,
              commissionId: violation.commissionId,
            },
          },
        });
      } catch (notifError) {
        console.error("Failed to create warning notification:", notifError);
      }
    }
    
    return NextResponse.json({
      success: true,
      violation: updated,
    });
  } catch (error) {
    console.error("Error updating violation:", error);
    return NextResponse.json(
      { error: "Failed to update violation" },
      { status: 500 }
    );
  }
}
