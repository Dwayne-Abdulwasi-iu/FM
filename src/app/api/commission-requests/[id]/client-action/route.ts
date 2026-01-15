import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  sendRevisionRequestToDesigner,
  sendApprovalToDesigner,
  sendCompletionToClient,
  sendDisputeToAdmin,
} from "@/lib/email";
import { initiateCommissionTransfer } from "@/lib/transfer-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/commission-requests/[id]/client-action - Client actions on a commission
 * 
 * Actions:
 * - cancel: Cancel the request (before payment or if disputed)
 * - approve: Approve deliverables and complete
 * - revision: Request revisions
 * - dispute: File a dispute
 * - review: Leave a rating and review
 * - confirm_delivery: Confirm receipt of physical item
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
    const commissionRequest = await prisma.commissionRequest.findUnique({
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

    // TypeScript: commissionRequest includes designerEarnings, designerId, etc. from schema

    // Check authorization - only the requester can perform client actions
    if (commissionRequest.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};

    // Email data for notifications
    const emailData = {
      requesterName: commissionRequest.requesterName,
      requesterEmail: commissionRequest.requesterEmail,
      designerName: commissionRequest.designerName,
      designerEmail: commissionRequest.designer.email,
      title: commissionRequest.title,
      requestId: commissionRequest.id,
    };

    switch (action) {
      case "cancel":
        // Can only cancel before payment, or during a dispute
        const cancellableStatuses = ["PENDING", "FORWARDED", "QUOTED"];
        if (!cancellableStatuses.includes(commissionRequest.status) && !commissionRequest.isDisputed) {
          return NextResponse.json(
            { error: "Cannot cancel at this stage. Consider filing a dispute." },
            { status: 400 }
          );
        }

        updateData.status = "CANCELLED";
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = session.user.id;
        updateData.cancellationReason = body.reason || "Cancelled by client";
        break;

      case "approve":
        // Can only approve delivered work
        if (commissionRequest.status !== "DELIVERED") {
          return NextResponse.json(
            { error: "Can only approve delivered work" },
            { status: 400 }
          );
        }

        // Check if payout was already initiated (idempotency)
        if (commissionRequest.payoutInitiatedAt) {
          return NextResponse.json(
            { error: "This commission has already been processed for payout" },
            { status: 400 }
          );
        }

        // Trigger payout to designer with proper transaction handling
        if (commissionRequest.designerEarnings && commissionRequest.designerEarnings > 0) {
          // STEP 1: First, commit the payout initiation to DB BEFORE calling transfer
          // This prevents double payouts - if we crash after transfer but before update,
          // the retry cron will see payoutInitiatedAt is set and won't retry
          await prisma.commissionRequest.update({
            where: { id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              payoutInitiatedAt: new Date(),
              payoutStatus: "PROCESSING",
            },
          });

          // STEP 2: Now call the transfer (safe because payoutInitiatedAt is committed)
          try {
            const transferResult = await initiateCommissionTransfer({
              commissionRequestId: id,
              designerId: commissionRequest.designerId,
              designerEarnings: commissionRequest.designerEarnings,
              commissionTitle: commissionRequest.title,
            });

            // STEP 3: Update with the result
            if (transferResult.success) {
              console.log(`Commission payout initiated for ${id}: ${transferResult.reference}`);
              await prisma.commissionRequest.update({
                where: { id },
                data: {
                  payoutStatus: "COMPLETED",
                  payoutCompletedAt: new Date(),
                  payoutReference: transferResult.reference,
                  payoutAmount: commissionRequest.designerEarnings,
                },
              });
            } else {
              console.warn(`Commission payout failed for ${id}: ${transferResult.error}`);
              await prisma.commissionRequest.update({
                where: { id },
                data: {
                  payoutStatus: "FAILED",
                  payoutFailedReason: transferResult.error,
                },
              });
            }
          } catch (payoutError) {
            console.error(`Error initiating commission payout for ${id}:`, payoutError);
            await prisma.commissionRequest.update({
              where: { id },
              data: {
                payoutStatus: "FAILED",
                payoutFailedReason: payoutError instanceof Error ? payoutError.message : "Unknown error",
              },
            });
          }

          // Send emails
          await sendApprovalToDesigner(emailData);
          await sendCompletionToClient(emailData);

          // Return early since we handled the DB update above
          return NextResponse.json({
            success: true,
            message: "Commission approved and payout initiated",
          });
        }

        // If no earnings, just mark as completed
        updateData.status = "COMPLETED";
        updateData.completedAt = new Date();

        // Send emails
        await sendApprovalToDesigner(emailData);
        await sendCompletionToClient(emailData);
        break;

      case "revision":
        // Can only request revision on delivered work
        if (commissionRequest.status !== "DELIVERED") {
          return NextResponse.json(
            { error: "Can only request revisions on delivered work" },
            { status: 400 }
          );
        }

        // Check revision limit (default to 2 if not set)
        const maxRevisions = commissionRequest.maxRevisions ?? 2;
        if (commissionRequest.revisionCount >= maxRevisions) {
          return NextResponse.json(
            { error: `Maximum ${maxRevisions} revisions allowed. Consider filing a dispute if unsatisfied.` },
            { status: 400 }
          );
        }

        if (!body.notes || body.notes.trim().length < 10) {
          return NextResponse.json(
            { error: "Please provide detailed revision feedback (at least 10 characters)" },
            { status: 400 }
          );
        }

        updateData.status = "REVISION";
        updateData.revisionCount = commissionRequest.revisionCount + 1;
        updateData.revisionNotes = body.notes;
        updateData.revisionRequestedAt = new Date();

        // Send email to designer
        await sendRevisionRequestToDesigner({
          ...emailData,
          message: body.notes,
        });
        break;

      case "dispute":
        // Can dispute if in progress, delivered, or revision
        const disputableStatuses = ["IN_PROGRESS", "DELIVERED", "REVISION", "PAID"];
        if (!disputableStatuses.includes(commissionRequest.status)) {
          return NextResponse.json(
            { error: "Cannot dispute at this stage" },
            { status: 400 }
          );
        }

        // Rate limiting: Check if already disputed recently (prevent spam)
        if (commissionRequest.disputedAt) {
          const hoursSinceLastDispute = 
            (Date.now() - new Date(commissionRequest.disputedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastDispute < 24) {
            return NextResponse.json(
              { error: "You can only file one dispute per 24 hours on this commission" },
              { status: 429 }
            );
          }
        }

        if (!body.reason || body.reason.trim().length < 20) {
          return NextResponse.json(
            { error: "Please provide a detailed dispute reason (at least 20 characters)" },
            { status: 400 }
          );
        }

        updateData.isDisputed = true;
        updateData.disputeReason = body.reason;
        updateData.disputedAt = new Date();
        updateData.status = "DISPUTED";

        // Notify admin
        await sendDisputeToAdmin({
          ...emailData,
          disputeReason: body.reason,
        });
        break;

      case "review":
        // Can only review completed commissions
        if (commissionRequest.status !== "COMPLETED") {
          return NextResponse.json(
            { error: "Can only review completed commissions" },
            { status: 400 }
          );
        }

        // Prevent duplicate reviews
        if (commissionRequest.clientRating || commissionRequest.reviewedAt) {
          return NextResponse.json(
            { error: "You have already reviewed this commission" },
            { status: 400 }
          );
        }

        // Validate rating
        const rating = parseInt(body.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          return NextResponse.json(
            { error: "Rating must be between 1 and 5" },
            { status: 400 }
          );
        }

        updateData.clientRating = rating;
        updateData.clientReview = body.review || null;
        updateData.reviewedAt = new Date();
        break;

      case "confirm_delivery":
        // Only for physical items that are marked as delivered by admin
        if (!commissionRequest.isPhysical) {
          return NextResponse.json(
            { error: "This action is only for physical commissions" },
            { status: 400 }
          );
        }

        if (commissionRequest.deliveryStatus !== "DELIVERED") {
          return NextResponse.json(
            { error: "Item must be marked as delivered first" },
            { status: 400 }
          );
        }

        // Check if payout was already initiated (idempotency)
        if (commissionRequest.payoutInitiatedAt) {
          return NextResponse.json(
            { error: "This commission has already been processed for payout" },
            { status: 400 }
          );
        }

        // Trigger payout to designer with proper transaction handling
        if (commissionRequest.designerEarnings && commissionRequest.designerEarnings > 0) {
          // STEP 1: First, commit the payout initiation to DB BEFORE calling transfer
          await prisma.commissionRequest.update({
            where: { id },
            data: {
              deliveryConfirmedAt: new Date(),
              status: "COMPLETED",
              completedAt: new Date(),
              payoutInitiatedAt: new Date(),
              payoutStatus: "PROCESSING",
            },
          });

          // STEP 2: Now call the transfer
          try {
            const transferResult = await initiateCommissionTransfer({
              commissionRequestId: id,
              designerId: commissionRequest.designerId,
              designerEarnings: commissionRequest.designerEarnings,
              commissionTitle: commissionRequest.title,
            });

            // STEP 3: Update with the result
            if (transferResult.success) {
              console.log(`Commission payout initiated for physical delivery ${id}: ${transferResult.reference}`);
              await prisma.commissionRequest.update({
                where: { id },
                data: {
                  payoutStatus: "COMPLETED",
                  payoutCompletedAt: new Date(),
                  payoutReference: transferResult.reference,
                  payoutAmount: commissionRequest.designerEarnings,
                },
              });
            } else {
              console.warn(`Commission payout failed for ${id}: ${transferResult.error}`);
              await prisma.commissionRequest.update({
                where: { id },
                data: {
                  payoutStatus: "FAILED",
                  payoutFailedReason: transferResult.error,
                },
              });
            }
          } catch (payoutError) {
            console.error(`Error initiating commission payout for ${id}:`, payoutError);
            await prisma.commissionRequest.update({
              where: { id },
              data: {
                payoutStatus: "FAILED",
                payoutFailedReason: payoutError instanceof Error ? payoutError.message : "Unknown error",
              },
            });
          }

          // Send completion emails
          await sendApprovalToDesigner(emailData);
          await sendCompletionToClient(emailData);

          // Return early since we handled the DB update above
          return NextResponse.json({
            success: true,
            message: "Physical delivery confirmed and payout initiated",
          });
        }

        // If no earnings, just mark as completed
        updateData.deliveryConfirmedAt = new Date();
        updateData.status = "COMPLETED";
        updateData.completedAt = new Date();

        // Send completion emails
        await sendApprovalToDesigner(emailData);
        await sendCompletionToClient(emailData);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update the request
    const updatedRequest = await prisma.commissionRequest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Client action error:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
