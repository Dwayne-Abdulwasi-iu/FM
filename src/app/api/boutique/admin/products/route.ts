// Admin API routes for boutique product management
// GET - List products pending review
// PATCH - Approve/reject products

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS, BOUTIQUE_DEFAULTS } from '@/lib/boutique/constants';

// GET - List products for admin review
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
    const status = searchParams.get('status') || 'PENDING_CONTENT_REVIEW';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    
    if (status === 'all') {
      // Show all non-draft products
      where.status = { not: 'DRAFT' };
    } else {
      where.status = status;
    }

    const [products, total, statusCounts] = await Promise.all([
      prisma.boutiqueProduct.findMany({
        where,
        include: {
          category: true,
          seller: {
            select: { id: true, name: true, email: true, image: true },
          },
          media: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: true,
        },
        orderBy: { submittedAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.boutiqueProduct.count({ where }),
      prisma.boutiqueProduct.groupBy({
        by: ['status'],
        where: { status: { not: 'DRAFT' } },
        _count: true,
      }),
    ]);

    // Format status counts
    const counts: Record<string, number> = {};
    statusCounts.forEach(sc => {
      counts[sc.status] = sc._count;
    });

    return NextResponse.json({
      success: true,
      products,
      statusCounts: counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching admin boutique products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// PATCH - Update product status (approve/reject)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productId, action, reason, notes, qualityScore, warehouseLocation } = body;

    if (!productId || !action) {
      return NextResponse.json(
        { success: false, message: 'Product ID and action required' },
        { status: 400 }
      );
    }

    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};
    let message = '';

    switch (action) {
      case 'approve_content':
        // Content review passed - awaiting physical product
        if (product.status !== PRODUCT_STATUS.PENDING_CONTENT_REVIEW) {
          return NextResponse.json(
            { success: false, message: 'Product not in content review status' },
            { status: 400 }
          );
        }
        updateData = {
          status: PRODUCT_STATUS.CONTENT_APPROVED,
          contentReviewedAt: new Date(),
          contentReviewedBy: session.user.id,
          contentNotes: notes,
        };
        message = 'Content approved. Seller notified to ship product within 7 days.';
        // TODO: Send email to seller with shipping instructions
        break;

      case 'reject_content':
        // Content review failed
        if (product.status !== PRODUCT_STATUS.PENDING_CONTENT_REVIEW) {
          return NextResponse.json(
            { success: false, message: 'Product not in content review status' },
            { status: 400 }
          );
        }
        if (!reason) {
          return NextResponse.json(
            { success: false, message: 'Rejection reason required' },
            { status: 400 }
          );
        }
        updateData = {
          status: PRODUCT_STATUS.REJECTED,
          rejectionReason: reason,
          rejectionDate: new Date(),
          contentReviewedAt: new Date(),
          contentReviewedBy: session.user.id,
          contentNotes: notes,
        };
        message = 'Content rejected. Seller notified with feedback.';
        // TODO: Send email to seller with rejection reason
        break;

      case 'mark_received':
        // Admin received the physical product
        if (product.status !== PRODUCT_STATUS.SHIPPED_TO_ADMIN) {
          return NextResponse.json(
            { success: false, message: 'Product not in shipped status' },
            { status: 400 }
          );
        }
        updateData = {
          status: PRODUCT_STATUS.RECEIVED_BY_ADMIN,
          warehouseReceivedAt: new Date(),
        };
        
        // Update shipment status
        if (product.shipmentId) {
          await prisma.sellerToAdminShipment.update({
            where: { id: product.shipmentId },
            data: {
              status: 'DELIVERED',
              deliveredAt: new Date(),
            },
          });
        }
        message = 'Product marked as received. Proceed with physical verification.';
        break;

      case 'verify_physical':
        // Physical verification passed - ready to go live
        if (product.status !== PRODUCT_STATUS.RECEIVED_BY_ADMIN) {
          return NextResponse.json(
            { success: false, message: 'Product not in received status' },
            { status: 400 }
          );
        }
        updateData = {
          status: PRODUCT_STATUS.VERIFICATION_PASSED,
          physicalVerifiedAt: new Date(),
          physicalVerifiedBy: session.user.id,
          physicalNotes: notes,
          qualityScore: qualityScore || 5,
          warehouseLocation: warehouseLocation,
        };
        
        // Create warehouse inventory record
        await prisma.warehouseInventory.create({
          data: {
            productId: product.id,
            zone: warehouseLocation?.split('-')[0] || 'A',
            shelf: warehouseLocation?.split('-')[1] || '1',
            bin: warehouseLocation?.split('-')[2] || 'A1',
            status: 'IN_STOCK',
            conditionOnReceipt: product.condition,
            conditionNotes: notes,
            storageStartDate: new Date(),
            storageFreeUntil: new Date(Date.now() + BOUTIQUE_DEFAULTS.freeStorageDays * 24 * 60 * 60 * 1000),
            monthlyStorageFee: (product.basePrice * BOUTIQUE_DEFAULTS.storageFeePct) / 100,
          },
        });
        
        message = 'Physical verification passed. Product ready to go live.';
        break;

      case 'reject_physical':
        // Physical product doesn't match listing
        if (product.status !== PRODUCT_STATUS.RECEIVED_BY_ADMIN) {
          return NextResponse.json(
            { success: false, message: 'Product not in received status' },
            { status: 400 }
          );
        }
        if (!reason) {
          return NextResponse.json(
            { success: false, message: 'Rejection reason required' },
            { status: 400 }
          );
        }
        updateData = {
          status: PRODUCT_STATUS.REJECTED,
          rejectionReason: reason,
          rejectionDate: new Date(),
          physicalVerifiedAt: new Date(),
          physicalVerifiedBy: session.user.id,
          physicalNotes: notes,
        };
        message = 'Physical verification failed. Product will be returned to seller.';
        // TODO: Initiate return to seller process
        break;

      case 'go_live':
        // Make product available for purchase
        if (product.status !== PRODUCT_STATUS.VERIFICATION_PASSED) {
          return NextResponse.json(
            { success: false, message: 'Product must pass verification first' },
            { status: 400 }
          );
        }
        updateData = {
          status: PRODUCT_STATUS.LIVE,
          approvedAt: new Date(),
          storageFeeStartDate: new Date(Date.now() + BOUTIQUE_DEFAULTS.freeStorageDays * 24 * 60 * 60 * 1000),
        };
        message = 'Product is now live and available for purchase!';
        // TODO: Send notification to seller
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedProduct = await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: true,
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating boutique product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
      { status: 500 }
    );
  }
}
