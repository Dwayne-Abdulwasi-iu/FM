/**
 * Escrow & Milestone Payment Service
 * Handles secure payment holding and milestone-based releases
 */

import prisma from '@/lib/prisma';
import { getPaystackClient, isPaystackConfigured } from '@/lib/paystack';

export interface Milestone {
  id: string;
  name: string;
  description: string;
  percentage: number; // Percentage of total budget
  amount: number;     // Calculated amount in USD
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'released' | 'disputed';
  dueDate?: Date;
  deliverables?: string[];
  submittedAt?: Date;
  approvedAt?: Date;
  releasedAt?: Date;
  disputedAt?: Date;
  feedbackRequired?: boolean;
  clientFeedback?: string;
}

export interface EscrowAccount {
  id: string;
  commissionRequestId: string;
  totalAmount: number;
  heldAmount: number;
  releasedAmount: number;
  refundedAmount: number;
  currency: string;
  status: 'pending' | 'funded' | 'partial_release' | 'completed' | 'refunded' | 'disputed';
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowTransaction {
  id: string;
  escrowAccountId: string;
  type: 'fund' | 'release' | 'refund' | 'dispute_hold';
  amount: number;
  milestoneId?: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: Date;
  notes?: string;
}

// Default milestone templates
export const MILESTONE_TEMPLATES = {
  simple: [
    { name: 'Deposit', description: 'Initial deposit to start work', percentage: 50 },
    { name: 'Final Delivery', description: 'Remaining payment upon completion', percentage: 50 }
  ],
  standard: [
    { name: 'Deposit', description: 'Initial deposit to start work', percentage: 30 },
    { name: 'First Draft', description: 'Payment for initial concept/draft', percentage: 30 },
    { name: 'Final Delivery', description: 'Final payment upon approval', percentage: 40 }
  ],
  detailed: [
    { name: 'Deposit', description: 'Booking fee to reserve spot', percentage: 20 },
    { name: 'Concept Approval', description: 'Initial sketches and concept', percentage: 20 },
    { name: 'First Draft', description: 'Detailed first draft', percentage: 25 },
    { name: 'Revisions Complete', description: 'All revisions finalized', percentage: 15 },
    { name: 'Final Delivery', description: 'Final files delivered', percentage: 20 }
  ]
};

/**
 * Create an escrow account for a commission
 */
export async function createEscrowAccount(
  commissionRequestId: string,
  totalAmount: number,
  milestoneTemplate: keyof typeof MILESTONE_TEMPLATES = 'standard',
  customMilestones?: Array<{ name: string; description: string; percentage: number }>
): Promise<EscrowAccount> {
  const template = customMilestones || MILESTONE_TEMPLATES[milestoneTemplate];
  
  // Validate percentages sum to 100
  const totalPercentage = template.reduce((sum, m) => sum + m.percentage, 0);
  if (totalPercentage !== 100) {
    throw new Error(`Milestone percentages must sum to 100, got ${totalPercentage}`);
  }

  const milestones: Milestone[] = template.map((m, index) => ({
    id: `milestone_${index}_${Date.now()}`,
    name: m.name,
    description: m.description,
    percentage: m.percentage,
    amount: Math.round((totalAmount * m.percentage / 100) * 100) / 100,
    status: index === 0 ? 'pending' : 'pending',
    feedbackRequired: index === template.length - 1
  }));

  const escrowAccount: EscrowAccount = {
    id: `escrow_${commissionRequestId}_${Date.now()}`,
    commissionRequestId,
    totalAmount,
    heldAmount: 0,
    releasedAmount: 0,
    refundedAmount: 0,
    currency: 'USD',
    status: 'pending',
    milestones,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Store escrow account (in a real implementation, this would be in the database)
  await storeEscrowAccount(escrowAccount);

  return escrowAccount;
}

/**
 * Fund the escrow account (full amount or milestone)
 */
export async function fundEscrow(
  escrowAccountId: string,
  amount: number,
  paymentReference: string,
  milestoneId?: string
): Promise<EscrowTransaction> {
  const escrow = await getEscrowAccount(escrowAccountId);
  if (!escrow) {
    throw new Error('Escrow account not found');
  }

  // Update escrow balance
  escrow.heldAmount += amount;
  escrow.status = escrow.heldAmount >= escrow.totalAmount ? 'funded' : 'pending';
  escrow.updatedAt = new Date();

  // If funding a specific milestone, update its status
  if (milestoneId) {
    const milestone = escrow.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.status = 'in_progress';
    }
  } else {
    // Fund first pending milestone
    const firstPending = escrow.milestones.find(m => m.status === 'pending');
    if (firstPending) {
      firstPending.status = 'in_progress';
    }
  }

  await storeEscrowAccount(escrow);

  const transaction: EscrowTransaction = {
    id: `txn_fund_${Date.now()}`,
    escrowAccountId,
    type: 'fund',
    amount,
    milestoneId,
    reference: paymentReference,
    status: 'completed',
    processedAt: new Date()
  };

  await storeTransaction(transaction);

  return transaction;
}

/**
 * Submit milestone for approval
 */
export async function submitMilestone(
  escrowAccountId: string,
  milestoneId: string,
  deliverables: string[]
): Promise<Milestone> {
  const escrow = await getEscrowAccount(escrowAccountId);
  if (!escrow) {
    throw new Error('Escrow account not found');
  }

  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (milestone.status !== 'in_progress') {
    throw new Error(`Cannot submit milestone in ${milestone.status} status`);
  }

  milestone.status = 'submitted';
  milestone.deliverables = deliverables;
  milestone.submittedAt = new Date();
  escrow.updatedAt = new Date();

  await storeEscrowAccount(escrow);

  return milestone;
}

/**
 * Approve milestone and release funds
 */
export async function approveMilestone(
  escrowAccountId: string,
  milestoneId: string,
  feedback?: string,
  autoRelease: boolean = true
): Promise<{ milestone: Milestone; transaction?: EscrowTransaction }> {
  const escrow = await getEscrowAccount(escrowAccountId);
  if (!escrow) {
    throw new Error('Escrow account not found');
  }

  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (milestone.status !== 'submitted') {
    throw new Error(`Cannot approve milestone in ${milestone.status} status`);
  }

  milestone.status = 'approved';
  milestone.approvedAt = new Date();
  milestone.clientFeedback = feedback;
  escrow.updatedAt = new Date();

  let transaction: EscrowTransaction | undefined;

  // Auto-release funds if enabled
  if (autoRelease) {
    transaction = await releaseMilestone(escrowAccountId, milestoneId);
    milestone.status = 'released';
    milestone.releasedAt = new Date();
  }

  // Activate next milestone
  const currentIndex = escrow.milestones.findIndex(m => m.id === milestoneId);
  if (currentIndex < escrow.milestones.length - 1) {
    escrow.milestones[currentIndex + 1].status = 'in_progress';
  }

  await storeEscrowAccount(escrow);

  return { milestone, transaction };
}

/**
 * Release funds for an approved milestone
 */
export async function releaseMilestone(
  escrowAccountId: string,
  milestoneId: string
): Promise<EscrowTransaction> {
  const escrow = await getEscrowAccount(escrowAccountId);
  if (!escrow) {
    throw new Error('Escrow account not found');
  }

  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (!['approved', 'submitted'].includes(milestone.status)) {
    throw new Error(`Cannot release funds for milestone in ${milestone.status} status`);
  }

  // Update balances
  const releaseAmount = milestone.amount;
  escrow.heldAmount -= releaseAmount;
  escrow.releasedAmount += releaseAmount;
  
  // Check if all milestones are released
  const allReleased = escrow.milestones.every(m => m.status === 'released');
  if (allReleased) {
    escrow.status = 'completed';
  } else {
    escrow.status = 'partial_release';
  }

  milestone.status = 'released';
  milestone.releasedAt = new Date();
  escrow.updatedAt = new Date();

  await storeEscrowAccount(escrow);

  // Initiate actual payment transfer
  const transferRef = await initiatePayoutTransfer(
    escrow.commissionRequestId,
    releaseAmount,
    `Milestone: ${milestone.name}`
  );

  const transaction: EscrowTransaction = {
    id: `txn_release_${Date.now()}`,
    escrowAccountId,
    type: 'release',
    amount: releaseAmount,
    milestoneId,
    reference: transferRef,
    status: 'completed',
    processedAt: new Date(),
    notes: `Released for milestone: ${milestone.name}`
  };

  await storeTransaction(transaction);

  return transaction;
}

/**
 * Dispute a milestone
 */
export async function disputeMilestone(
  escrowAccountId: string,
  milestoneId: string,
  reason: string,
  disputedBy: 'client' | 'designer'
): Promise<Milestone> {
  const escrow = await getEscrowAccount(escrowAccountId);
  if (!escrow) {
    throw new Error('Escrow account not found');
  }

  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  milestone.status = 'disputed';
  milestone.disputedAt = new Date();
  escrow.status = 'disputed';
  escrow.updatedAt = new Date();

  await storeEscrowAccount(escrow);

  // Notify admin for mediation
  await notifyDisputeCreated(escrow.commissionRequestId, milestoneId, reason, disputedBy);

  return milestone;
}

/**
 * Refund remaining escrow balance
 */
export async function refundEscrow(
  escrowAccountId: string,
  amount?: number,
  reason?: string
): Promise<EscrowTransaction> {
  const escrow = await getEscrowAccount(escrowAccountId);
  if (!escrow) {
    throw new Error('Escrow account not found');
  }

  const refundAmount = amount || escrow.heldAmount;
  
  if (refundAmount > escrow.heldAmount) {
    throw new Error('Refund amount exceeds held balance');
  }

  escrow.heldAmount -= refundAmount;
  escrow.refundedAmount += refundAmount;
  escrow.status = escrow.heldAmount === 0 ? 'refunded' : 'partial_release';
  escrow.updatedAt = new Date();

  await storeEscrowAccount(escrow);

  // Initiate actual refund
  const refundRef = await initiateRefund(escrow.commissionRequestId, refundAmount);

  const transaction: EscrowTransaction = {
    id: `txn_refund_${Date.now()}`,
    escrowAccountId,
    type: 'refund',
    amount: refundAmount,
    reference: refundRef,
    status: 'completed',
    processedAt: new Date(),
    notes: reason
  };

  await storeTransaction(transaction);

  return transaction;
}

/**
 * Get escrow account summary
 */
export async function getEscrowSummary(escrowAccountId: string): Promise<{
  escrow: EscrowAccount;
  nextMilestone: Milestone | null;
  completedCount: number;
  pendingCount: number;
  totalReleased: number;
  totalPending: number;
}> {
  const escrow = await getEscrowAccount(escrowAccountId);
  if (!escrow) {
    throw new Error('Escrow account not found');
  }

  const completedMilestones = escrow.milestones.filter(m => m.status === 'released');
  const pendingMilestones = escrow.milestones.filter(m => !['released', 'disputed'].includes(m.status));
  const nextMilestone = escrow.milestones.find(m => ['in_progress', 'submitted'].includes(m.status)) || null;

  return {
    escrow,
    nextMilestone,
    completedCount: completedMilestones.length,
    pendingCount: pendingMilestones.length,
    totalReleased: completedMilestones.reduce((sum, m) => sum + m.amount, 0),
    totalPending: pendingMilestones.reduce((sum, m) => sum + m.amount, 0)
  };
}

/**
 * Auto-release funds after timeout (14 days without dispute)
 */
export async function processAutoRelease(): Promise<number> {
  const AUTO_RELEASE_DAYS = 14;
  const cutoffDate = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000);

