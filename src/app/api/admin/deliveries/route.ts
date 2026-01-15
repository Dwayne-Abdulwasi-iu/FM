import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPhysicalDeliveryNotification } from "@/lib/email";

/**
 * GET /api/admin/deliveries - Get physical commissions pending delivery
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deliveryStatus = searchParams.get("deliveryStatus");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Cap at 100

    // Build where clause for physical commissions
    const where: Record<string, unknown> = {
      isPhysical: true,
      isPaid: true,
    };

    if (deliveryStatus) {
      where.deliveryStatus = deliveryStatus;
    }

    const [deliveries, total] = await Promise.all([
      prisma.commissionRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              displayName: true,
              email: true,
              image: true,
            },
          },
          designer: {
            select: {
              id: true,
              name: true,
              displayName: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.commissionRequest.count({ where }),
    ]);

    // Count by status
    const statusCounts = await prisma.commissionRequest.groupBy({
      by: ["deliveryStatus"],
      where: { isPhysical: true, isPaid: true },
      _count: { id: true },
    });

    return NextResponse.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      statusCounts: statusCounts.reduce((acc: Record<string, number>, curr: { deliveryStatus: string | null; _count: { id: number } }) => {
        if (curr.deliveryStatus) {
          acc[curr.deliveryStatus] = curr._count.id;
        }
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error("Get deliveries error:", error);
    return NextResponse.json(
      { error: "Failed to get deliveries" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/deliveries - Update delivery status
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      commissionId, 
      action, 
      trackingNumber, 
      courierName, 
      estimatedDeliveryDate,
      collectionNotes,
      collectionPhotos,
      deliveryPhotos,
    } = body;

    if (!commissionId || !action) {
      return NextResponse.json(
        { error: "Commission ID and action are required" },
        { status: 400 }
      );
    }

    // Get the commission request
    const commission = await prisma.commissionRequest.findUnique({
      where: { id: commissionId },
      include: {
        requester: { select: { email: true, name: true, displayName: true } },
        designer: { select: { email: true, name: true, displayName: true } },
      },
    });

    if (!commission) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    if (!commission.isPhysical) {
      return NextResponse.json(
        { error: "This is not a physical commission" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    switch (action) {
      case "collect":
        // Admin collected item from designer
        if (commission.deliveryStatus !== "READY_FOR_COLLECTION") {
          return NextResponse.json(
            { error: "Item is not ready for collection" },
            { status: 400 }
          );
        }
        updateData.deliveryStatus = "COLLECTED_BY_ADMIN";
        updateData.collectedAt = new Date();
        updateData.collectedBy = session.user.id;
        if (collectionNotes) updateData.collectionNotes = collectionNotes;
        if (collectionPhotos) updateData.collectionPhotos = collectionPhotos;
        break;

      case "ship":
        // Admin shipped/dispatched the item
        if (commission.deliveryStatus !== "COLLECTED_BY_ADMIN") {
          return NextResponse.json(
            { error: "Item must be collected before shipping" },
            { status: 400 }
          );
        }
        updateData.deliveryStatus = "IN_TRANSIT";
        updateData.shippedAt = new Date();
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (courierName) updateData.courierName = courierName;
        if (estimatedDeliveryDate) updateData.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
        break;

      case "mark_delivered":
        // Admin marks as delivered (before client confirms)
        if (commission.deliveryStatus !== "IN_TRANSIT") {
          return NextResponse.json(
            { error: "Item must be in transit to mark as delivered" },
            { status: 400 }
          );
        }
        updateData.deliveryStatus = "DELIVERED";
        updateData.actualDeliveredAt = new Date();
        if (deliveryPhotos) updateData.deliveryPhotos = deliveryPhotos;
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updatedCommission = await prisma.commissionRequest.update({
      where: { id: commissionId },
      data: updateData,
    });

    // Send email notification when marking as delivered
    if (action === "mark_delivered") {
      // Notify client about the delivery
      await sendPhysicalDeliveryNotification({
        email: commission.requester.email,
        clientName: commission.requester.displayName || commission.requester.name || "Customer",
        commissionTitle: commission.title,
        commissionId: commission.id,
        trackingNumber: commission.trackingNumber || undefined,
        courierName: commission.courierName || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      commission: updatedCommission,
    });
  } catch (error) {
    console.error("Update delivery error:", error);
    return NextResponse.json(
      { error: "Failed to update delivery" },
      { status: 500 }
    );
  }
}
