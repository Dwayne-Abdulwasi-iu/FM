import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/commissions/[id] - Get commission details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const commission = await prisma.commission.findUnique({
      where: { id },
      include: {
        client: {
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
            isVerified: true,
            verificationBadge: true,
            bio: true,
          },
        },
      },
    });

    if (!commission) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    // Only client, designer, or admin can view
    const isClient = commission.clientId === session.user.id;
    const isDesigner = commission.designerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isClient && !isDesigner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ commission });
  } catch (error) {
    console.error("Get commission error:", error);
    return NextResponse.json(
      { error: "Failed to get commission" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/commissions/[id] - Update commission status/details
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const commission = await prisma.commission.findUnique({
      where: { id },
      select: {
        clientId: true,
        designerId: true,
        status: true,
      },
    });

    if (!commission) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    const isClient = commission.clientId === session.user.id;
    const isDesigner = commission.designerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isClient && !isDesigner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};

    // Status transitions
    if (body.status) {
      const currentStatus = commission.status;
      const newStatus = body.status;

      // Validate status transitions
      const validTransitions: Record<string, { statuses: string[]; roles: string[] }> = {
        'PENDING': { statuses: ['ACCEPTED', 'REJECTED', 'CANCELLED'], roles: ['designer', 'client', 'admin'] },
        'ACCEPTED': { statuses: ['IN_PROGRESS', 'CANCELLED'], roles: ['designer', 'client', 'admin'] },
        'IN_PROGRESS': { statuses: ['REVISION', 'COMPLETED', 'CANCELLED'], roles: ['designer', 'client', 'admin'] },
        'REVISION': { statuses: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'], roles: ['designer', 'client', 'admin'] },
      };

      const allowed = validTransitions[currentStatus];
      if (!allowed || !allowed.statuses.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        );
      }

      // Designer-only actions
      if (['ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED'].includes(newStatus) && !isDesigner && !isAdmin) {
        return NextResponse.json(
          { error: "Only the designer can perform this action" },
          { status: 403 }
        );
      }

      // Client can only cancel or request revision
      if (isClient && !['CANCELLED', 'REVISION'].includes(newStatus) && !isAdmin) {
        return NextResponse.json(
          { error: "Clients can only cancel or request revision" },
          { status: 403 }
        );
      }

      updateData.status = newStatus;

      // Set timestamps based on status
      if (newStatus === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    // Designer can update price quote
    if (isDesigner && body.agreedPrice !== undefined) {
      updateData.agreedPrice = parseFloat(body.agreedPrice);
    }

    // Designer can add progress notes
    if (isDesigner && body.progressNotes) {
      updateData.progressNotes = body.progressNotes;
    }

    // Designer can add final delivery
    if (isDesigner && body.finalDelivery) {
      updateData.finalDelivery = body.finalDelivery;
    }

    // Client can add revision notes
    if (isClient && body.revisionNotes) {
      updateData.revisionNotes = body.revisionNotes;
    }

    // Client can add review after completion
    if (isClient && commission.status === 'COMPLETED') {
      if (body.clientReview) {
        updateData.clientReview = body.clientReview;
      }
      if (body.clientRating !== undefined) {
        updateData.clientRating = parseInt(body.clientRating);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    const updatedCommission = await prisma.commission.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
          },
        },
        designer: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
            isVerified: true,
          },
        },
      },
    });

    return NextResponse.json({ commission: updatedCommission });
  } catch (error) {
    console.error("Update commission error:", error);
    return NextResponse.json(
      { error: "Failed to update commission" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/commissions/[id] - Cancel/delete a commission
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const commission = await prisma.commission.findUnique({
      where: { id },
      select: {
        clientId: true,
        designerId: true,
        status: true,
      },
    });

    if (!commission) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    const isClient = commission.clientId === session.user.id;
    const isDesigner = commission.designerId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isClient && !isDesigner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow deletion of pending commissions, otherwise mark as cancelled
    if (commission.status === 'PENDING') {
      await prisma.commission.delete({ where: { id } });
    } else {
      await prisma.commission.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete commission error:", error);
    return NextResponse.json(
      { error: "Failed to delete commission" },
      { status: 500 }
    );
  }
}
