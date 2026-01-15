import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { processStripeRefund, processPaystackRefund } from "@/lib/refund-service";
import { convertUSDToNGN } from "@/lib/paystack";
import { initiateCommissionTransfer } from "@/lib/transfer-service";
import { auditDisputeResolved } from "@/lib/audit-log";
import { 
  sendDisputeResolvedToClient, 
  sendDisputeResolvedToDesigner 
} from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single dispute details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    
    const { id } = await params;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispute = await (prisma as any).commissionRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        },
        designer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            sellerAccount: {
              select: {
                businessName: true,
                bankName: true,
                accountNumber: true,
                accountName: true,
                paystackSubaccountCode: true
              }
            }
          }
        }
      }
    });
    
    if (!dispute) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }
    
    return NextResponse.json({ dispute });
  } catch (error) {
    console.error("Error fetching dispute:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispute" },
      { status: 500 }
    );
  }
}

// POST - Resolve a dispute
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    });
    
    if (admin?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const { 
      resolution, // 'refund_full', 'refund_partial', 'pay_designer', 'dismiss', 'split'
      refundPercentage, // For partial refund or split (0-100)
      notes
    } = body;
    
    if (!resolution) {
      return NextResponse.json(
        { error: "Resolution type is required" },
        { status: 400 }
      );
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commission = await (prisma as any).commissionRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        designer: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            sellerAccount: {
              select: {
                paystackSubaccountCode: true,
                accountNumber: true,
                bankName: true,
                accountName: true
              }
            }
          }
        }
      }
    });
    
    if (!commission) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }
    
    if (!commission.isDisputed) {
      return NextResponse.json(
        { error: "This commission is not in dispute" },
        { status: 400 }
      );
    }
    
    if (commission.disputeResolvedAt) {
      return NextResponse.json(
        { error: "This dispute has already been resolved" },
        { status: 400 }
      );
    }
    
    // Use designerQuote (correct field name) instead of quotedAmount
    const quotedAmount = commission.designerQuote || 0;
    // Use tiered commission rate for disputes (default to 10% if designer not found)
    const designer = await prisma.user.findUnique({
      where: { id: commission.designerId },
      select: { totalEarnings: true, designerTier: true }
    });
    const { getCommissionRate } = await import('@/lib/commission-tiers');
    const totalEarnings = designer?.totalEarnings ?? 0;
    const isProSubscriber = designer?.designerTier === 'VIP_DESIGNER' || designer?.designerTier === 'VVIP_DESIGNER';
    const commissionRate = getCommissionRate(totalEarnings, isProSubscriber);
    const platformFee = quotedAmount * commissionRate;
    const designerPortion = quotedAmount - platformFee;
    
    let refundAmount = 0;
    let designerPayoutAmount = 0;
    let resolutionDescription = "";
    
    switch (resolution) {
      case "refund_full":
        refundAmount = quotedAmount;
        designerPayoutAmount = 0;
        resolutionDescription = "Full refund issued to client";
        break;
        
      case "refund_partial":
        if (!refundPercentage || refundPercentage < 0 || refundPercentage > 100) {
          return NextResponse.json(
            { error: "Valid refund percentage required (0-100)" },
            { status: 400 }
          );
        }
        refundAmount = quotedAmount * (refundPercentage / 100);
        designerPayoutAmount = designerPortion * ((100 - refundPercentage) / 100);
        resolutionDescription = `${refundPercentage}% refund to client, ${100 - refundPercentage}% to designer`;
        break;
        
      case "pay_designer":
        refundAmount = 0;
        designerPayoutAmount = designerPortion;
        resolutionDescription = "Full payment released to designer";
        break;
        
      case "split":
        const splitPercentage = refundPercentage ?? 50;
        if (splitPercentage < 0 || splitPercentage > 100) {
          return NextResponse.json(
            { error: "Invalid split percentage (must be 0-100)" },
            { status: 400 }
          );
        }
        refundAmount = quotedAmount * (splitPercentage / 100);
        designerPayoutAmount = designerPortion * ((100 - splitPercentage) / 100);
        resolutionDescription = `${splitPercentage}% to client, ${100 - splitPercentage}% to designer`;
        break;
        
      case "dismiss":
        resolutionDescription = "Dispute dismissed - no action taken";
        break;
        
      default:
        return NextResponse.json(
          { error: "Invalid resolution type" },
          { status: 400 }
        );
    }
    
    // Process refund if needed
    let refundResult = null;
    if (refundAmount > 0 && commission.paymentMethod && commission.paymentReference) {
      try {
        if (commission.paymentMethod === "stripe") {
          refundResult = await processStripeRefund(
            commission.paymentReference,
            Math.round(refundAmount * 100) // Stripe uses cents
          );
        } else if (commission.paymentMethod === "paystack") {
          // Convert USD to NGN since Paystack expects the original payment currency
          const refundAmountNGN = await convertUSDToNGN(refundAmount);
          refundResult = await processPaystackRefund(
            commission.paymentReference,
            refundAmountNGN
          );
        }
      } catch (refundError) {
        console.error("Refund processing error:", refundError);
        return NextResponse.json(
          { error: "Failed to process refund. Please try again or process manually." },
          { status: 500 }
        );
      }
    }
    
    // Process designer payout if needed
    let payoutResult = null;
    if (designerPayoutAmount > 0) {
      // IDEMPOTENCY: Check if payout was already initiated
      if (commission.payoutInitiatedAt) {
        return NextResponse.json(
          { error: "Payout was already initiated for this commission. Check payout status before retrying." },
          { status: 400 }
        );
      }
      
      try {
        payoutResult = await initiateCommissionTransfer({
          commissionRequestId: commission.id,
          designerId: commission.designerId,
          designerEarnings: designerPayoutAmount,
          commissionTitle: commission.title
        });
      } catch (payoutError) {
        console.error("Designer payout error:", payoutError);
      }
    }
    
    // Update commission record
    // For dismiss, restore to previous status (DELIVERED if work was delivered, otherwise IN_PROGRESS)
    const dismissRestoredStatus = commission.deliverables && commission.deliverables.length > 0 
      ? "DELIVERED" 
      : "IN_PROGRESS";
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedCommission = await (prisma as any).commissionRequest.update({
      where: { id },
      data: {
        disputeResolvedAt: new Date(),
        disputeResolution: `${resolution}: ${resolutionDescription}. ${notes || ""}`.trim(),
        isDisputed: resolution === "dismiss" ? false : commission.isDisputed, // Clear dispute flag on dismiss
        status: resolution === "dismiss" ? dismissRestoredStatus : "CANCELLED",
        refundStatus: refundAmount > 0 ? (refundResult?.success ? "COMPLETED" : "FAILED") : null,
        refundAmount: refundAmount > 0 ? refundAmount : null,
        refundReference: refundResult?.refundId || null,
        refundedAt: refundAmount > 0 && refundResult?.success ? new Date() : null,
        refundedBy: session.user.id
      }
    });

    // Audit log for dispute resolution
    await auditDisputeResolved(
      request,
      session.user.id,
      session.user.email || null,
      id,
      {
        resolution,
        refundAmount: refundAmount > 0 ? refundAmount : undefined,
        payoutAmount: designerPayoutAmount > 0 ? designerPayoutAmount : undefined,
      }
    );
    
    // Send notifications
    try {
      if (commission.requester.email) {
        await sendDisputeResolvedToClient({
          email: commission.requester.email,
          clientName: commission.requester.name || "Client",
          designerName: commission.designer.name || "Designer",
          resolution: resolutionDescription,
          refundAmount: refundAmount > 0 ? refundAmount : undefined,
          notes
        });
      }
      
      if (commission.designer.email) {
        await sendDisputeResolvedToDesigner({
          email: commission.designer.email,
          designerName: commission.designer.name || "Designer",
          clientName: commission.requester.name || "Client",
          resolution: resolutionDescription,
          payoutAmount: designerPayoutAmount > 0 ? designerPayoutAmount : undefined,
          notes
        });
      }
    } catch (emailError) {
      console.error("Failed to send dispute resolution emails:", emailError);
    }
    
    // Create admin log entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).notification.create({
      data: {
        userId: session.user.id,
        type: "DISPUTE_RESOLVED",
        title: "Dispute Resolved",
        message: `Resolved dispute for commission ${id}: ${resolutionDescription}`,
        data: {
          commissionId: id,
          resolution,
          refundAmount,
          designerPayoutAmount,
          notes,
          resolvedBy: admin?.name || session.user.id
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Dispute resolved successfully",
      resolution: resolutionDescription,
      refund: refundResult,
      payout: payoutResult,
      commission: updatedCommission
    });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    return NextResponse.json(
      { error: "Failed to resolve dispute" },
      { status: 500 }
    );
  }
}
