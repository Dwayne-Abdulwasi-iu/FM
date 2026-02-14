// Admin Shipment Dispute Resolution
// GET /api/boutique/admin/shipments/[id]/dispute - Get dispute details
// POST /api/boutique/admin/shipments/[id]/dispute - Resolve dispute

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS } from '@/lib/boutique/constants';
import { sendEmail } from '@/lib/email';

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
      include: { seller: true },
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

    // Send dispute resolution notifications via email
    const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com';
    if (shipment.seller?.email) {
      let resolutionText = '';
      let sellerAction = '';
      let itemsToReturn = 0;
      
      switch (resolution) {
        case 'SELLER_FAULT':
          resolutionText = 'The discrepancy was determined to be due to seller error. In this case, <strong>NO items will be returned</strong> to you as the fault lies with your shipment preparation.';
          sellerAction = 'Your account may be subject to review for compliance.';
          break;
        case 'CARRIER_FAULT':
          itemsToReturn = Math.max(0, (shipment.itemsReceived || 0) - 1);
          resolutionText = `The carrier is responsible for the missing or damaged items. An insurance claim has been initiated. A return shipment of <strong>${itemsToReturn} items</strong> will be prepared for you (1 item retained for verification records).`;
          sellerAction = 'You will receive compensation from the insurance claim once processed. Return tracking will be sent within 5 business days.';
          break;
        case 'WRITTEN_OFF':
          resolutionText = 'The discrepancy has been written off as a business loss.';
          sellerAction = 'No further action is required.';
          break;
        case 'SELLER_RESHIP':
          resolutionText = 'You have been requested to reship the missing items to our warehouse.';
          sellerAction = 'Please follow the reship instructions provided in your dashboard. When we receive the reshipped items, they will be processed and the original missing items will not be returned.';
          break;
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #4F46E5; margin-top: 0;">📋 Shipment Dispute Resolution</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Hello <strong>${shipment.seller.name || 'Seller'}</strong>,
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              The dispute regarding your shipment has been resolved.
            </p>
            
            <div style="background-color: #f3f4f6; border-left: 4px solid #4F46E5; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: bold;">📦 Resolution Details:</p>
              <p style="color: #374151; margin: 5px 0;"><strong>Shipment ID:</strong> ${id}</p>
              <p style="color: #374151; margin: 5px 0;"><strong>Resolution Type:</strong> ${resolution}</p>
              <p style="color: #374151; margin: 5px 0;"><strong>Status:</strong> Resolved</p>
            </div>
            
            <div style="background-color: #F0F9FF; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; color: #0C4A6E; font-weight: bold;">🔍 What This Means:</p>
              <p style="color: #0C4A6E; margin: 8px 0 0 0;">${resolutionText}</p>
            </div>
            
            <div style="background-color: #DBEAFE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #0C4A6E; font-weight: bold;">✅ What You Need To Do:</p>
              <p style="color: #0C4A6E; margin: 8px 0 0 0;"><strong>${sellerAction}</strong></p>
            </div>
            
            ${notes ? `
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400E; font-weight: bold;">📝 Admin Notes:</p>
                <p style="color: #92400E; margin: 8px 0 0 0;">${notes}</p>
              </div>
            ` : ''}
            
            ${insuranceClaimId ? `
              <div style="background-color: #D1FAE5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #065F46; font-weight: bold;">🛡️ Insurance Claim Information:</p>
                <p style="color: #065F46; margin: 5px 0;"><strong>Claim ID:</strong> ${insuranceClaimId}</p>
                ${insuranceClaimAmount ? `<p style="color: #065F46; margin: 5px 0;"><strong>Claim Amount:</strong> $${insuranceClaimAmount}</p>` : ''}
              </div>
            ` : ''}
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${baseUrl}/seller/boutique/shipments" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View Shipment Details
              </a>
            </div>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              If you have questions about this resolution or need further assistance, please contact our support team.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              This is an automated notification from Fashion Marketplace
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: shipment.seller.email,
        subject: `Dispute Resolved: ${id}`,
        html: emailHtml,
      });
    }

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
