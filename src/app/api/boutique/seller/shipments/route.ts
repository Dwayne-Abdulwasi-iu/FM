import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/boutique/seller/shipments - Get seller's shipments with discrepancy info
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const shipments = await prisma.sellerToAdminShipment.findMany({
      where: {
        sellerId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get product details for each shipment
    const shipmentsWithProducts = await Promise.all(
      shipments.map(async (shipment) => {
        const products = await prisma.boutiqueProduct.findMany({
          where: {
            id: { in: shipment.productIds },
          },
          select: {
            id: true,
            title: true,
            status: true,
          },
        });

        return {
          id: shipment.id,
          trackingNumber: shipment.trackingNumber,
          courier: shipment.carrier,
          status: shipment.status,
          shippedAt: shipment.shippedAt,
          receivedAt: shipment.deliveredAt,
          expectedDeliveryDate: shipment.expectedDeliveryDate,
          itemsExpected: shipment.itemsExpected,
          itemsReceived: shipment.itemsReceived,
          itemsMissing: shipment.itemsMissing,
          itemsDamaged: shipment.itemsDamaged,
          hasDiscrepancy: shipment.hasDiscrepancy,
          disputeStatus: shipment.disputeStatus,
          disputeResolution: shipment.disputeResolution,
          disputeNotes: shipment.disputeNotes,
          adminNotes: shipment.adminNotes,
          productIds: shipment.productIds,
          products,
          createdAt: shipment.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      shipments: shipmentsWithProducts,
    });
  } catch (error) {
    console.error('Error fetching seller shipments:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shipments' },
      { status: 500 }
    );
  }
}
