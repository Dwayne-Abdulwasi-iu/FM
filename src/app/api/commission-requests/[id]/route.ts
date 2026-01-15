import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/commission-requests/[id] - Get a single commission request
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = session.user.role === "ADMIN";

    const commissionRequest = await prisma.commissionRequest.findUnique({
      where: { id },
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
    });

    if (!commissionRequest) {
      return NextResponse.json(
        { error: "Commission request not found" },
        { status: 404 }
      );
    }

    // Check access - admin, requester, or designer can view
    const isDesigner = commissionRequest.designerId === session.user.id;
    const isRequester = commissionRequest.requesterId === session.user.id;
    
    if (!isAdmin && !isRequester && !isDesigner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Sanitize delivery address for designer - remove phone number
    // Phone should only be visible to admin (for shipping coordination)
    let responseData = commissionRequest;
    if (isDesigner && !isAdmin && commissionRequest.deliveryAddress) {
      const addr = commissionRequest.deliveryAddress as Record<string, unknown>;
      const { phone: _phone, ...sanitizedAddress } = addr;
      responseData = {
        ...commissionRequest,
        deliveryAddress: sanitizedAddress,
      };
    }

    return NextResponse.json({ request: responseData });
  } catch (error) {
    console.error("Get commission request error:", error);
    return NextResponse.json(
      { error: "Failed to get commission request" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/commission-requests/[id] - Update a commission request (Admin only for most fields)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = session.user.role === "ADMIN";
    const body = await request.json();

    const existingRequest = await prisma.commissionRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Commission request not found" },
        { status: 404 }
      );
    }

    // Only admin can update status and forward
    if (!isAdmin) {
      // Users can only cancel their own pending requests
      if (
        existingRequest.requesterId !== session.user.id ||
        body.status !== "CANCELLED" ||
        existingRequest.status !== "PENDING"
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};

    // Admin-only fields
    if (isAdmin) {
      if (body.status) updateData.status = body.status;
      if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;
      if (body.status === "FORWARDED") {
        updateData.forwardedAt = new Date();
        updateData.forwardedBy = session.user.id;
      }
      if (body.designerResponse !== undefined) {
        updateData.designerResponse = body.designerResponse;
        updateData.responseAt = new Date();
      }
    } else {
      // User can only cancel
      if (body.status === "CANCELLED") {
        updateData.status = "CANCELLED";
      }
    }

    const updatedRequest = await prisma.commissionRequest.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Update commission request error:", error);
    return NextResponse.json(
      { error: "Failed to update commission request" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/commission-requests/[id] - Delete a commission request (Admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check commission status before deleting - prevent deleting paid/active commissions
    const commission = await prisma.commissionRequest.findUnique({
      where: { id },
      select: { status: true, isPaid: true, payoutStatus: true },
    });

    if (!commission) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    // Prevent deletion of paid or in-progress commissions
    const protectedStatuses = ["PAID", "IN_PROGRESS", "DELIVERED", "COMPLETED", "DISPUTED"];
    if (commission.isPaid || protectedStatuses.includes(commission.status)) {
      return NextResponse.json(
        { error: "Cannot delete paid or active commissions. Cancel or archive instead." },
        { status: 400 }
      );
    }

    await prisma.commissionRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete commission request error:", error);
    return NextResponse.json(
      { error: "Failed to delete commission request" },
      { status: 500 }
    );
  }
}
