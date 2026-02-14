// Variant-Level Discrepancy API
// GET - Fetch variant discrepancies for a shipment
// POST - Create/save variant discrepancies

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Fetch variant discrepancies for this shipment
    const variantDiscrepancies = await prisma.variantDiscrepancy.findMany({
      where: { shipmentId: id },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      variantDiscrepancies,
    });
  } catch (error) {
    console.error('Error fetching variant discrepancies:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch variant discrepancies', error: (error as Error).message },
      { status: 500 }
    );
  }
}

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
      variantId,
      quantityExpected,
      quantityReceived,
      quantityDamaged,
      condition,
      notes,
    } = body;

    if (!variantId || quantityExpected === undefined) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: variantId, quantityExpected' },
        { status: 400 }
      );
    }

    // Check if shipment exists
    const shipment = await prisma.sellerToAdminShipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Verify variant exists and belongs to a product in this shipment
    const variant = await prisma.boutiqueProductVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Variant not found' },
        { status: 404 }
      );
    }

    // Verify the variant's product is in this shipment
    if (!shipment.productIds.includes(variant.productId)) {
      return NextResponse.json(
        { success: false, message: 'Variant product is not in this shipment' },
        { status: 400 }
      );
    }

    // Calculate missing quantity

    const quantityMissing =
      quantityReceived !== undefined
        ? quantityExpected - quantityReceived
        : undefined;

    // Upsert variant discrepancy
    const discrepancy = await prisma.variantDiscrepancy.upsert({
      where: {
        shipmentId_variantId: {
          shipmentId: id,
          variantId,
        },
      },
      update: {
        quantityExpected,
        quantityReceived: quantityReceived ?? undefined,
        quantityDamaged: quantityDamaged ?? undefined,
        quantityMissing: quantityMissing ?? undefined,
        condition: condition ?? undefined,
        notes: notes ?? undefined,
      },
      create: {
        shipmentId: id,
        variantId,
        quantityExpected,
        quantityReceived: quantityReceived ?? undefined,
        quantityDamaged: quantityDamaged ?? undefined,
        quantityMissing: quantityMissing ?? undefined,
        condition: condition ?? undefined,
        notes: notes ?? undefined,
        acceptanceStatus: 'PENDING',
      },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    });

    // Mark shipment as having discrepancy if there are issues
    const hasAnyDiscrepancy = 
      (quantityMissing !== undefined && quantityMissing > 0) ||
      (quantityDamaged !== undefined && quantityDamaged > 0) ||
      (quantityReceived !== undefined && quantityReceived < quantityExpected);
    
    if (hasAnyDiscrepancy) {
      await prisma.sellerToAdminShipment.update({
        where: { id },
        data: { hasDiscrepancy: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Variant discrepancy recorded',
      discrepancy,
    });
  } catch (error) {
    console.error('Error creating variant discrepancy:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create variant discrepancy', error: (error as Error).message },
      { status: 500 }
    );
  }
}
