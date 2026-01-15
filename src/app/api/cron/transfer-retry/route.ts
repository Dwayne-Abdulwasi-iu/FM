import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { initiateCommissionTransfer, createTransferNotification } from "@/lib/transfer-service";

/**
 * Cron job to retry failed commission payouts
 * 
 * Runs periodically to:
 * 1. Find commissions with payoutStatus = 'FAILED' that are eligible for retry
 * 2. Retry the transfer
 * 3. Update payout status accordingly
 * 4. Notify designers of success or continued failure
 */

// Maximum retry attempts before requiring manual intervention
const MAX_RETRY_ATTEMPTS = 3;

// Minimum time between retry attempts (in hours)
const RETRY_INTERVAL_HOURS = 4;

interface RetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export async function GET(request: NextRequest) {
  // Verify cron secret (supports both x-cron-secret header and Bearer token)
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  
  const isValidCronSecret = cronSecretHeader === expectedSecret;
  const isValidBearer = authHeader === `Bearer ${expectedSecret}`;
  
  // SECURITY: Fail if secret is not configured OR if neither auth method matches
  if (!expectedSecret || (!isValidCronSecret && !isValidBearer)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Transfer Retry] Starting failed transfer retry job...");

  const result: RetryResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const now = new Date();
    const retryThreshold = new Date(now.getTime() - RETRY_INTERVAL_HOURS * 60 * 60 * 1000);

    // Find commissions with failed payouts that are eligible for retry
    const failedPayouts = await prisma.commissionRequest.findMany({
      where: {
        status: "COMPLETED",
        payoutStatus: "FAILED",
        payoutInitiatedAt: {
          lt: retryThreshold, // Only retry if enough time has passed
        },
        designerEarnings: { gt: 0 },
      },
      include: {
        designer: {
          select: { email: true, name: true, displayName: true },
        },
      },
    });

    console.log(`[Transfer Retry] Found ${failedPayouts.length} failed payouts to retry`);

    for (const commission of failedPayouts) {
      result.processed++;

      try {
        // Use dedicated payoutRetryCount field (more reliable than parsing strings)
        const retryCount = commission.payoutRetryCount ?? 0;
        
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          console.log(`[Transfer Retry] Commission ${commission.id} exceeded max retries (${retryCount})`);
          
          // Mark for manual intervention
          await prisma.commissionRequest.update({
            where: { id: commission.id },
            data: {
              payoutStatus: "MANUAL_REQUIRED",
              payoutFailedReason: `${commission.payoutFailedReason || ""}\nMax retries exceeded - requires manual payout`,
            },
          });

          // Notify admin
          await createTransferNotification({
            sellerId: commission.designerId,
            type: "FAILED",
            message: `Commission "${commission.title}" payout failed after ${MAX_RETRY_ATTEMPTS} attempts. Manual intervention required.`,
          });

          result.skipped++;
          continue;
        }

        console.log(`[Transfer Retry] Retrying payout for commission ${commission.id} (attempt ${retryCount + 1})`);

        // Update status to processing and increment retry count
        await prisma.commissionRequest.update({
          where: { id: commission.id },
          data: {
            payoutStatus: "PROCESSING",
            payoutInitiatedAt: now, // Reset for retry interval tracking
            payoutRetryCount: retryCount + 1, // Increment retry count
          },
        });

        // Attempt the transfer
        const transferResult = await initiateCommissionTransfer({
          commissionRequestId: commission.id,
          designerId: commission.designerId,
          designerEarnings: commission.designerEarnings!,
          commissionTitle: commission.title,
        });

        if (transferResult.success) {
          console.log(`[Transfer Retry] Payout succeeded for ${commission.id}: ${transferResult.reference}`);

          await prisma.commissionRequest.update({
            where: { id: commission.id },
            data: {
              payoutStatus: "COMPLETED",
              payoutCompletedAt: now,
              payoutReference: transferResult.reference,
              payoutAmount: commission.designerEarnings,
              payoutFailedReason: null, // Clear the error
            },
          });

          // Notify designer of success
          await createTransferNotification({
            sellerId: commission.designerId,
            type: "SUCCESS",
            message: `Your payout of ₦${commission.designerEarnings?.toLocaleString()} for "${commission.title}" has been processed successfully!`,
          });

          result.succeeded++;
        } else {
          console.warn(`[Transfer Retry] Payout failed for ${commission.id}: ${transferResult.error}`);

          const newRetryCount = retryCount + 1;
          const errorLog = `Attempt ${newRetryCount}: ${transferResult.error}`;
          const previousErrors = commission.payoutFailedReason || "";

          await prisma.commissionRequest.update({
            where: { id: commission.id },
            data: {
              payoutStatus: "FAILED",
              payoutFailedReason: previousErrors ? `${previousErrors}\n${errorLog}` : errorLog,
            },
          });

          result.failed++;
          result.errors.push(`Commission ${commission.id}: ${transferResult.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Transfer Retry] Error processing ${commission.id}:`, error);
        
        result.failed++;
        result.errors.push(`Commission ${commission.id}: ${errorMsg}`);

        // Update with error
        const retryCount = countRetryAttempts(commission.payoutFailedReason);
        await prisma.commissionRequest.update({
          where: { id: commission.id },
          data: {
            payoutStatus: "FAILED",
            payoutFailedReason: `${commission.payoutFailedReason || ""}\nAttempt ${retryCount + 1}: ${errorMsg}`,
          },
        });
      }
    }

    console.log("[Transfer Retry] Job completed:", result);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      result,
    });
  } catch (error) {
    console.error("[Transfer Retry] Critical error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        result,
      },
      { status: 500 }
    );
  }
}

/**
 * Count retry attempts from the payoutFailedReason field
 * Looks for "Attempt N:" patterns
 */
function countRetryAttempts(reason: string | null): number {
  if (!reason) return 0;
  
  const matches = reason.match(/Attempt \d+:/g);
  return matches ? matches.length : 0;
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
