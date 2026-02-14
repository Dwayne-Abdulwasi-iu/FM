// Admin API routes for boutique product management
// GET - List products pending review
// PATCH - Approve/reject products

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS, BOUTIQUE_DEFAULTS } from '@/lib/boutique/constants';
import { notifyContentApproved, notifyContentRejected, notifyProductStatusChange } from '@/lib/boutique-notifications';

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
    const fulfillmentMethod = searchParams.get('fulfillmentMethod');
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
    
    // Add fulfillment filter if specified
    if (fulfillmentMethod && fulfillmentMethod !== 'ALL') {
      where.fulfillmentMethod = fulfillmentMethod;
    }

    // For status counts, count all statuses but respect fulfillment filter
    const whereForStatusCounts: Record<string, unknown> = {
      status: { not: 'DRAFT' },
    };
    if (fulfillmentMethod && fulfillmentMethod !== 'ALL') {
      whereForStatusCounts.fulfillmentMethod = fulfillmentMethod;
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
        where: whereForStatusCounts,
        _count: true,
      }),
    ]);

    // Format status counts - convert to camelCase keys
    const counts: Record<string, number> = {
      pendingContentReview: 0,
      contentApproved: 0,
      shippedToAdmin: 0,
      receivedByAdmin: 0,
      verificationPassed: 0,
      live: 0,
      rejected: 0,
      cancelled: 0,
      sellerDirectPending: 0,
      sellerDirectLive: 0,
    };
    
    statusCounts.forEach(sc => {
      if (sc.status === 'PENDING_CONTENT_REVIEW') counts.pendingContentReview = sc._count;
      else if (sc.status === 'CONTENT_APPROVED') counts.contentApproved = sc._count;
      else if (sc.status === 'SHIPPED_TO_ADMIN') counts.shippedToAdmin = sc._count;
      else if (sc.status === 'RECEIVED_BY_ADMIN') counts.receivedByAdmin = sc._count;
      else if (sc.status === 'VERIFICATION_PASSED') counts.verificationPassed = sc._count;
      else if (sc.status === 'LIVE') counts.live = sc._count;
      else if (sc.status === 'REJECTED') counts.rejected = sc._count;
      else if (sc.status === 'CANCELLED') counts.cancelled = sc._count;
    });

    // Fetch shipment details for products that have shipmentId
    const productsWithShipment = await Promise.all(
      products.map(async (product: any) => {
        let shipment = null;
        if ((product as any).shipmentId) {
          shipment = await prisma.sellerToAdminShipment.findUnique({
            where: { id: (product as any).shipmentId },
          });
        }
        return {
          ...product,
          shipment,
        };
      })
    );

    return NextResponse.json({
      success: true,
      products: productsWithShipment,
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
    const { productId, action, reason, notes, qualityScore, warehouseLocation, verification } = body;

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
        
        // Send email and platform notifications to seller
        if (product.seller) {
          await notifyContentApproved(
            product.id,
            product.title,
            product.seller.email,
            product.seller.name || 'Seller',
            product.seller.id
          );
        }
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
        
        // Send email and platform notifications to seller
        if (product.seller) {
          await notifyContentRejected(
            product.id,
            product.title,
            product.seller.email,
            product.seller.name || 'Seller',
            product.seller.id,
            reason,
            notes
          );
        }
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
        
        // Notify seller that product was received
        if (product.seller) {
          await notifyProductStatusChange(
            product.id,
            product.title,
            product.seller.email,
            product.seller.name || 'Seller',
            product.seller.id,
            product.status,
            PRODUCT_STATUS.RECEIVED_BY_ADMIN
          );
        }
        break;

      case 'verify_physical':
        // Physical verification passed - ready to go live
        if (product.status !== PRODUCT_STATUS.RECEIVED_BY_ADMIN) {
          return NextResponse.json(
            { success: false, message: 'Product not in received status' },
            { status: 400 }
          );
        }
        
        // Process verification data if provided
        if (verification) {
          // Update shipment with verification details
          if (product.shipmentId) {
            await prisma.sellerToAdminShipment.update({
              where: { id: product.shipmentId },
              data: {
                itemsReceived: verification.totalReceived,
                itemsMissing: verification.totalMissing,
                itemsDamaged: verification.totalDamaged,
                hasDiscrepancy: verification.hasDiscrepancy,
                disputeStatus: verification.hasDiscrepancy ? 'OPENED' : 'NONE',
                disputeOpenedAt: verification.hasDiscrepancy ? new Date() : null,
                disputeNotes: verification.notes,
                receiptVerifiedAt: new Date(),
                receivedBy: session.user.id,
                adminNotes: verification.notes,
              },
            });
          }
          
          // Update variant quantities based on passed items
          if (verification.variantVerifications) {
            for (const vv of verification.variantVerifications) {
              await prisma.boutiqueProductVariant.update({
                where: { id: vv.variantId },
                data: {
                  quantity: vv.passed, // Only passed items are available for sale
                },
              });
            }
          }
        }
        
        updateData = {
          status: PRODUCT_STATUS.VERIFICATION_PASSED,
          physicalVerifiedAt: new Date(),
          physicalVerifiedBy: session.user.id,
          physicalNotes: verification?.notes || notes,
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
            conditionOnReceipt: verification?.condition || 'GOOD',
            conditionNotes: verification?.notes || notes,
            storageStartDate: new Date(),
            storageFreeUntil: new Date(Date.now() + BOUTIQUE_DEFAULTS.freeStorageDays * 24 * 60 * 60 * 1000),
            monthlyStorageFee: (product.basePrice * BOUTIQUE_DEFAULTS.storageFeePct) / 100,
          },
        });
        
        message = verification?.hasDiscrepancy 
          ? `Verification complete with discrepancies. ${verification.totalPassed} of ${verification.totalExpected} items passed.`
          : 'Physical verification passed. Product ready to go live.';
        
        // Notify seller of verification result
        if (product.seller) {
          await notifyProductStatusChange(
            product.id,
            product.title,
            product.seller.email,
            product.seller.name || 'Seller',
            product.seller.id,
            product.status,
            PRODUCT_STATUS.VERIFICATION_PASSED
          );
        }
        break;

      case 'reject_physical':
        // Physical product doesn't match listing or has significant discrepancies
        if (product.status !== PRODUCT_STATUS.RECEIVED_BY_ADMIN) {
          return NextResponse.json(
            { success: false, message: 'Product not in received status' },
            { status: 400 }
          );
        }
        
        // Process verification data if provided
        if (verification) {
          // Update shipment with rejection/discrepancy details
          if (product.shipmentId) {
            await prisma.sellerToAdminShipment.update({
              where: { id: product.shipmentId },
              data: {
                itemsReceived: verification.totalReceived,
                itemsMissing: verification.totalMissing,
                itemsDamaged: verification.totalDamaged,
                hasDiscrepancy: true,
                disputeStatus: 'OPENED',
                disputeOpenedAt: new Date(),
                disputeNotes: verification.notes || reason,
                receiptVerifiedAt: new Date(),
                receivedBy: session.user.id,
                adminNotes: `Rejected: ${reason || verification.notes}`,
              },
            });
          }
        }
        
        updateData = {
          status: PRODUCT_STATUS.REJECTED,
          rejectionReason: reason || verification?.notes || 'Verification failed',
          rejectionDate: new Date(),
          physicalVerifiedAt: new Date(),
          physicalVerifiedBy: session.user.id,
          physicalNotes: verification?.notes || reason,
        };
        message = 'Physical verification failed. Product will be returned to seller.';
        
        // Notify seller of rejection
        if (product.seller) {
          await notifyProductStatusChange(
            product.id,
            product.title,
            product.seller.email,
            product.seller.name || 'Seller',
            product.seller.id,
            product.status,
            PRODUCT_STATUS.REJECTED,
            {
              rejectionReason: reason || verification?.notes || 'Verification failed',
            }
          );
        }
        // TODO: Initiate return to seller process
        // When a product is rejected after physical verification:
        // 1. Create a return shipment request
        // 2. Notify seller with return shipping instructions
        // 3. Track return process through SellerToAdminShipment with reverse flow
        // 4. Update product status to RETURNED_TO_SELLER once received
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
        
        // Send celebration notification to seller
        if (product.seller) {
          await notifyProductStatusChange(
            product.id,
            product.title,
            product.seller.email,
            product.seller.name || 'Seller',
            product.seller.id,
            product.status,
            PRODUCT_STATUS.LIVE
          );
        }
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
