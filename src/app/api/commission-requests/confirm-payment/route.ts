import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { sendPaymentReceivedToDesigner } from "@/lib/email";
import { auditPaymentConfirmed } from "@/lib/audit-log";
import { getCommissionRate } from "@/lib/commission-tiers";

/**
 * POST /api/commission-requests/confirm-payment - Confirm payment for a commission
 * 
 * DEPRECATED: Stripe payments should use webhook confirmation only.
 * This endpoint is kept ONLY for Paystack manual verification as fallback.
 * 
 * For Stripe: Payment is marked as PAID via webhook automatically.
 * Do NOT use this endpoint for Stripe payments - it bypasses safety checks.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, reference } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 });
    }

    if (!reference) {
      return NextResponse.json({ error: "Payment reference required" }, { status: 400 });
    }

    // Find the commission request
    const commissionRequest = await prisma.commissionRequest.findUnique({
      where: { id: requestId },
      include: {
        designer: {
          select: { id: true, name: true, displayName: true, email: true },
        },
        requester: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!commissionRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify ownership
    if (commissionRequest.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If already paid, return success
    if (commissionRequest.isPaid) {
      return NextResponse.json({
        message: "Payment already confirmed",
        commissionRequest,
      });
    }

    // Verify the status is QUOTED
    if (commissionRequest.status !== "QUOTED") {
      return NextResponse.json(
        { error: "Invalid request status" },
        { status: 400 }
      );
    }

    const quote = commissionRequest.designerQuote;
    if (!quote) {
      return NextResponse.json({ error: "No quote found" }, { status: 400 });
    }

    let paymentVerified = false;
    let paymentReference = reference || "";

    // STRIPE: REJECT - Use webhook confirmation only
    if (!reference || !reference.startsWith("comm_")) {
      return NextResponse.json(
        { 
          error: "Stripe payments are confirmed via webhook automatically. Do not use this endpoint for Stripe.",
          note: "If payment succeeded but not confirmed, please contact support."
        },
        { status: 400 }
      );
    }

    // PAYSTACK ONLY: Verify reference with Paystack
    if (reference.startsWith("comm_")) {
      try {
        const verificationResult = await verifyTransaction(reference);
        if (verificationResult.status && verificationResult.data?.status === "success") {
          paymentVerified = true;
          paymentReference = reference;
        }
      } catch (err) {
        console.error("Paystack verification error:", err);
      }
    }

    if (!paymentVerified) {
      return NextResponse.json(
        { error: "Payment verification pending. Please wait for confirmation." },
        { status: 400 }
      );
    }

    // Calculate earnings using LOCKED commission rate from quote time
    // This prevents rate changes from affecting the payment
    let commissionRate = commissionRequest.quotedCommissionRate;
    
    if (!commissionRate) {
      // If rate wasn't locked (old quotes), calculate but DO NOT update
      const designer = await prisma.user.findUnique({
        where: { id: commissionRequest.designerId },
        select: { totalEarnings: true, designerTier: true }
      });
      const totalEarnings = designer?.totalEarnings ?? 0;
      const isProSubscriber = designer?.designerTier === 'VIP_DESIGNER' || designer?.designerTier === 'VVIP_DESIGNER';
      commissionRate = getCommissionRate(totalEarnings, isProSubscriber);
    }
    
    const platformFee = quote * commissionRate;
    const designerEarnings = quote - platformFee;

    // ATOMIC UPDATE: Use updateMany with conditions to prevent race conditions
    // This ensures only one request can succeed if multiple confirmations arrive simultaneously
    const updateResult = await prisma.commissionRequest.updateMany({
      where: {
        id: requestId,
        isPaid: false, // Only update if not already paid
        status: "QUOTED", // Only update if still in QUOTED status
      },
      data: {
        status: "PAID",
        isPaid: true,
        paidAt: new Date(),
        paymentReference,
        platformFee,
        designerEarnings,
      },
    });

    // If no rows were updated, it means another request already confirmed payment
    if (updateResult.count === 0) {
      // Double-check if it was just paid
      const currentState = await prisma.commissionRequest.findUnique({
        where: { id: requestId },
        select: { isPaid: true, status: true },
      });
      
      if (currentState?.isPaid) {
        return NextResponse.json({
          message: "Payment already confirmed",
        });
      }
      
      return NextResponse.json(
        { error: "Payment confirmation failed - invalid state" },
        { status: 400 }
      );
    }

    // Fetch the updated request for response
    const updatedRequest = await prisma.commissionRequest.findUnique({
      where: { id: requestId },
      include: {
        designer: {
          select: { id: true, name: true, displayName: true, email: true },
        },
      },
    });

    // Audit log for payment confirmation
    await auditPaymentConfirmed(
      request,
      session.user.id,
      session.user.email || null,
      requestId,
      {
        amount: quote,
        paymentMethod: paymentReference.startsWith("comm_") ? "paystack" : "stripe",
        reference: paymentReference,
      }
    );

    // Send email notification to designer
    try {
      await sendPaymentReceivedToDesigner({
        requesterName: commissionRequest.requester.name || "Client",
        requesterEmail: commissionRequest.requester.email || "",
        designerName: commissionRequest.designer.displayName || commissionRequest.designer.name || "Designer",
        designerEmail: commissionRequest.designer.email,
        title: commissionRequest.title,
        requestId: commissionRequest.id,
      });
      console.log(`[Email] Payment notification sent to designer: ${commissionRequest.designer.email}`);
    } catch (emailError) {
      console.error("Failed to send payment email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: "Payment confirmed successfully",
      commissionRequest: updatedRequest,
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    
    // Handle Prisma database errors
    if (error instanceof Error && error.message.includes("prisma")) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }
    
    // Handle Paystack/network errors
    if (error instanceof Error && error.message.includes("verification temporarily")) {
      return NextResponse.json(
        { error: "Payment verification service temporarily unavailable. Please try again." },
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
      { error: "Failed to confirm payment. Please try again later." },
      { status: 500 }
    );
  }
}
