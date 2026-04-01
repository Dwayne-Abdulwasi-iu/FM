// POST /api/boutique/products/[id]/shipment - Mark product as shipped to admin
// Updates status from CONTENT_APPROVED to SHIPPED_TO_ADMIN

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS, BOUTIQUE_DEFAULTS } from '@/lib/boutique/constants';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const product = await prisma.boutiqueProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (session.user.id !== product.sellerId) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Check current status
    if (product.status !== PRODUCT_STATUS.CONTENT_APPROVED) {
      return NextResponse.json(
        { success: false, message: 'Product must be approved before shipping' },
        { status: 400 }
      );
    }

    // Check if seller has set return address (required for rejected products to be returned)
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { boutique_returnAddress: true },
    });

    if (!seller?.boutique_returnAddress) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Please add your return address in Settings before shipping. This is required so we can return rejected products to you.',
          code: 'MISSING_RETURN_ADDRESS',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      trackingNumber,
      carrier,
      shippingCost,
      shippingPaidMethod, // PREPAID or DEDUCT_FROM_SALE
      sellerAddress,
      warehouseAddress,
      itemsExpected,
    } = body;

    // Validate required fields
    if (!trackingNumber || !carrier) {
      return NextResponse.json(
        { success: false, message: 'Tracking number and carrier are required' },
        { status: 400 }
      );
    }

    if (!sellerAddress || !sellerAddress.street || !sellerAddress.city || !sellerAddress.state) {
      return NextResponse.json(
        { success: false, message: 'Complete seller address is required' },
        { status: 400 }
      );
    }

    console.log('Creating shipment with warehouseAddress:', warehouseAddress);
    
    // Create shipment record
    const shipment = await prisma.sellerToAdminShipment.create({
      data: {
        sellerId: session.user.id,
        productIds: [id],
        trackingNumber,
        carrier,
        shippingCost: shippingCost || 0,
        shippingPaidMethod: shippingPaidMethod || 'DEDUCT_FROM_SALE',
        shippingPaidAt: shippingPaidMethod === 'PREPAID' ? new Date() : null,
        sellerAddress,
        warehouseAddress: warehouseAddress ? JSON.parse(JSON.stringify(warehouseAddress)) : null,
        status: 'SHIPPED',
        shippedAt: new Date(),
        itemsExpected: itemsExpected || 1,
        expectedDeliveryDate: new Date(Date.now() + BOUTIQUE_DEFAULTS.shipmentDeadlineDays * 24 * 60 * 60 * 1000),
      },
    });

    // Update product status
    const updatedProduct = await prisma.boutiqueProduct.update({
      where: { id },
      data: {
        status: PRODUCT_STATUS.SHIPPED_TO_ADMIN,
        shipmentId: shipment.id,
      },
    });

    // Send notifications via email service

    const baseUrl = process.env.NEXTAUTH_URL || 'https://fashionmarketplace.example.com';
    const adminEmail = process.env.ADMIN_EMAIL;

    // Send confirmation email to seller
    if (session.user.email) {
      const sellerEmailHtml = `
        <h2>Shipment Confirmed</h2>
        <p>Hello ${session.user.name || 'Seller'},</p>
        <p>Your shipment for <strong>${product.title}</strong> has been recorded in our system.</p>
        
        <h3>Shipment Information</h3>
        <ul>
          <li><strong>Product:</strong> ${product.title}</li>
          <li><strong>Shipment ID:</strong> ${shipment.id}</li>
          <li><strong>Status:</strong> In Transit to Warehouse</li>
          <li><strong>Expected Arrival:</strong> Within 7 days</li>
        </ul>
        
        <p><strong>Important:</strong> Please ensure your package arrives at our warehouse within 7 days. After this period, the product may be cancelled.</p>
        
        <p>Our warehouse team will notify you once they receive and inspect your shipment.</p>
        
        <p>
          <a href="${baseUrl}/seller/boutique/ship" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            Track Shipment
          </a>
        </p>
      `;

      await sendEmail({
        to: session.user.email,
        subject: `Shipment Confirmed: ${product.title}`,
        html: sellerEmailHtml,
      });
    }

    // Notify admin about incoming shipment
    if (adminEmail) {
      const adminEmailHtml = `
        <h2>Incoming Shipment to Warehouse</h2>
        <p>A seller's shipment has been recorded and is expected to arrive at the warehouse.</p>
        
        <h3>Shipment Details</h3>
        <ul>
          <li><strong>Shipment ID:</strong> ${shipment.id}</li>
          <li><strong>Product ID:</strong> ${id}</li>
          <li><strong>Product:</strong> ${product.title}</li>
          <li><strong>Seller:</strong> ${session.user.name || 'Unknown'}</li>
          <li><strong>Seller Email:</strong> ${session.user.email || 'N/A'}</li>
          <li><strong>Expected Arrival:</strong> Within 7 days from ${new Date().toLocaleDateString()}</li>
        </ul>
        
        <p>Once this shipment arrives, it will need to be received and verified in the warehouse system.</p>
        
        <p>
          <a href="${baseUrl}/admin/boutique/shipments?shipmentId=${shipment.id}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">
            View Shipment
          </a>
        </p>
      `;

      await sendEmail({
        to: adminEmail,
        subject: `Incoming Shipment: ${product.title}`,
        html: adminEmailHtml,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Shipment recorded. Please ensure your package arrives within 7 days.',
      product: updatedProduct,
      shipment,
    });
  } catch (error) {
    console.error('Error recording boutique product shipment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to record shipment' },
      { status: 500 }
    );
  }
}

// GET - Get shipment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const product = await prisma.boutiqueProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Check ownership or admin
    if (session.user.id !== product.sellerId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    if (!product.shipmentId) {
      return NextResponse.json({
        success: true,
        shipment: null,
        message: 'No shipment recorded for this product',
      });
    }

    const shipment = await prisma.sellerToAdminShipment.findUnique({
      where: { id: product.shipmentId },
    });

    return NextResponse.json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error('Error fetching boutique product shipment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shipment' },
      { status: 500 }
    );
  }
}
