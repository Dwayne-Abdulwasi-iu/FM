import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Return reasons
const VALID_RETURN_REASONS = [
  "WRONG_SIZE",
  "DEFECTIVE",
  "NOT_AS_DESCRIBED",
  "WRONG_ITEM",
  "CHANGED_MIND",
  "OTHER",
];

// GET /api/boutique/returns - Get user's return requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const isAdmin = session.user.role === "ADMIN";

    // Build where clause
    const where: Record<string, unknown> = isAdmin
      ? {} // Admin sees all
      : { userId: session.user.id }; // User sees own

    const returns = await prisma.boutiqueReturn.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.boutiqueReturn.count({ where });

    // Fetch related data for each return
    const formattedReturns = await Promise.all(
      returns.map(async (r) => {
        const order = await prisma.boutiqueOrder.findUnique({
          where: { id: r.orderId },
          select: { id: true, orderNumber: true },
        });

        const orderItem = await prisma.boutiqueOrderItem.findUnique({
          where: { id: r.orderItemId },
          include: {
            product: { select: { id: true, title: true, thumbnailUrl: true } },
            variant: { select: { id: true, size: true, color: true } },
          },
        });

        const user = isAdmin
          ? await prisma.user.findUnique({
              where: { id: r.userId },
              select: { id: true, name: true, email: true },
            })
          : null;

        return {
          id: r.id,
          status: r.status,
          reason: r.reason,
          description: r.description,
          imageUrls: r.imageUrls,
          refundAmount: r.refundAmount,
          adminNotes: isAdmin ? r.adminNotes : undefined,
          user,
          order,
          item: orderItem
            ? {
                quantity: orderItem.quantity,
                product: orderItem.product,
                variant: orderItem.variant,
              }
            : null,
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      returns: formattedReturns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

// POST /api/boutique/returns - Create return request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderItemId, reason, description, imageUrls } = body;

    if (!orderItemId || !reason || !description) {
      return NextResponse.json(
        { success: false, message: "Order item, reason, and description are required" },
        { status: 400 }
      );
    }

    if (!VALID_RETURN_REASONS.includes(reason)) {
      return NextResponse.json(
        { success: false, message: "Invalid return reason" },
        { status: 400 }
      );
    }

    // Get the order item with order
    const orderItem = await prisma.boutiqueOrderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!orderItem) {
      return NextResponse.json(
        { success: false, message: "Order item not found" },
        { status: 404 }
      );
    }

    const order = await prisma.boutiqueOrder.findUnique({
      where: { id: orderItem.orderId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Verify order belongs to user
    if (order.buyerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if order is eligible for return (delivered within 7 days)
    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        { success: false, message: "Order must be delivered before requesting return" },
        { status: 400 }
      );
    }

    const deliveredAt = order.deliveredAt;
    let daysSinceDelivery = 0;
    
    if (deliveredAt) {
      daysSinceDelivery = Math.floor(
        (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDelivery > 7) {
        return NextResponse.json(
          { success: false, message: "Return window has expired (7 days after delivery)" },
          { status: 400 }
        );
      }
    }

    // Check if return already exists for this item
    const existingReturn = await prisma.boutiqueReturn.findFirst({
      where: {
        orderItemId,
        status: { in: ["PENDING", "APPROVED", "ITEM_SHIPPED", "ITEM_RECEIVED"] },
      },
    });

    if (existingReturn) {
      return NextResponse.json(
        { success: false, message: "Return request already exists for this item" },
        { status: 400 }
      );
    }

    // Calculate refund amount (item price * quantity)
    const refundAmount = orderItem.finalPrice * orderItem.quantity;

    // Generate return number
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const returnNumber = `RET-${year}-${randomPart}`;

    // Create return request
    const returnRequest = await prisma.boutiqueReturn.create({
      data: {
        user: { connect: { id: session.user.id } },
        order: { connect: { id: orderItem.orderId } },
        orderItem: { connect: { id: orderItemId } },
        returnNumber,
        reason,
        description,
        imageUrls: imageUrls || [],
        refundAmount,
        status: "PENDING",
      },
    });

    const returnDeadline = new Date(new Date(deliveredAt!).getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return NextResponse.json({
      success: true,
      message: "Return request submitted. We will review within 1-2 business days.",
      details: {
        returnDeadline: returnDeadline.toLocaleDateString(),
        daysRemaining: 7 - daysSinceDelivery,
        note: "Seller payout is held for 2 days to allow for return processing",
      },
      returnRequest: {
        id: returnRequest.id,
        status: returnRequest.status,
        refundAmount: returnRequest.refundAmount,
      },
    });
  } catch (error) {
    console.error("Error creating return:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create return request" },
      { status: 500 }
    );
  }
}

// PATCH /api/boutique/returns - Admin: Update return status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { returnId, action, adminNotes, refundAmount } = body;

    if (!returnId || !action) {
      return NextResponse.json(
        { success: false, message: "Return ID and action are required" },
        { status: 400 }
      );
    }

    const returnRequest = await prisma.boutiqueReturn.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      return NextResponse.json(
        { success: false, message: "Return request not found" },
        { status: 404 }
      );
    }

    // Get order item for refund processing
    const orderItem = await prisma.boutiqueOrderItem.findUnique({
      where: { id: returnRequest.orderItemId },
    });

    const updateData: Record<string, unknown> = {
      adminNotes: adminNotes || returnRequest.adminNotes,
    };

    switch (action) {
      case "approve":
        if (returnRequest.status !== "PENDING") {
          return NextResponse.json(
            { success: false, message: "Return must be pending to approve" },
            { status: 400 }
          );
        }
        updateData.status = "APPROVED";
        updateData.refundAmount = refundAmount || returnRequest.refundAmount;
        break;

      case "reject":
        if (returnRequest.status !== "PENDING") {
          return NextResponse.json(
            { success: false, message: "Return must be pending to reject" },
            { status: 400 }
          );
        }
        if (!adminNotes) {
          return NextResponse.json(
            { success: false, message: "Rejection reason is required" },
            { status: 400 }
          );
        }
        updateData.status = "REJECTED";
        updateData.resolvedAt = new Date();
        break;

      case "mark_received":
        if (returnRequest.status !== "ITEM_SHIPPED") {
          return NextResponse.json(
            { success: false, message: "Item must be shipped first" },
            { status: 400 }
          );
        }
        updateData.status = "ITEM_RECEIVED";
        break;

      case "complete_refund":
        if (returnRequest.status !== "ITEM_RECEIVED") {
          return NextResponse.json(
            { success: false, message: "Item must be received first" },
            { status: 400 }
          );
        }
        updateData.status = "REFUNDED";
        updateData.resolvedAt = new Date();
        
        // Restore inventory if variant exists
        if (orderItem?.variantId) {
          await prisma.boutiqueProductVariant.update({
            where: { id: orderItem.variantId },
            data: {
              quantity: {
                increment: orderItem.quantity,
              },
            },
          });
        }
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Invalid action" },
          { status: 400 }
        );
    }

    await prisma.boutiqueReturn.update({
      where: { id: returnId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Return ${action}d successfully`,
    });
  } catch (error) {
    console.error("Error updating return:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update return" },
      { status: 500 }
    );
  }
}
