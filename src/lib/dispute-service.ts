/**
 * Enhanced Dispute Resolution Service
 * Admin-mediated dispute handling for commission and order issues
 */

import prisma from '@/lib/prisma';

export type DisputeType = 
  | 'quality_issue'
  | 'not_as_described'
  | 'late_delivery'
  | 'non_delivery'
  | 'communication_issue'
  | 'refund_request'
  | 'payment_issue'
  | 'copyright_claim'
  | 'other';

export type DisputeStatus = 
  | 'submitted'
  | 'under_review'
  | 'awaiting_seller_response'
  | 'awaiting_buyer_response'
  | 'mediation'
  | 'resolved'
  | 'escalated'
  | 'closed';

export type ResolutionType = 
  | 'full_refund'
  | 'partial_refund'
  | 'revision_requested'
  | 'in_favor_of_seller'
  | 'in_favor_of_buyer'
  | 'mutual_agreement'
  | 'no_action'
  | 'account_warning'
  | 'account_suspension';

export interface Dispute {
  id: string;
  type: DisputeType;
  status: DisputeStatus;
  
  // Parties
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  
  // Related entities
  orderId?: string;
  commissionRequestId?: string;
  designId?: string;
  
  // Dispute details
  title: string;
  description: string;
  amount: number;
  currency: string;
  
  // Evidence
  buyerEvidence: Evidence[];
  sellerEvidence: Evidence[];
  
  // Communication
  messages: DisputeMessage[];
  
  // Resolution
  resolution?: DisputeResolution;
  
