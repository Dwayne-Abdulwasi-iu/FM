// Shipment Detail API
// GET - Fetch single shipment
// PUT - Update shipment status

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const userRole = session?.user ? (session.user as { role?: string }).role : null;
    if (!session?.user || userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('Fetching shipment:', id);

    const shipment = await prisma.sellerToAdminShipment.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, name: true, email: true },
        },
        variantDiscrepancies: {
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
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }

    console.log('Found shipment:', { id: shipment.id, productIds: shipment.productIds, itemsExpected: shipment.itemsExpected });

    // Get product details with variants
    const products = await prisma.boutiqueProduct.findMany({
      where: { id: { in: shipment.productIds } },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        basePrice: true,
        variants: {
          select: {
            id: true,
            size: true,
            color: true,
            colorHex: true,
            quantity: true,
            priceAdjustment: true,
            sku: true,
          },
        },
      },
    });

    console.log('Found products:', { count: products.length, productIds: products.map(p => p.id) });

    return NextResponse.json({
      success: true,
      shipment: { 
        ...shipment, 
        products,
        // Keep the original itemsExpected from the shipment (total quantity of items, not product count)
      },
    });
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shipment', error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const userRole = session?.user ? (session.user as { role?: string }).role : null;
    if (!session?.user || userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

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

    if (action === 'confirmReceipt') {
      // Update shipment status
      const updated = await prisma.sellerToAdminShipment.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receiptVerifiedAt: new Date(),
        },
      });

      // Update associated products to RECEIVED_BY_ADMIN
      if (shipment.productIds && shipment.productIds.length > 0) {
        const products = await prisma.boutiqueProduct.findMany({
          where: { id: { in: shipment.productIds } },
          select: {
            id: true,
            title: true,
            sellerId: true,
          },
        });

        await prisma.boutiqueProduct.updateMany({
          where: { id: { in: shipment.productIds } },
          data: { status: 'RECEIVED_BY_ADMIN' },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Shipment marked as received',
        shipment: updated,
      });
    }

    if (action === 'confirmReceiptWithDiscrepancy') {
      // Confirm receipt while preserving the discrepancy information
      const updated = await prisma.sellerToAdminShipment.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receiptVerifiedAt: new Date(),
          // Keep hasDiscrepancy as true - it was already set when discrepancy was reported
        },
      });

      // Update associated products to VERIFICATION_PASSED (ready for final review and go live)
      // Since discrepancy was already reported and receipt confirmed, items are ready
      if (shipment.productIds && shipment.productIds.length > 0) {
        const products = await prisma.boutiqueProduct.findMany({
          where: { id: { in: shipment.productIds } },
          select: {
            id: true,
            title: true,
            sellerId: true,
          },
        });

        await prisma.boutiqueProduct.updateMany({
          where: { id: { in: shipment.productIds } },
          data: { status: 'VERIFICATION_PASSED' },
        });

        // Send emails to seller for verification passed
        for (const product of products) {
          try {
            const seller = await prisma.user.findUnique({
              where: { id: product.sellerId },
              select: { name: true, email: true },
            });

            if (seller && seller.email) {
              // Email notification handled via variant discrepancies endpoint
            }
          } catch (emailError) {
            console.error(`Failed to send notification for product ${product.id}:`, emailError);
            // Don't fail the request if email fails
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Shipment received with noted discrepancy - ready for final review',
        shipment: updated,
      });
    }

    if (action === 'markDiscrepancy') {
      const { type, itemsReceived, itemsDamaged, damageDetails, notes } = body;

      // Calculate missing items if itemsReceived is provided
      const itemsMissing = itemsReceived !== undefined ? Math.max(0, shipment.itemsExpected - itemsReceived) : undefined;

      // Build detailed notes including damage details if available
      let detailedNotes = notes || '';
      if (damageDetails && (damageDetails.name || damageDetails.location || damageDetails.notes)) {
        const damageInfo = [];
        if (damageDetails.name) damageInfo.push(`Item: ${damageDetails.name}`);
        if (damageDetails.location) damageInfo.push(`Location: ${damageDetails.location}`);
        if (damageDetails.notes) damageInfo.push(`Details: ${damageDetails.notes}`);
        const damageSummary = damageInfo.join(' | ');
        detailedNotes = detailedNotes ? `${damageSummary}\n\n${detailedNotes}` : damageSummary;
      }

      const updated = await prisma.sellerToAdminShipment.update({
        where: { id },
        data: {
          status: 'DISCREPANCY',
          hasDiscrepancy: true,
          itemsReceived: itemsReceived !== undefined ? itemsReceived : undefined,
          itemsMissing: itemsMissing,
          itemsDamaged: itemsDamaged !== undefined ? itemsDamaged : undefined,
          disputeStatus: type,
          disputeNotes: detailedNotes || undefined,
          conditionNotes: detailedNotes || undefined,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Shipment marked as discrepancy',
        shipment: updated,
      });
    }

    if (action === 'rejectShipment') {
      const { reason } = body;

      // Update shipment status to REJECTED
      const updated = await prisma.sellerToAdminShipment.update({
        where: { id },
        data: {
          status: 'REJECTED',
          disputeNotes: reason || undefined,
        },
      });

      // Update associated products to REJECTED status
      if (shipment.productIds && shipment.productIds.length > 0) {
        await prisma.boutiqueProduct.updateMany({
          where: { id: { in: shipment.productIds } },
          data: { 
            status: 'REJECTED',
            rejectionReason: reason,
          },
        });
      }

      // Send rejection email to seller
      const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com';
      if (shipment.seller?.email) {
        const emailHtml = `
          <h2>Shipment Rejected</h2>
          <p>Hello ${shipment.seller.name || 'Seller'},</p>
          <p>Unfortunately, your shipment to our warehouse has been rejected.</p>
          
          <h3>Rejection Details</h3>
          <ul>
            <li><strong>Shipment ID:</strong> ${id}</li>
            <li><strong>Reason:</strong> ${reason || 'Quality or compliance issue'}</li>
            <li><strong>Status:</strong> Return to Sender</li>
          </ul>
          
          <h3>Next Steps</h3>
          <p>Your products will be returned to your specified return address. Please:</p>
          <ol>
            <li>Check your email for return shipping details</li>
            <li>Arrange pickup with the carrier if applicable</li>
            <li>Verify receipt of your products when they arrive</li>
          </ol>
          
          <p>If you believe this rejection was in error, please contact our support team to discuss options.</p>
          
          <p>
            <a href="${baseUrl}/seller/boutique/shipments" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
              View Shipment Details
            </a>
          </p>
        `;

        await sendEmail({
          to: shipment.seller.email,
          subject: `Shipment Rejected: ${id}`,
          html: emailHtml,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Shipment rejected and seller notified',
        shipment: updated,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating shipment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update shipment' },
      { status: 500 }
    );
  }
}
