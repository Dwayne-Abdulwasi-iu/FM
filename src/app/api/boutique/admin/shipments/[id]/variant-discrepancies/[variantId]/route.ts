// Update Variant Discrepancy Acceptance Status
// PUT - Update acceptance status (ACCEPTED, RETURNING, PARTIAL)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendVariantDiscrepancyNotification } from '@/lib/warehouse-email-functions';
import { logVariantDiscrepancyDecision } from '@/lib/variant-discrepancy-audit';
import { autoTransitionProductStatus } from '@/lib/product-auto-transition';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      acceptanceStatus, // ACCEPTED, RETURNING, PARTIAL
      rejectionCategory, // DAMAGED, QUANTITY_MISMATCH, QUALITY, WRONG_PRODUCT, MISSING
      unitsAccepted,
      unitsReturning,
      notes,
      revisionReason, // Required if changing existing decision
      decisionPhotos, // Array of Cloudinary URLs
    } = body;

    if (!acceptanceStatus) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: acceptanceStatus' },
        { status: 400 }
      );
    }

    // Validate acceptance status
    const validStatuses = ['ACCEPTED', 'RETURNING', 'PARTIAL'];
    if (!validStatuses.includes(acceptanceStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid acceptanceStatus. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // For PARTIAL, both unitsAccepted and unitsReturning are required
    if (acceptanceStatus === 'PARTIAL' && (unitsAccepted === undefined || unitsReturning === undefined)) {
      return NextResponse.json(
        { success: false, message: 'PARTIAL status requires unitsAccepted and unitsReturning' },
        { status: 400 }
      );
    }

    // Check if discrepancy exists
    const existingDiscrepancy = await prisma.variantDiscrepancy.findUnique({
      where: {
        shipmentId_variantId: {
          shipmentId: id,
          variantId,
        },
      },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!existingDiscrepancy) {
      return NextResponse.json(
        { success: false, message: 'Variant discrepancy not found' },
        { status: 404 }
      );
    }

    // Check if this is a revision of a previous decision
    const previousDecision = await prisma.variantDiscrepancyDecision.findFirst({
      where: {
        discrepancyId: existingDiscrepancy.id,
        revisions: {
          none: {}, // Get the most recent decision (one with no future revisions)
        },
      },
      orderBy: { decidedAt: 'desc' },
      take: 1,
    });

    const isRevision = previousDecision != null;
    const oldAcceptanceStatus = existingDiscrepancy.acceptanceStatus;
    
    // Check revision limit (max 3 revisions = 4 total versions)
    if (isRevision) {
      if (!revisionReason || revisionReason.trim().length === 0) {
        return NextResponse.json(
          { success: false, message: 'Revision reason is required when changing an existing decision' },
          { status: 400 }
        );
      }
      
      // Count total revisions for this decision
      if (previousDecision.revisionCount >= 3) {
        return NextResponse.json(
          { success: false, message: 'Maximum 3 revisions allowed per decision. Cannot change further.' },
          { status: 409 }
        );
      }
    }

    // For PARTIAL, validate that unitsAccepted + unitsReturning equals quantityReceived or quantityExpected
    if (acceptanceStatus === 'PARTIAL') {
      const total = (unitsAccepted || 0) + (unitsReturning || 0);
      const expectedTotal = existingDiscrepancy.quantityReceived ?? existingDiscrepancy.quantityExpected;
      if (total !== expectedTotal) {
        return NextResponse.json(
          { success: false, message: `Units accepted + returning (${total}) must equal received/expected (${expectedTotal})` },
          { status: 400 }
        );
      }
    }

    // Update the discrepancy
    const discrepancy = await prisma.variantDiscrepancy.update({
      where: {
        shipmentId_variantId: {
          shipmentId: id,
          variantId,
        },
      },
      data: {
        acceptanceStatus,
        unitsAccepted: unitsAccepted ?? undefined,
        unitsReturning: unitsReturning ?? undefined,
        notes: notes ? notes.substring(0, 500) : undefined, // Limit to 500 chars
      },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Update variant inventory based on acceptance status
    if (acceptanceStatus === 'ACCEPTED') {
      // All units accepted - set quantity to what was received/expected
      await prisma.boutiqueProductVariant.update({
        where: { id: variantId },
        data: {
          quantity: existingDiscrepancy.quantityReceived ?? existingDiscrepancy.quantityExpected,
        },
      });
    } else if (acceptanceStatus === 'RETURNING') {
      // All units returning - set quantity to 0
      await prisma.boutiqueProductVariant.update({
        where: { id: variantId },
        data: {
          quantity: 0,
        },
      });
    } else if (acceptanceStatus === 'PARTIAL') {
      // Partial acceptance - set quantity to units being accepted
      await prisma.boutiqueProductVariant.update({
        where: { id: variantId },
        data: {
          quantity: unitsAccepted ?? 0,
        },
      });
    }

    // Log the decision in audit trail (with revision link if updating existing decision)
    try {
      await logVariantDiscrepancyDecision({
        discrepancyId: discrepancy.id,
        adminId: session.user.id || '',
        acceptanceStatus: acceptanceStatus as 'ACCEPTED' | 'RETURNING' | 'PARTIAL',
        rejectionCategory: rejectionCategory && acceptanceStatus !== 'ACCEPTED' ? rejectionCategory : undefined,
        unitsAccepted,
        unitsReturning,
        notes,
        decisionPhotos: Array.isArray(decisionPhotos) ? decisionPhotos : [],
        revisionReason: isRevision ? revisionReason : undefined,
        revisionCount: isRevision ? (previousDecision?.revisionCount ?? 0) + 1 : 0,
        previousDecisionId: previousDecision?.id, // Link to old decision for audit trail
      });
    } catch (auditError) {
      console.error('Failed to log decision audit trail:', auditError);
      // Don't fail the request if audit logging fails
    }

    // Auto-transition product status if all variants are decided
    try {
      const variantInfo = discrepancy.variant;
      const productId = variantInfo.productId;
      await autoTransitionProductStatus(id, productId);
    } catch (transitionError) {
      console.error('Failed to auto-transition product status:', transitionError);
      // Don't fail the request if auto-transition fails
    }

    // Send revision notification if this is an update to existing decision
    if (isRevision) {
      try {
        const shipment = await prisma.sellerToAdminShipment.findUnique({
          where: { id },
          select: {
            seller: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        if (shipment?.seller && shipment.seller.email) {
          const variantInfo = discrepancy.variant;
          const variantDetails = [
            variantInfo.product.title,
            variantInfo.size && `Size: ${variantInfo.size}`,
            variantInfo.color && `Color: ${variantInfo.color}`,
          ]
            .filter(Boolean)
            .join(', ');

          // Build revision summary
          const revisionSummary = `Decision changed from ${oldAcceptanceStatus} to ${acceptanceStatus}`;

          await sendVariantDiscrepancyNotification({
            sellerName: shipment.seller.name || 'Seller',
            sellerEmail: shipment.seller.email,
            productTitle: variantInfo.product.title,
            variantDetails,
            quantityExpected: existingDiscrepancy.quantityExpected,
            quantityReceived: existingDiscrepancy.quantityReceived ?? 0,
            quantityDamaged: existingDiscrepancy.quantityDamaged ?? 0,
            acceptanceStatus: acceptanceStatus as 'ACCEPTED' | 'RETURNING' | 'PARTIAL',
            unitsAccepted,
            unitsReturning,
            condition: existingDiscrepancy.condition ?? undefined,
            reason: notes ? `Revised: ${revisionSummary}. ${notes}` : revisionSummary,
          });
        }
      } catch (emailError) {
        console.error('Failed to send revision notification:', emailError);
        // Don't fail the request if email fails
      }
    }
    try {
      const shipment = await prisma.sellerToAdminShipment.findUnique({
        where: { id },
        select: {
          seller: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (shipment?.seller && shipment.seller.email) {
        const variantInfo = discrepancy.variant;
        const variantDetails = [
          variantInfo.product.title,
          variantInfo.size && `Size: ${variantInfo.size}`,
          variantInfo.color && `Color: ${variantInfo.color}`,
        ]
          .filter(Boolean)
          .join(', ');

        await sendVariantDiscrepancyNotification({
          sellerName: shipment.seller.name || 'Seller',
          sellerEmail: shipment.seller.email,
          productTitle: variantInfo.product.title,
          variantDetails,
          quantityExpected: existingDiscrepancy.quantityExpected,
          quantityReceived: existingDiscrepancy.quantityReceived ?? 0,
          quantityDamaged: existingDiscrepancy.quantityDamaged ?? 0,
          acceptanceStatus: acceptanceStatus as 'ACCEPTED' | 'RETURNING' | 'PARTIAL',
          unitsAccepted,
          unitsReturning,
          condition: existingDiscrepancy.condition ?? undefined,
          reason: notes ?? undefined, // Use the new notes passed in the request
        });
      }
    } catch (emailError) {
      console.error('Failed to send discrepancy notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Acceptance status updated',
      discrepancy,
    });
  } catch (error) {
    console.error('Error updating variant discrepancy:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update variant discrepancy', error: (error as Error).message },
      { status: 500 }
    );
  }
}