  // Admin handling
  assignedAdminId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Timeline
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface Evidence {
  id: string;
  type: 'image' | 'document' | 'video' | 'link' | 'text';
  url?: string;
  description: string;
  uploadedAt: Date;
  uploadedBy: 'buyer' | 'seller' | 'admin';
}

export interface DisputeMessage {
  id: string;
  senderId: string;
  senderRole: 'buyer' | 'seller' | 'admin';
  senderName: string;
  message: string;
  attachments: string[];
  isPrivate: boolean; // Admin notes not visible to parties
  createdAt: Date;
}

export interface DisputeResolution {
  type: ResolutionType;
  summary: string;
  refundAmount?: number;
  buyerCompensation?: number;
  sellerPenalty?: number;
  actionsTaken: string[];
  adminNotes: string;
  agreedBy: {
    buyer: boolean;
    seller: boolean;
    buyerAgreedAt?: Date;
    sellerAgreedAt?: Date;
  };
  resolvedBy: string;
  resolvedAt: Date;
}

// SLA deadlines for dispute resolution
const DISPUTE_SLA = {
  initial_response: 24, // hours
  seller_response: 48,  // hours
  buyer_response: 48,   // hours
  resolution: 7 * 24,   // hours (7 days)
  escalation_trigger: 5 * 24 // hours (5 days without progress)
};

/**
 * Create a new dispute
 */
export async function createDispute(params: {
  type: DisputeType;
  buyerId: string;
  sellerId: string;
  orderId?: string;
  commissionRequestId?: string;
  designId?: string;
  title: string;
  description: string;
  amount: number;
  currency?: string;
  evidence?: Omit<Evidence, 'id' | 'uploadedAt'>[];
}): Promise<Dispute> {
  const { 
    type, buyerId, sellerId, orderId, commissionRequestId, designId,
    title, description, amount, currency = 'USD', evidence = []
  } = params;

  // Get user details
  const [buyer, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: buyerId }, select: { name: true, email: true } }),
    prisma.user.findUnique({ where: { id: sellerId }, select: { name: true, email: true } })
  ]);

  if (!buyer || !seller) {
    throw new Error('Invalid buyer or seller ID');
  }

  // Determine priority based on amount and type
  let priority: Dispute['priority'] = 'medium';
  if (amount > 500 || type === 'copyright_claim') {
    priority = 'high';
  } else if (amount > 1000 || type === 'non_delivery') {
    priority = 'urgent';
  } else if (amount < 50) {
    priority = 'low';
  }

  const dispute: Dispute = {
    id: `dispute_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: 'submitted',
    buyerId,
    buyerName: buyer.name || 'Unknown',
    buyerEmail: buyer.email,
    sellerId,
    sellerName: seller.name || 'Unknown',
    sellerEmail: seller.email,
    orderId,
    commissionRequestId,
    designId,
    title,
    description,
    amount,
    currency,
    buyerEvidence: evidence.map((e, i) => ({
      ...e,
      id: `evidence_${i}_${Date.now()}`,
      uploadedAt: new Date(),
      uploadedBy: 'buyer' as const
    })),
    sellerEvidence: [],
    messages: [{
      id: `msg_${Date.now()}`,
      senderId: buyerId,
      senderRole: 'buyer',
      senderName: buyer.name || 'Buyer',
      message: description,
      attachments: evidence.filter(e => e.url).map(e => e.url!),
      isPrivate: false,
      createdAt: new Date()
    }],
    priority,
    deadline: new Date(Date.now() + DISPUTE_SLA.resolution * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Store dispute
  await storeDispute(dispute);

  // Notify seller
  await notifySellerOfDispute(dispute);

  // If commission request, update its status
  if (commissionRequestId) {
    await prisma.commissionRequest.update({
      where: { id: commissionRequestId },
      data: {
        isDisputed: true,
        disputeReason: description,
        disputedAt: new Date()
      }
    });
  }

  return dispute;
}

/**
 * Add seller response to dispute
 */
export async function addSellerResponse(
  disputeId: string,
  sellerId: string,
  response: string,
  evidence?: Omit<Evidence, 'id' | 'uploadedAt' | 'uploadedBy'>[]
): Promise<Dispute> {
  const dispute = await getDispute(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  if (dispute.sellerId !== sellerId) {
    throw new Error('Only the seller can respond to this dispute');
  }

  if (!['submitted', 'awaiting_seller_response'].includes(dispute.status)) {
    throw new Error('Dispute is not awaiting seller response');
  }

  // Add evidence
  if (evidence) {
    dispute.sellerEvidence.push(...evidence.map((e, i) => ({
      ...e,
      id: `evidence_seller_${i}_${Date.now()}`,
      uploadedAt: new Date(),
      uploadedBy: 'seller' as const
    })));
  }

  // Add message
  dispute.messages.push({
    id: `msg_${Date.now()}`,
    senderId: sellerId,
    senderRole: 'seller',
    senderName: dispute.sellerName,
    message: response,
    attachments: evidence?.filter(e => e.url).map(e => e.url!) || [],
    isPrivate: false,
    createdAt: new Date()
  });

  dispute.status = 'under_review';
  dispute.updatedAt = new Date();

  await storeDispute(dispute);

  // Notify admin for review
  await notifyAdminForReview(dispute);

  return dispute;
}

/**
 * Admin adds message or updates dispute
 */
export async function adminUpdateDispute(
  disputeId: string,
  adminId: string,
  update: {
    status?: DisputeStatus;
    message?: string;
    isPrivateNote?: boolean;
    assignTo?: string;
    priority?: Dispute['priority'];
  }
): Promise<Dispute> {
  const dispute = await getDispute(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { name: true, role: true }
  });

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }

  if (update.status) {
    dispute.status = update.status;
  }

  if (update.assignTo) {
    dispute.assignedAdminId = update.assignTo;
  }

  if (update.priority) {
    dispute.priority = update.priority;
  }

  if (update.message) {
    dispute.messages.push({
      id: `msg_admin_${Date.now()}`,
      senderId: adminId,
      senderRole: 'admin',
      senderName: admin.name || 'Admin',
      message: update.message,
      attachments: [],
      isPrivate: update.isPrivateNote || false,
      createdAt: new Date()
    });
  }

  dispute.updatedAt = new Date();
  await storeDispute(dispute);

  // Notify parties if status changed
  if (update.status && !update.isPrivateNote) {
    await notifyStatusChange(dispute);
  }

  return dispute;
}

/**
 * Resolve dispute with decision
 */
export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: {
    type: ResolutionType;
    summary: string;
    refundAmount?: number;
    buyerCompensation?: number;
    sellerPenalty?: number;
    actionsTaken: string[];
    adminNotes: string;
  }
): Promise<Dispute> {
  const dispute = await getDispute(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  dispute.resolution = {
    ...resolution,
    agreedBy: {
      buyer: false,
      seller: false
    },
    resolvedBy: adminId,
    resolvedAt: new Date()
  };

  dispute.status = 'resolved';
  dispute.resolvedAt = new Date();
  dispute.updatedAt = new Date();

  await storeDispute(dispute);

  // Process resolution actions
  await processResolutionActions(dispute, dispute.resolution);

  // Notify parties
  await notifyResolution(dispute);

  // Update related entities
  if (dispute.commissionRequestId) {
    await prisma.commissionRequest.update({
      where: { id: dispute.commissionRequestId },
      data: {
        disputeResolvedAt: new Date(),
        disputeResolution: resolution.summary
      }
    });
  }

  return dispute;
}

/**
 * Process resolution actions (refunds, penalties, etc.)
 */
async function processResolutionActions(
  dispute: Dispute,
  resolution: NonNullable<Dispute['resolution']>
): Promise<void> {
  const actions: string[] = [];

  // Process refund if applicable
  if (resolution.type === 'full_refund') {
    await processRefund(dispute.buyerId, dispute.amount, dispute.id);
    actions.push(`Full refund of ${dispute.currency} ${dispute.amount} processed`);
  } else if (resolution.type === 'partial_refund' && resolution.refundAmount) {
    await processRefund(dispute.buyerId, resolution.refundAmount, dispute.id);
    actions.push(`Partial refund of ${dispute.currency} ${resolution.refundAmount} processed`);
  }

  // Apply seller penalty if applicable
  if (resolution.sellerPenalty) {
    await applySellerPenalty(dispute.sellerId, resolution.sellerPenalty, dispute.id);
    actions.push(`Seller penalty of ${dispute.currency} ${resolution.sellerPenalty} applied`);
  }

  // Apply buyer compensation if applicable
  if (resolution.buyerCompensation) {
    await applyBuyerCompensation(dispute.buyerId, resolution.buyerCompensation, dispute.id);
    actions.push(`Buyer compensation of ${dispute.currency} ${resolution.buyerCompensation} applied`);
  }

  // Account actions
  if (resolution.type === 'account_warning') {
    await issueAccountWarning(dispute.sellerId, dispute.id);
    actions.push('Account warning issued to seller');
  } else if (resolution.type === 'account_suspension') {
    await suspendAccount(dispute.sellerId, dispute.id);
    actions.push('Seller account suspended');
  }

  console.log('Resolution actions processed:', actions);
}

/**
 * Get disputes for admin dashboard
 */
export async function getDisputesForAdmin(filters: {
  status?: DisputeStatus;
  priority?: Dispute['priority'];
  type?: DisputeType;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}): Promise<{ disputes: Dispute[]; total: number }> {
  // In production, this would query the database
  const allDisputes = await getAllDisputes();
  
  let filtered = allDisputes;

  if (filters.status) {
    filtered = filtered.filter(d => d.status === filters.status);
  }
  if (filters.priority) {
    filtered = filtered.filter(d => d.priority === filters.priority);
  }
  if (filters.type) {
    filtered = filtered.filter(d => d.type === filters.type);
  }
  if (filters.assignedTo) {
    filtered = filtered.filter(d => d.assignedAdminId === filters.assignedTo);
  }

  // Sort by priority and creation date
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  filtered.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const offset = filters.offset || 0;
  const limit = filters.limit || 20;

  return {
    disputes: filtered.slice(offset, offset + limit),
    total: filtered.length
  };
}

/**
 * Get dispute statistics
 */
export async function getDisputeStats(): Promise<{
  total: number;
  byStatus: Record<DisputeStatus, number>;
  byType: Record<DisputeType, number>;
  byPriority: Record<Dispute['priority'], number>;
  averageResolutionDays: number;
  resolutionRate: number;
}> {
  const disputes = await getAllDisputes();
  
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  
  let totalResolutionTime = 0;
  let resolvedCount = 0;

  for (const dispute of disputes) {
    byStatus[dispute.status] = (byStatus[dispute.status] || 0) + 1;
    byType[dispute.type] = (byType[dispute.type] || 0) + 1;
    byPriority[dispute.priority] = (byPriority[dispute.priority] || 0) + 1;

    if (dispute.resolvedAt) {
      const resolutionTime = new Date(dispute.resolvedAt).getTime() - new Date(dispute.createdAt).getTime();
      totalResolutionTime += resolutionTime;
      resolvedCount++;
    }
  }

  const averageResolutionDays = resolvedCount > 0
    ? totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24)
    : 0;

  return {
    total: disputes.length,
    byStatus: byStatus as Record<DisputeStatus, number>,
    byType: byType as Record<DisputeType, number>,
    byPriority: byPriority as Record<Dispute['priority'], number>,
    averageResolutionDays: Math.round(averageResolutionDays * 10) / 10,
    resolutionRate: disputes.length > 0 ? resolvedCount / disputes.length : 0
  };
}

/**
 * Check for disputes needing escalation
 */
export async function checkForEscalations(): Promise<number> {
  const disputes = await getAllDisputes();
  const escalationThreshold = Date.now() - DISPUTE_SLA.escalation_trigger * 60 * 60 * 1000;
  let escalatedCount = 0;

  for (const dispute of disputes) {
    if (
      !['resolved', 'closed', 'escalated'].includes(dispute.status) &&
      new Date(dispute.updatedAt).getTime() < escalationThreshold
    ) {
      await adminUpdateDispute(dispute.id, 'system', {
        status: 'escalated',
        message: 'Auto-escalated due to no progress in 5 days',
        isPrivateNote: true,
        priority: 'high'
      });
      escalatedCount++;
    }
  }

  return escalatedCount;
}

// Storage helpers (would be database operations in production)
async function storeDispute(dispute: Dispute): Promise<void> {
  console.log('Storing dispute:', dispute.id);
  // In production, store in database
}

async function getDispute(disputeId: string): Promise<Dispute | null> {
  console.log('Getting dispute:', disputeId);
  // In production, fetch from database
  return null;
}

async function getAllDisputes(): Promise<Dispute[]> {
  // In production, fetch from database
  return [];
}

// Notification helpers
async function notifySellerOfDispute(dispute: Dispute): Promise<void> {
  console.log('Notifying seller of dispute:', dispute.sellerId);
  // Send email/notification
}

async function notifyAdminForReview(dispute: Dispute): Promise<void> {
  console.log('Notifying admin for review:', dispute.id);
  // Send admin notification
}

async function notifyStatusChange(dispute: Dispute): Promise<void> {
  console.log('Notifying status change:', dispute.status);
  // Send notifications to both parties
}

async function notifyResolution(dispute: Dispute): Promise<void> {
  console.log('Notifying resolution:', dispute.id);
  // Send resolution notification to both parties
}

// Action helpers
async function processRefund(userId: string, amount: number, disputeId: string): Promise<void> {
  console.log('Processing refund:', { userId, amount, disputeId });
  // Use Paystack/Stripe refund API
}

async function applySellerPenalty(sellerId: string, amount: number, _disputeId: string): Promise<void> {
  console.log('Applying seller penalty:', { sellerId, amount, disputeId: _disputeId });
  // Deduct from seller balance or future payouts
}

async function applyBuyerCompensation(buyerId: string, amount: number, _disputeId: string): Promise<void> {
  console.log('Applying buyer compensation:', { buyerId, amount, disputeId: _disputeId });
  // Credit to buyer account
}

async function issueAccountWarning(userId: string, _disputeId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      // Store warning in user record
      updatedAt: new Date()
    }
  });
}

async function suspendAccount(userId: string, _disputeId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      // In production, add suspended status
      updatedAt: new Date()
    }
  });
}

/**
 * Generate dispute report for admin
 */
export function generateDisputeReport(dispute: Dispute): string {
  const lines = [
    `DISPUTE REPORT #${dispute.id}`,
    `=`.repeat(50),
    ``,
    `TYPE: ${dispute.type}`,
    `STATUS: ${dispute.status}`,
    `PRIORITY: ${dispute.priority}`,
    `AMOUNT: ${dispute.currency} ${dispute.amount}`,
    ``,
    `BUYER: ${dispute.buyerName} (${dispute.buyerEmail})`,
    `SELLER: ${dispute.sellerName} (${dispute.sellerEmail})`,
    ``,
    `DESCRIPTION:`,
    dispute.description,
    ``,
    `EVIDENCE:`,
    `- Buyer provided ${dispute.buyerEvidence.length} item(s)`,
    `- Seller provided ${dispute.sellerEvidence.length} item(s)`,
    ``,
    `MESSAGES: ${dispute.messages.filter(m => !m.isPrivate).length} exchanges`,
    ``,
    `TIMELINE:`,
    `- Created: ${new Date(dispute.createdAt).toLocaleString()}`,
    `- Last Updated: ${new Date(dispute.updatedAt).toLocaleString()}`,
    dispute.resolvedAt ? `- Resolved: ${new Date(dispute.resolvedAt).toLocaleString()}` : '',
    ``,
  ];

  if (dispute.resolution) {
    lines.push(
      `RESOLUTION:`,
      `Type: ${dispute.resolution.type}`,
      `Summary: ${dispute.resolution.summary}`,
      dispute.resolution.refundAmount ? `Refund: ${dispute.currency} ${dispute.resolution.refundAmount}` : '',
      ``
    );
  }

  return lines.filter(Boolean).join('\n');
}
