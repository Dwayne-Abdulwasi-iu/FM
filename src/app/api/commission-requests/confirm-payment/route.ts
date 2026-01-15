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
 * This is called after successful payment redirect
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

    // If Paystack reference is provided, verify with Paystack
    if (reference && reference.startsWith("comm_")) {
      try {
        const verificationResult = await verifyTransaction(reference);
        if (verificationResult.status && verificationResult.data?.status === "success") {
          paymentVerified = true;
          paymentReference = reference;
        }
      } catch (err) {
        console.error("Paystack verification error:", err);
      }
    } else {
      // For Stripe, payment should be verified via webhook
      // Here we'll trust the redirect but the webhook should have already updated the status
      // Check if webhook already updated
      const refreshed = await prisma.commissionRequest.findUnique({
        where: { id: requestId },
      });
      
      if (refreshed?.isPaid) {
        return NextResponse.json({
          message: "Payment confirmed via webhook",
          commissionRequest: refreshed,
        });
      }
      
      // SECURITY: Only allow dev mode bypass if explicitly enabled AND not in production
      // This prevents accidental bypass if NODE_ENV is misconfigured
      const isProduction = process.env.VERCEL_ENV === 'production' || 
                          process.env.NODE_ENV === 'production' ||
                          process.env.RAILWAY_ENVIRONMENT === 'production' ||
                          process.env.RENDER === 'true';
      const allowDevBypass = !isProduction && 
                             process.env.NODE_ENV === "development" && 
                             process.env.ALLOW_DEV_PAYMENT_BYPASS === "true";
      
      if (allowDevBypass) {
        console.warn("[SECURITY] DEV MODE: Bypassing payment verification for commission:", requestId);
        paymentVerified = true;
        paymentReference = `dev_${Date.now()}`;
      }
    }

    if (!paymentVerified) {
      return NextResponse.json(
        { error: "Payment verification pending. Please wait for confirmation." },
        { status: 400 }
      );
    }

    // Calculate earnings using designer's tiered rate
    const designer = await prisma.user.findUnique({
      where: { id: commissionRequest.designerId },
      select: { totalEarnings: true, designerTier: true }
    });
    const totalEarnings = designer?.totalEarnings ?? 0;
    const isProSubscriber = designer?.designerTier === 'VIP_DESIGNER' || designer?.designerTier === 'VVIP_DESIGNER';
    const commissionRate = getCommissionRate(totalEarnings, isProSubscriber);
    
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
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