  // Get all escrow accounts with submitted milestones past cutoff
  const escrowAccounts = await getAllEscrowAccounts();
  let releasedCount = 0;

  for (const escrow of escrowAccounts) {
    for (const milestone of escrow.milestones) {
      if (
        milestone.status === 'submitted' &&
        milestone.submittedAt &&
        new Date(milestone.submittedAt) < cutoffDate
      ) {
        try {
          await approveMilestone(escrow.id, milestone.id, 'Auto-approved after 14 days', true);
          releasedCount++;
          console.log(`Auto-released milestone ${milestone.id} for escrow ${escrow.id}`);
        } catch (error) {
          console.error(`Failed to auto-release milestone ${milestone.id}:`, error);
        }
      }
    }
  }

  return releasedCount;
}

// Storage helpers (would be database operations in production)
async function storeEscrowAccount(escrow: EscrowAccount): Promise<void> {
  // In production, store in database
  // For now, update the commission request with escrow data
  try {
    await prisma.commissionRequest.update({
      where: { id: escrow.commissionRequestId },
      data: {
        // Store escrow data in a JSON field or separate table
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to store escrow account:', error);
  }
}

async function getEscrowAccount(escrowAccountId: string): Promise<EscrowAccount | null> {
  // In production, fetch from database
  // This is a placeholder implementation
  console.log('Getting escrow account:', escrowAccountId);
  return null;
}

async function getAllEscrowAccounts(): Promise<EscrowAccount[]> {
  // In production, fetch from database
  return [];
}

async function storeTransaction(transaction: EscrowTransaction): Promise<void> {
  // In production, store in database
  console.log('Storing transaction:', transaction.id);
}

async function initiatePayoutTransfer(
  commissionRequestId: string,
  amount: number,
  description: string
): Promise<string> {
  // In production, use Paystack/Stripe transfer
  if (isPaystackConfigured()) {
    // Would initiate Paystack transfer here
  }
  return `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function initiateRefund(
  commissionRequestId: string,
  amount: number
): Promise<string> {
  // In production, use Paystack/Stripe refund
  return `refund_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function notifyDisputeCreated(
  commissionRequestId: string,
  milestoneId: string,
  reason: string,
  disputedBy: string
): Promise<void> {
  // In production, send notification to admin
  console.log('Dispute created:', { commissionRequestId, milestoneId, reason, disputedBy });
}

/**
 * Calculate platform fee for escrow
 */
export function calculateEscrowFees(totalAmount: number, designerTotalEarnings: number = 0): {
  totalAmount: number;
  platformFee: number;
  designerReceives: number;
  escrowFee: number;
  netToDesigner: number;
} {
  // Import commission rate calculator
  const { getCommissionRate } = require('@/lib/commission-tiers');
  const commissionRate = getCommissionRate(designerTotalEarnings);
  
  const platformFee = totalAmount * commissionRate;
  const escrowFee = totalAmount * 0.01; // 1% escrow management fee
  const designerReceives = totalAmount - platformFee;
  const netToDesigner = designerReceives - escrowFee;

  return {
    totalAmount,
    platformFee: Math.round(platformFee * 100) / 100,
    designerReceives: Math.round(designerReceives * 100) / 100,
    escrowFee: Math.round(escrowFee * 100) / 100,
    netToDesigner: Math.round(netToDesigner * 100) / 100
  };
}
