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
    
    const violation = await prisma.contentViolation.findUnique({
      where: { id },
    });
    
    if (!violation) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }
    
    // Get user's violation history
    const userHistory = await prisma.contentViolation.findMany({
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
    
    const violation = await prisma.contentViolation.findUnique({
      where: { id },
    });
    
    if (!violation) {
      return NextResponse.json({ error: "Violation not found" }, { status: 404 });
    }
    
    // Update the violation
    const updated = await prisma.contentViolation.update({
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
      await prisma.user.update({
        where: { id: violation.userId },
        data: {
          // Add a flag or update role - depends on your user model
          // For now, just log it
        },
      });
      console.log(`[Content Violation] User ${violation.userId} marked for ban due to violation ${id}`);
    }
    
    // Create notification and send email for the user if warned
    if (action === "WARNED") {
      try {
        // Get user details for email
        const user = await prisma.user.findUnique({
          where: { id: violation.userId },
          select: { email: true, name: true },
        });

        // Create platform notification
        await prisma.notification.create({
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

        // Send email warning
        if (user?.email) {
          try {
            await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: user.email,
                subject: 'Content Policy Warning - Fashion Marketplace',
                html: `
                  <h2>Content Policy Warning</h2>
                  <p>Hi ${user.name || 'User'},</p>
                  <p>Your recent message in commission <strong>${violation.commissionTitle}</strong> contained ${violation.violationType.toLowerCase()} information that violates our messaging policy.</p>
                  <p><strong>Policy:</strong> Sharing contact details to avoid platform fees is strictly prohibited. The platform exists to protect both buyers and sellers.</p>
                  <p><strong>What happened:</strong> Your message was automatically redacted to prevent the sharing of contact information.</p>
                  <p><strong>Consequences:</strong> Repeated violations may result in account suspension or permanent banning.</p>
                  <p>If you believe this is an error, please <a href="https://fashionmarketplace.com/support">contact our support team</a>.</p>
                  <p>Best regards,<br/>Fashion Marketplace Team</p>
                `,
              }),
            });
          } catch (emailError) {
            console.error('Failed to send warning email:', emailError);
          }
        }
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
