// Admin Shipment Receipt Management
// GET - List incoming shipments
// POST - Record receipt of shipment with verification

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS } from '@/lib/boutique/constants';
import { sendEmail } from '@/lib/email';

// GET - List shipments for admin (with filters)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const hasDiscrepancy = searchParams.get('hasDiscrepancy');
    const search = searchParams.get('search')?.toLowerCase().trim();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }
    
    if (hasDiscrepancy === 'true') {
      where.hasDiscrepancy = true;
    }

    // Build search filter for shipment ID, tracking number, seller name, and product ID
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { seller: { name: { contains: search, mode: 'insensitive' } } },
        { seller: { email: { contains: search, mode: 'insensitive' } } },
        { productIds: { hasSome: [search] } }, // Search by product ID
      ];
    }

    const [shipments, total] = await Promise.all([
      prisma.sellerToAdminShipment.findMany({
        where,
        include: {
          seller: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sellerToAdminShipment.count({ where }),
    ]);

    // Get product details for each shipment
    const shipmentsWithProducts = await Promise.all(
      shipments.map(async (shipment) => {
        const products = await prisma.boutiqueProduct.findMany({
          where: { id: { in: shipment.productIds } },
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            status: true,
            basePrice: true,
          },
        });
        return { ...shipment, products };
      })
    );

    return NextResponse.json({
      success: true,
      shipments: shipmentsWithProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching admin shipments:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shipments' },
      { status: 500 }
    );
  }
}

// POST - Record receipt of a shipment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      shipmentId,
      itemsReceived,
      itemsDamaged,
      conditionOnReceipt,
      conditionNotes,
      receiptPhotos,
      adminNotes,
    } = body;

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, message: 'Shipment ID required' },
        { status: 400 }
      );
    }

    if (typeof itemsReceived !== 'number' || itemsReceived < 0) {
      return NextResponse.json(
        { success: false, message: 'Valid items received count required' },
        { status: 400 }
      );
    }

    const shipment = await prisma.sellerToAdminShipment.findUnique({
      where: { id: shipmentId },
      include: { seller: true },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }

    if (!['SHIPPED', 'IN_TRANSIT'].includes(shipment.status)) {
      return NextResponse.json(
        { success: false, message: `Cannot receive shipment in ${shipment.status} status` },
        { status: 400 }
      );
    }

    const itemsExpected = shipment.itemsExpected || shipment.productIds.length;
    const itemsMissing = Math.max(0, itemsExpected - itemsReceived);
    const hasDiscrepancy = itemsMissing > 0 || (itemsDamaged && itemsDamaged > 0);
    
    // Determine status based on receipt
    let newStatus: string;
    if (itemsReceived === 0) {
      newStatus = 'DISPUTED'; // Nothing received - dispute
    } else if (hasDiscrepancy) {
      newStatus = 'PARTIAL_DELIVERY';
    } else {
      newStatus = 'DELIVERED';
    }

    // Update shipment with receipt details
    const updatedShipment = await prisma.sellerToAdminShipment.update({
      where: { id: shipmentId },
      data: {
        status: newStatus,
        itemsReceived,
        itemsMissing,
        itemsDamaged: itemsDamaged || 0,
        conditionOnReceipt,
        conditionNotes,
        receiptPhotos: receiptPhotos || [],
        receivedBy: session.user.id,
        receiptVerifiedAt: new Date(),
        deliveredAt: new Date(),
        hasDiscrepancy,
        disputeStatus: hasDiscrepancy ? 'OPENED' : 'NONE',
        disputeOpenedAt: hasDiscrepancy ? new Date() : null,
        adminNotes,
      },
    });

    // Update product statuses based on receipt
    const productsToUpdate = shipment.productIds.slice(0, itemsReceived - (itemsDamaged || 0));
    const damagedProducts = shipment.productIds.slice(
      itemsReceived - (itemsDamaged || 0),
      itemsReceived
    );
    const missingProducts = shipment.productIds.slice(itemsReceived);

    // Mark received products as RECEIVED_BY_ADMIN
    if (productsToUpdate.length > 0) {
      await prisma.boutiqueProduct.updateMany({
        where: { id: { in: productsToUpdate } },
        data: {
          status: PRODUCT_STATUS.RECEIVED_BY_ADMIN,
          warehouseReceivedAt: new Date(),
        },
      });
    }

    // Mark damaged products as REJECTED with reason
    if (damagedProducts.length > 0) {
      await prisma.boutiqueProduct.updateMany({
        where: { id: { in: damagedProducts } },
        data: {
          status: PRODUCT_STATUS.REJECTED,
          rejectionReason: 'Damaged during shipping',
          rejectionDate: new Date(),
        },
      });
    }

    // Mark missing products - keep in SHIPPED_TO_ADMIN but flag them
    // (They'll be handled via dispute resolution)
    if (missingProducts.length > 0) {
      await prisma.boutiqueProduct.updateMany({
        where: { id: { in: missingProducts } },
        data: {
          // Keep status as SHIPPED_TO_ADMIN - dispute will resolve
          physicalNotes: 'Item not received in shipment - under dispute',
        },
      });
    }

    // Send notification email to seller
    const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com';
    if (shipment.seller?.email) {
      const statusMessage = hasDiscrepancy
        ? `received with discrepancy (${itemsReceived}/${itemsExpected} items)`
        : `received successfully (${itemsReceived} items)`;
      
      const emailHtml = `
        <h2>Shipment Receipt Confirmation</h2>
        <p>Hello ${shipment.seller.name || 'Seller'},</p>
        <p>Your shipment to our warehouse has been ${statusMessage}.</p>
        
        <h3>Receipt Summary</h3>
        <ul>
          <li><strong>Items Expected:</strong> ${itemsExpected}</li>
          <li><strong>Items Received:</strong> ${itemsReceived}</li>
          ${itemsMissing > 0 ? `<li><strong>Items Missing:</strong> ${itemsMissing}</li>` : ''}
          ${itemsDamaged ? `<li><strong>Items Damaged:</strong> ${itemsDamaged}</li>` : ''}
          <li><strong>Status:</strong> ${newStatus}</li>
        </ul>
        
        ${hasDiscrepancy ? `
          <h3>Discrepancy Dispute Opened</h3>
          <p>A dispute has been opened to investigate the missing or damaged items. Our team will contact you shortly to resolve this matter.</p>
        ` : ''}
        
        <p>
          <a href="${baseUrl}/seller/boutique/shipments" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            View Shipment Details
          </a>
        </p>
      `;

      await sendEmail({
        to: shipment.seller.email,
        subject: `Shipment ${hasDiscrepancy ? 'Received with Discrepancy' : 'Received'}: ${shipment.id}`,
        html: emailHtml,
      });
    }

    return NextResponse.json({
      success: true,
      message: hasDiscrepancy 
        ? `Received ${itemsReceived}/${itemsExpected} items. Discrepancy dispute opened.`
        : `All ${itemsReceived} items received successfully.`,
      shipment: updatedShipment,
      summary: {
        expected: itemsExpected,
        received: itemsReceived,
        missing: itemsMissing,
        damaged: itemsDamaged || 0,
        hasDiscrepancy,
      },
    });
  } catch (error) {
    console.error('Error recording shipment receipt:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to record receipt' },
      { status: 500 }
    );
  }
}
