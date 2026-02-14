// Audit trail logging for variant discrepancies
// Tracks all admin decisions with full context for dispute resolution

import prisma from './prisma';

export async function logVariantDiscrepancyDecision(data: {
  discrepancyId: string;
  adminId: string;
  acceptanceStatus: 'ACCEPTED' | 'RETURNING' | 'PARTIAL';
  rejectionCategory?: string; // DAMAGED, QUANTITY_MISMATCH, QUALITY, WRONG_PRODUCT, MISSING
  unitsAccepted?: number;
  unitsReturning?: number;
  notes?: string;
  decisionPhotos?: string[]; // Cloudinary URLs
  revisionReason?: string; // If this is a revision
  revisionCount?: number; // 0 = original, 1+ = revisions
  previousDecisionId?: string; // If this is a revision
}) {
  try {
    const decision = await prisma.variantDiscrepancyDecision.create({
      data: {
        discrepancyId: data.discrepancyId,
        adminId: data.adminId,
        acceptanceStatus: data.acceptanceStatus,
        rejectionCategory: data.rejectionCategory,
        unitsAccepted: data.unitsAccepted,
        unitsReturning: data.unitsReturning,
        notes: data.notes,
        decisionPhotos: data.decisionPhotos || [],
        revisionReason: data.revisionReason,
        revisionCount: data.revisionCount || 0,
        previousDecisionId: data.previousDecisionId || null,
      },
      include: {
        admin: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    console.log(`Logged variant discrepancy decision: ${decision.id}`);
    return decision;
  } catch (error) {
    console.error('Failed to log variant discrepancy decision:', error);
    // Don't fail the request if logging fails
    return null;
  }
}

/**
 * Get all decisions for a variant discrepancy (audit trail)
 */
export async function getVariantDiscrepancyAuditTrail(discrepancyId: string) {
  try {
    const decisions = await prisma.variantDiscrepancyDecision.findMany({
      where: { discrepancyId },
      include: {
        admin: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { decidedAt: 'asc' },
    });

    return decisions;
  } catch (error) {
    console.error('Failed to fetch variant discrepancy audit trail:', error);
    return [];
  }
}

/**
 * Get decision history for a discrepancy with full revision chain
 */
export async function getVariantDiscrepancyDecisionHistory(discrepancyId: string) {
  try {
    // Get all decisions for this discrepancy, ordered by date
    const allDecisions = await prisma.variantDiscrepancyDecision.findMany({
      where: { discrepancyId },
      include: {
        admin: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { decidedAt: 'desc' },
    });

    if (!allDecisions || allDecisions.length === 0) {
      return null;
    }

    // Build the history - latest decision is current, others are previous versions
    const history = allDecisions;

    return {
      current: history[0],
      previousVersions: history.slice(1),
      totalRevisions: history.length,
    };
  } catch (error) {
    console.error('Failed to fetch variant discrepancy decision history:', error);
    return null;
  }
}
