// Admin Shipment Dispute Resolution
// GET /api/boutique/admin/shipments/[id]/dispute - Get dispute details
// POST /api/boutique/admin/shipments/[id]/dispute - Resolve dispute

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS } from '@/lib/boutique/constants';

// GET - Get dispute details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const shipment = await prisma.sellerToAdminShipment.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Get affected products
    const products = await prisma.boutiqueProduct.findMany({
      where: { id: { in: shipment.productIds } },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        status: true,
        basePrice: true,
        physicalNotes: true,
      },
    });

    return NextResponse.json({
      success: true,
      shipment,
      products,
      dispute: {
        hasDiscrepancy: shipment.hasDiscrepancy,
        status: shipment.disputeStatus,
        openedAt: shipment.disputeOpenedAt,
        resolvedAt: shipment.disputeResolvedAt,
        resolution: shipment.disputeResolution,
        notes: shipment.disputeNotes,
        itemsExpected: shipment.itemsExpected,
        itemsReceived: shipment.itemsReceived,
        itemsMissing: shipment.itemsMissing,
        itemsDamaged: shipment.itemsDamaged,
      },
    });
  } catch (error) {
    console.error('Error fetching dispute details:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dispute' },
      { status: 500 }
    );
  }
}

// POST - Resolve dispute
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      resolution, // SELLER_FAULT, CARRIER_FAULT, WRITTEN_OFF, SELLER_RESHIP
      notes,
      // For insurance claims
      insuranceClaimId,
      insuranceClaimAmount,
      // Actions for affected products
      productActions, // { [productId]: 'CANCEL' | 'RESHIP' | 'PROCEED' }
    } = body;

    if (!resolution) {
      return NextResponse.json(
        { success: false, message: 'Resolution type required' },
        { status: 400 }
      );
    }

    const shipment = await prisma.sellerToAdminShipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }

    if (!shipment.hasDiscrepancy || shipment.disputeStatus === 'RESOLVED') {
      return NextResponse.json(
        { success: false, message: 'No active dispute for this shipment' },
        { status: 400 }
      );
    }

    // Determine new status based on resolution
    let newDisputeStatus: string;
    switch (resolution) {
      case 'SELLER_FAULT':
        newDisputeStatus = 'SELLER_FAULT';
        break;
      case 'CARRIER_FAULT':
        newDisputeStatus = 'CARRIER_FAULT';
        break;
      case 'WRITTEN_OFF':
      case 'SELLER_RESHIP':
        newDisputeStatus = 'RESOLVED';
        break;
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid resolution type' },
          { status: 400 }
        );
    }

    // Update shipment
    const updatedShipment = await prisma.sellerToAdminShipment.update({
      where: { id },
      data: {
        status: newDisputeStatus === 'RESOLVED' ? 'RESOLVED' : 'DISPUTED',
        disputeStatus: newDisputeStatus,
        disputeResolvedAt: new Date(),
        disputeResolution: resolution,
        disputeNotes: notes,
        insuranceClaimId: resolution === 'CARRIER_FAULT' ? insuranceClaimId : null,
        insuranceClaimStatus: resolution === 'CARRIER_FAULT' ? 'PENDING' : null,
        insuranceClaimAmount: resolution === 'CARRIER_FAULT' ? insuranceClaimAmount : null,
      },
    });

    // Handle individual product actions
    if (productActions && typeof productActions === 'object') {
      for (const [productId, action] of Object.entries(productActions)) {
        if (!shipment.productIds.includes(productId)) continue;

        switch (action) {
          case 'CANCEL':
            // Cancel the product listing
            await prisma.boutiqueProduct.update({
              where: { id: productId },
              data: {
                status: PRODUCT_STATUS.CANCELLED,
                rejectionReason: `Shipment dispute - ${resolution}`,
                rejectionDate: new Date(),
              },
            });
            break;

          case 'PROCEED':
            // Product was actually received, proceed normally
            await prisma.boutiqueProduct.update({
              where: { id: productId },
              data: {
                status: PRODUCT_STATUS.RECEIVED_BY_ADMIN,
                warehouseReceivedAt: new Date(),
                physicalNotes: `Dispute resolved - ${resolution}`,
              },
            });
            break;

          case 'RESHIP':
            // Seller will reship - reset to CONTENT_APPROVED
            await prisma.boutiqueProduct.update({
              where: { id: productId },
              data: {
                status: PRODUCT_STATUS.CONTENT_APPROVED,
                shipmentId: null, // Clear old shipment
                physicalNotes: `Awaiting reship after dispute - ${resolution}`,
              },
            });
            break;
        }
      }
    } else {
      // Default: cancel all missing products if no specific actions provided
      const missingCount = shipment.itemsMissing || 0;
      if (missingCount > 0 && resolution !== 'SELLER_RESHIP') {
        const receivedCount = shipment.itemsReceived || 0;
        const missingProductIds = shipment.productIds.slice(receivedCount);
        
        await prisma.boutiqueProduct.updateMany({
          where: { id: { in: missingProductIds } },
          data: {
            status: PRODUCT_STATUS.CANCELLED,
            rejectionReason: `Shipment dispute - ${resolution}: Item never received`,
            rejectionDate: new Date(),
          },
        });
      }
    }

    // TODO: Send notifications
    // - Notify seller of dispute resolution
    // - If CARRIER_FAULT, initiate insurance claim process
    // - If SELLER_RESHIP, send reship instructions

    return NextResponse.json({
      success: true,
      message: `Dispute resolved: ${resolution}`,
      shipment: updatedShipment,
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}
