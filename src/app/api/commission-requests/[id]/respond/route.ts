import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  sendQuoteToClient,
  sendRejectionToClient,
  sendWorkStartedToClient,
  sendDeliverablesReadyToClient,
  sendRefundNoticeToClient,
} from "@/lib/email";
import { processStripeRefund, processPaystackRefund } from "@/lib/refund-service";
import { convertUSDToNGN } from "@/lib/paystack";
import { validateAttachmentUrls } from "@/lib/cloudinary";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/commission-requests/[id]/respond - Designer responds to a request
 * 
 * Actions:
 * - quote: Send a price quote (with optional maxRevisions)
 * - accept: Accept the request (uses client's budget)
 * - reject: Decline the request
 * - start: Mark as in progress (after payment)
 * - deliver: Upload deliverables for review
 * - resubmit: Upload revised deliverables after revision request
 * - cancel: Designer cancels after accepting (triggers refund if paid)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Find the request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commissionRequest = await (prisma as any).commissionRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: { email: true, name: true, displayName: true },
        },
        designer: {
          select: { email: true, name: true, displayName: true },
        },
      },
    });

    if (!commissionRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check authorization - only the designer can respond
    if (commissionRequest.designerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      responseAt: new Date(),
    };

    // Email data
    const emailData = {
      requesterName: commissionRequest.requesterName,
      requesterEmail: commissionRequest.requesterEmail,
      designerName: commissionRequest.designerName,
      designerEmail: commissionRequest.designer.email,
      title: commissionRequest.title,
      requestId: commissionRequest.id,
    };

    // Handle different actions
    switch (action) {
      case "quote":
        if (commissionRequest.status !== "FORWARDED") {
          return NextResponse.json(
            { error: "Can only quote forwarded requests" },
            { status: 400 }
          );
        }
        if (!body.quote || body.quote <= 0) {
          return NextResponse.json(
            { error: "Valid quote amount is required" },
            { status: 400 }
          );
        }
        updateData.status = "QUOTED";
        updateData.designerQuote = body.quote;
        
        // Validate deadline format if provided
        if (body.deadline) {
          const deadlineStr = String(body.deadline).trim();
          // Accept formats: "X days", "X weeks", ISO date, or relative
          const isValidFormat = /^\d+\s*(day|days|week|weeks|month|months)$/i.test(deadlineStr) ||
                               /^\d{4}-\d{2}-\d{2}/.test(deadlineStr) ||
                               !isNaN(Date.parse(deadlineStr));
          if (!isValidFormat) {
            return NextResponse.json(
              { error: "Invalid deadline format. Use 'X days', 'X weeks', or a valid date." },
              { status: 400 }
            );
          }
        }
        updateData.designerDeadline = body.deadline || null;
        updateData.designerResponse = body.message || null;
        // Allow designer to set max revisions (default 3 if not specified)
        if (body.maxRevisions !== undefined) {
          updateData.maxRevisions = Math.max(0, Math.min(10, body.maxRevisions)); // Cap between 0-10
        }

        // Send email to requester about the quote
        await sendQuoteToClient({
          ...emailData,
          quote: body.quote,
          deadline: body.deadline,
          message: body.message,
        });
        break;

      case "accept":
        if (!["FORWARDED"].includes(commissionRequest.status)) {
          return NextResponse.json(
            { error: "Can only accept forwarded requests" },
            { status: 400 }
          );
        }
        // If accepting without quote, use client's budget (if parseable)
        const budgetMatch = commissionRequest.budget?.match(/\$?([\d,]+)/);
        const acceptedPrice = budgetMatch ? parseFloat(budgetMatch[1].replace(",", "")) : 0;
        
        // Prevent zero-value commissions
        if (acceptedPrice <= 0) {
          return NextResponse.json(
            { error: "Cannot accept with $0 price. Please use 'quote' action to set a valid price." },
            { status: 400 }
          );
        }
        
        updateData.status = "QUOTED"; // Still needs payment
        updateData.designerQuote = acceptedPrice;
        updateData.designerResponse = body.message || "I accept this commission request.";
        updateData.designerAcceptedAt = new Date();

        // Send email to requester
        await sendQuoteToClient({
          ...emailData,
          quote: acceptedPrice,
          message: body.message || "I accept this commission request.",
        });
        break;

      case "reject":
        updateData.status = "REJECTED";
        updateData.rejectionReason = body.reason;
        updateData.designerRejectedAt = new Date();

        // Send email to requester about rejection
        await sendRejectionToClient({
          ...emailData,
          message: body.reason,
        });
        break;

      case "start":
        if (commissionRequest.status !== "PAID") {
          return NextResponse.json(
            { error: "Can only start paid requests" },
            { status: 400 }
          );
        }
        updateData.status = "IN_PROGRESS";
        updateData.workStartedAt = new Date();

        // Send email to requester that work has started
        await sendWorkStartedToClient({
          ...emailData,
          deadline: commissionRequest.designerDeadline || undefined,
        });
        break;

      case "deliver":
        // Can deliver from IN_PROGRESS
        if (commissionRequest.status !== "IN_PROGRESS") {
          return NextResponse.json(
            { error: "Can only deliver when work is in progress" },
            { status: 400 }
          );
        }
        
        // Validate deliverables URLs if provided
        if (body.deliverables && body.deliverables.length > 0) {
          const validation = validateAttachmentUrls(body.deliverables);
          if (!validation.valid) {
            return NextResponse.json(
              { error: validation.error },
              { status: 400 }
            );
          }
        }

        // For physical commissions, mark as ready for collection
        if (commissionRequest.isPhysical) {
          updateData.status = "DELIVERED";
          updateData.deliveredAt = new Date();
          updateData.deliveryStatus = "READY_FOR_COLLECTION";
          updateData.readyForCollectionAt = new Date();
          // Collection address (designer's location for pickup)
          if (body.collectionAddress) {
            updateData.collectionAddress = body.collectionAddress;
          }
          // Any notes for admin about collection
          if (body.collectionNotes) {
            updateData.collectionNotes = body.collectionNotes;
          }
          // Photos of the completed item
          if (body.deliverables && body.deliverables.length > 0) {
            updateData.deliverables = body.deliverables;
          }
        } else {
          // Digital commission - require deliverables
          if (!body.deliverables || body.deliverables.length === 0) {
            return NextResponse.json(
              { error: "At least one deliverable is required" },
              { status: 400 }
            );
          }
          updateData.status = "DELIVERED";
          updateData.deliveredAt = new Date();
          updateData.deliverables = body.deliverables;
        }

        // Send email to client that deliverables are ready
        await sendDeliverablesReadyToClient(emailData);
        break;

      case "resubmit":
        // Can resubmit after revision request
        if (commissionRequest.status !== "REVISION") {
          return NextResponse.json(
            { error: "Can only resubmit after revision request" },
            { status: 400 }
          );
        }
        if (!body.deliverables || body.deliverables.length === 0) {
          return NextResponse.json(
            { error: "At least one deliverable is required" },
            { status: 400 }
          );
        }

        // Validate deliverables URLs
        const resubmitValidation = validateAttachmentUrls(body.deliverables);
        if (!resubmitValidation.valid) {
          return NextResponse.json(
            { error: resubmitValidation.error },
            { status: 400 }
          );
        }

        updateData.status = "DELIVERED";
        updateData.deliveredAt = new Date();
        updateData.deliverables = body.deliverables;
        updateData.revisionNotes = null; // Clear revision notes

        // Send email to client that revised deliverables are ready
        await sendDeliverablesReadyToClient(emailData);
        break;

      case "cancel":
        // Designer can cancel after accepting but before completion
        // Full refund to client if paid
        if (!["QUOTED", "PAID", "IN_PROGRESS"].includes(commissionRequest.status)) {
          return NextResponse.json(
            { error: "Can only cancel before completion" },
            { status: 400 }
          );
        }

        if (!body.reason) {
          return NextResponse.json(
            { error: "Cancellation reason is required" },
            { status: 400 }
          );
        }

        // If payment was made, process full refund
        let refundResult = null;
        if (["PAID", "IN_PROGRESS"].includes(commissionRequest.status) && 
            commissionRequest.paymentReference && 
            commissionRequest.paymentMethod) {
          try {
            if (commissionRequest.paymentMethod === "stripe") {
              refundResult = await processStripeRefund(
                commissionRequest.paymentReference,
                Math.round((commissionRequest.designerQuote || 0) * 100)
              );
            } else if (commissionRequest.paymentMethod === "paystack") {
              // Convert USD to NGN since Paystack expects the original payment currency
              const refundAmountNGN = await convertUSDToNGN(commissionRequest.designerQuote || 0);
              refundResult = await processPaystackRefund(
                commissionRequest.paymentReference,
                refundAmountNGN
              );
            }
          } catch (refundError) {
            console.error("Refund processing error:", refundError);
            // Continue with cancellation but mark refund as failed
          }
        }

        updateData.status = "CANCELLED";
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = "DESIGNER";
        updateData.cancellationReason = body.reason;
        
        if (refundResult) {
          updateData.refundStatus = refundResult.success ? "COMPLETED" : "FAILED";
          updateData.refundAmount = commissionRequest.designerQuote;
          updateData.refundReference = refundResult.refundId;
          updateData.refundedAt = refundResult.success ? new Date() : null;
          updateData.refundReason = "Designer cancelled the commission";
        }

        // Send refund notification to client
        if (commissionRequest.designerQuote && refundResult?.success) {
          await sendRefundNoticeToClient({
            requesterEmail: commissionRequest.requesterEmail,
            requesterName: commissionRequest.requesterName,
            title: commissionRequest.title,
            requestId: commissionRequest.id,
            amount: commissionRequest.designerQuote,
            reason: `Designer cancelled: ${body.reason}`
          });
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update the request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedRequest = await (prisma as any).commissionRequest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Respond to commission request error:", error);
    return NextResponse.json(
      { error: "Failed to respond to request" },
      { status: 500 }
    );
  }
}
