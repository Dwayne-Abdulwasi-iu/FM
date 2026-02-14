// Auto-return returning variants
// POST - Create return shipment for all RETURNING variants in a discrepancy

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Get the shipment
    const shipment = await prisma.sellerToAdminShipment.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, name: true, email: true },
        },
        variantDiscrepancies: {
          where: { acceptanceStatus: 'RETURNING' },
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }

    if (shipment.variantDiscrepancies.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No variants marked for return' },
        { status: 400 }
      );
    }

    // Collect unique product IDs from returning variants
    const returningProductIds = Array.from(
      new Set(shipment.variantDiscrepancies.map(d => d.variant.product.id))
    );

    if (returningProductIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid products for return' },
        { status: 400 }
      );
    }

    // Check if a return shipment already exists for this seller with these products
    const existingReturn = await prisma.sellerToAdminShipment.findFirst({
      where: {
        sellerId: shipment.sellerId,
        productIds: {
          hasSome: returningProductIds,
        },
        status: {
          in: ['PENDING', 'RETURN_SCHEDULED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'],
        },
      },
    });

    if (existingReturn) {
      return NextResponse.json(
        { success: false, message: 'A return shipment already exists for these products' },
        { status: 409 }
      );
    }

    // Create return shipment for the returning variants
    const returningVariants = shipment.variantDiscrepancies
      .map(d => d.variant.product.title)
      .join(', ');

    const returnShipment = await prisma.sellerToAdminShipment.create({
      data: {
        sellerId: shipment.sellerId,
        productIds: returningProductIds,
        status: 'RETURN_SCHEDULED',
        disputeNotes: `Auto-generated return for variants with issues. Original shipment: ${shipment.id}. Products: ${returningVariants}`,
        createdAt: new Date(),
      },
    });

    // Update the variant discrepancies to mark them as returned (status=RETURNED)
    await prisma.variantDiscrepancy.updateMany({
      where: {
        shipmentId: id,
        acceptanceStatus: 'RETURNING',
      },
      data: {
        acceptanceStatus: 'RETURNED',
      },
    });

    // Set quantity to 0 for all returning variants since they're going back to seller
    const returningVariantIds = shipment.variantDiscrepancies.map(d => d.variantId);
    if (returningVariantIds.length > 0) {
      await prisma.boutiqueProductVariant.updateMany({
        where: { id: { in: returningVariantIds } },
        data: { quantity: 0 },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Return shipment created for returning variants',
      returnShipment,
      returningVariantCount: shipment.variantDiscrepancies.length,
      returningProducts: returningVariants,
    });
  } catch (error) {
    console.error('Error creating auto-return shipment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create return shipment', error: (error as Error).message },
      { status: 500 }
    );
  }
}
