// Admin resolves a seller appeal
// PUT - Update appeal status and resolution

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appealId: string }> }
) {
  try {
    const { appealId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { appealStatus, resolutionAction, resolutionNotes } = body;

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'RESOLVED'];
    // Resolution action meanings:
    // - OVERTURN_DECISION: Reverse the original decision (flip denial to approval or vice versa)
    // - UPHOLD_DECISION: Keep the original decision as is (support admin's original ruling)
    // - COMPENSATE_SELLER: Give seller compensation without changing the decision
    const validActions = ['OVERTURN_DECISION', 'UPHOLD_DECISION', 'COMPENSATE_SELLER'];

    if (!appealStatus || !validStatuses.includes(appealStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent downgrading from a resolved state back to PENDING
    // First, check current status to prevent backtracking
    type LocalAppeal = { appealStatus?: string };
    let currentAppeal: LocalAppeal | null = null;
    try {
      currentAppeal = await prisma.variantDiscrepancyAppeal.findUnique({
        where: { id: appealId },
        select: { appealStatus: true }
      });
    } catch (_e) {
      // Try dispute appeal if variant not found
      try {
        currentAppeal = await prisma.disputeAppeal.findUnique({
          where: { id: appealId },
          select: { status: true }
        });
        if (currentAppeal) {
          currentAppeal.appealStatus = currentAppeal.status;
        }
      } catch (_e2) {
        // Will be caught by update operations below
      }
    }

    if (currentAppeal && currentAppeal.appealStatus !== 'PENDING' && appealStatus === 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Cannot change a resolved appeal back to pending' },
        { status: 400 }
      );
    }

    if (appealStatus !== 'PENDING' && (!resolutionAction || !validActions.includes(resolutionAction))) {
      return NextResponse.json(
        { success: false, message: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    if (resolutionNotes && resolutionNotes.length > 1000) {
      return NextResponse.json(
        { success: false, message: 'Resolution notes must be under 1000 characters' },
        { status: 400 }
      );
    }

    // Try to update variant discrepancy appeal first
    let appeal: Prisma.VariantDiscrepancyAppeal | Prisma.DisputeAppeal | null = null;
    let isVariantAppeal = false;
    
    try {
      appeal = await prisma.variantDiscrepancyAppeal.update({
        where: { id: appealId },
        data: {
          appealStatus,
          resolutionAction: appealStatus !== 'PENDING' ? resolutionAction : null,
          resolutionNotes: resolutionNotes ? resolutionNotes.substring(0, 1000) : null,
          resolvedBy: appealStatus !== 'PENDING' ? session.user.id : null,
          resolvedAt: appealStatus !== 'PENDING' ? new Date() : null,
        },
        include: {
          decision: {
            include: {
              discrepancy: {
                include: {
                  shipment: {
                    select: { id: true, sellerId: true, seller: { select: { name: true, email: true } } },
                  },
                  variant: {
                    include: {
                      product: { select: { title: true } },
                    },
                  },
                },
              },
            },
          },
          seller: { select: { name: true, email: true } },
        },
      });
      isVariantAppeal = true;
    } catch (variantError: unknown) {
      // If not found, try dispute appeal
      if (typeof variantError === 'object' && variantError !== null && 'code' in variantError && (variantError as { code?: string }).code === 'P2025') {
        appeal = await prisma.disputeAppeal.update({
          where: { id: appealId },
          data: {
            status: appealStatus,
            adminResponse: resolutionNotes ? resolutionNotes.substring(0, 1000) : null,
            reviewedBy: appealStatus !== 'PENDING' ? session.user.id : null,
            reviewedAt: appealStatus !== 'PENDING' ? new Date() : null,
          },
          include: {
            seller: { select: { id: true, name: true, email: true } },
          },
        });
        isVariantAppeal = false;
      } else {
        throw variantError;
      }
    }

    // Notify seller of resolution
    if (appealStatus !== 'PENDING') {
      try {
        const statusMap: Record<string, string> = {
          APPROVED: '✅ Appeal Approved',
          REJECTED: '❌ Appeal Rejected',
          RESOLVED: '✓ Appeal Resolved',
        };
        const statusText = statusMap[appealStatus] || 'Appeal Updated';

        const actionMap: Record<string, string> = {
          OVERTURN_DECISION: 'Your appeal has been approved. The original decision has been overturned.',
          UPHOLD_DECISION: 'Your appeal has been reviewed. The original decision has been upheld.',
          COMPENSATE_SELLER: 'Your appeal has been approved for compensation review.',
        };
        const actionText = actionMap[resolutionAction] || 'Your appeal has been reviewed.';

        let emailSubject = statusText;
        let emailHtml = '';

        if (isVariantAppeal) {
          const productTitle = (appeal as Prisma.VariantDiscrepancyAppeal).decision?.discrepancy?.variant?.product?.title || 'Unknown Product';
          emailSubject = `${statusText}: ${productTitle}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: ${appealStatus === 'APPROVED' ? '#D1FAE5' : '#FEE2E2'}; border-left: 4px solid ${appealStatus === 'APPROVED' ? '#059669' : '#DC2626'}; padding: 20px; border-radius: 4px;">
                <p style="margin: 0; color: ${appealStatus === 'APPROVED' ? '#065F46' : '#7F1D1D'}; font-weight: bold;">${statusText}</p>
                <p style="color: ${appealStatus === 'APPROVED' ? '#065F46' : '#7F1D1D'}; margin: 10px 0 0 0;">
                  ${actionText}
                </p>
                <p style="color: ${appealStatus === 'APPROVED' ? '#065F46' : '#7F1D1D'}; margin: 10px 0 0 0;">
                  <strong>Product:</strong> ${productTitle}
                </p>
                ${resolutionNotes ? `
                  <p style="color: ${appealStatus === 'APPROVED' ? '#065F46' : '#7F1D1D'}; margin: 10px 0 0 0;">
                    <strong>Admin Notes:</strong><br/>
                    ${resolutionNotes.replace(/\n/g, '<br/>')}
                  </p>
                ` : ''}
              </div>
            </div>
          `;
        } else {
          // Dispute appeal
          emailSubject = `${statusText}: Dispute Appeal`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: ${appealStatus === 'APPROVED' ? '#D1FAE5' : '#FEE2E2'}; border-left: 4px solid ${appealStatus === 'APPROVED' ? '#059669' : '#DC2626'}; padding: 20px; border-radius: 4px;">
                <p style="margin: 0; color: ${appealStatus === 'APPROVED' ? '#065F46' : '#7F1D1D'}; font-weight: bold;">${statusText}</p>
                <p style="color: ${appealStatus === 'APPROVED' ? '#065F46' : '#7F1D1D'}; margin: 10px 0 0 0;">
                  ${actionText}
                </p>
                ${resolutionNotes ? `
                  <p style="color: ${appealStatus === 'APPROVED' ? '#065F46' : '#7F1D1D'}; margin: 10px 0 0 0;">
                    <strong>Admin Response:</strong><br/>
                    ${resolutionNotes.replace(/\n/g, '<br/>')}
                  </p>
                ` : ''}
              </div>
            </div>
          `;
        }

        const sellerEmail = isVariantAppeal
          ? (appeal as Prisma.VariantDiscrepancyAppeal).seller?.email
          : (appeal as Prisma.DisputeAppeal).seller?.email;

        await sendEmail({
          to: sellerEmail,
          subject: emailSubject,
          text: `Your appeal has been updated. Status: ${statusText}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Failed to notify seller of appeal resolution:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appeal updated',
      appeal,
    });
  } catch (error) {
    console.error('Error updating appeal:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update appeal', error: (error as Error).message },
      { status: 500 }
    );
  }
}
