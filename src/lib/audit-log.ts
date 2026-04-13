import prisma from "@/lib/prisma";
import { Prisma } from '@prisma/client'

export type AuditAction = 
  | "PAYMENT_CONFIRMED"
  | "PAYOUT_INITIATED"
  | "PAYOUT_COMPLETED"
  | "PAYOUT_FAILED"
  | "REFUND_INITIATED"
  | "REFUND_COMPLETED"
  | "REFUND_FAILED"
  | "DISPUTE_FILED"
  | "DISPUTE_RESOLVED"
  | "STATUS_CHANGED"
  | "COMMISSION_CREATED"
  | "COMMISSION_CANCELLED"
  | "ADMIN_ACTION";

export type AuditCategory = 
  | "PAYMENT"
  | "PAYOUT"
  | "REFUND"
  | "DISPUTE"
  | "STATUS_CHANGE"
  | "COMMISSION"
  | "ADMIN";

export type ActorType = "USER" | "ADMIN" | "SYSTEM" | "CRON";

interface AuditLogEntry {
  action: AuditAction;
  category: AuditCategory;
  actorId?: string | null;
  actorType: ActorType;
  actorEmail?: string | null;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
  errorMessage?: string | null;
}

/**
 * Create an audit log entry for sensitive operations
 * This provides a tamper-proof record of financial and administrative actions
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        category: entry.category,
        actorId: entry.actorId || null,
        actorType: entry.actorType,
        actorEmail: entry.actorEmail || null,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata ? (entry.metadata as unknown as Prisma.JsonValue) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        success: entry.success ?? true,
        errorMessage: entry.errorMessage || null,
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging should never break main flow
    console.error("[AuditLog] Failed to create audit entry:", error, entry);
  }
}

/**
 * Helper to extract request metadata for audit logs
 */
export function getRequestMetadata(request: Request): { ipAddress: string | null; userAgent: string | null } {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               null,
    userAgent: request.headers.get("user-agent") || null,
  };
}

/**
 * Audit helper for payment confirmations
 */
export async function auditPaymentConfirmed(
  request: Request,
  actorId: string,
  actorEmail: string | null,
  commissionId: string,
  metadata: { amount: number; paymentMethod: string; reference: string }
): Promise<void> {
  const { ipAddress, userAgent } = getRequestMetadata(request);
  await createAuditLog({
    action: "PAYMENT_CONFIRMED",
    category: "PAYMENT",
    actorId,
    actorType: "USER",
    actorEmail,
    targetType: "COMMISSION_REQUEST",
    targetId: commissionId,
    metadata,
    ipAddress,
    userAgent,
  });
}

/**
 * Audit helper for payout initiations
 */
export async function auditPayoutInitiated(
  actorId: string | null,
  actorType: ActorType,
  commissionId: string,
  metadata: { amount: number; designerId: string; reference?: string }
): Promise<void> {
  await createAuditLog({
    action: "PAYOUT_INITIATED",
    category: "PAYOUT",
    actorId,
    actorType,
    targetType: "COMMISSION_REQUEST",
    targetId: commissionId,
    metadata,
  });
}

/**
 * Audit helper for refund processing
 */
export async function auditRefundProcessed(
  request: Request,
  actorId: string,
  actorEmail: string | null,
  commissionId: string,
  metadata: { amount: number; reason: string; success: boolean; reference?: string },
  error?: string
): Promise<void> {
  const { ipAddress, userAgent } = getRequestMetadata(request);
  await createAuditLog({
    action: metadata.success ? "REFUND_COMPLETED" : "REFUND_FAILED",
    category: "REFUND",
    actorId,
    actorType: "ADMIN",
    actorEmail,
    targetType: "COMMISSION_REQUEST",
    targetId: commissionId,
    metadata,
    ipAddress,
    userAgent,
    success: metadata.success,
    errorMessage: error,
  });
}

/**
 * Audit helper for dispute resolution
 */
export async function auditDisputeResolved(
  request: Request,
  actorId: string,
  actorEmail: string | null,
  commissionId: string,
  metadata: { resolution: string; refundAmount?: number; payoutAmount?: number }
): Promise<void> {
  const { ipAddress, userAgent } = getRequestMetadata(request);
  await createAuditLog({
    action: "DISPUTE_RESOLVED",
    category: "DISPUTE",
    actorId,
    actorType: "ADMIN",
    actorEmail,
    targetType: "COMMISSION_REQUEST",
    targetId: commissionId,
    metadata,
    ipAddress,
    userAgent,
  });
}
