import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/commission-requests/clear-payment-session - Clear stuck payment session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 });
    }

    // Find the commission request
    const commissionRequest = await prisma.commissionRequest.findUnique({
      where: { id: requestId },
    });

    if (!commissionRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify ownership
    if (commissionRequest.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent clearing payment session if already paid
    if (commissionRequest.isPaid) {
      return NextResponse.json(
        { error: "This payment has already been completed" },
        { status: 400 }
      );
    }

    // Clear the payment reference to allow a new session
    await prisma.commissionRequest.update({
      where: { id: requestId },
      data: {
        paymentReference: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear payment session error:", error);
    
    // Handle Prisma database errors
    if (error instanceof Error && error.message.includes("prisma")) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }
    
    // Default: server error
    return NextResponse.json(
      { error: "Failed to clear payment session. Please try again later." },
      { status: 500 }
    );
  }
}
