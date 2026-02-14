// Admin resolves a seller appeal
// PUT - Update appeal status and resolution

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    const validActions = ['OVERTURN_DECISION', 'UPHOLD_DECISION', 'COMPENSATE_SELLER'];

    if (!appealStatus || !validStatuses.includes(appealStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
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

    // Get appeal and update
    const appeal = await prisma.variantDiscrepancyAppeal.update({
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

    // Notify seller of resolution
    if (appealStatus !== 'PENDING') {
      try {
        const productTitle = appeal.decision.discrepancy.variant.product.title;
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

        await sendEmail({
          to: appeal.seller.email,
          subject: `${statusText}: ${productTitle}`,
          text: `Your appeal for "${productTitle}" has been resolved.`,
          html: `
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
          `,
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
