import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/seller/promotions/[id] - Update a promotion
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive, ...updates } = body;

    // Verify ownership
    const existing = await prisma.promotion.findFirst({
      where: {
        id,
        sellerId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...updates,
      },
    });

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("Update promotion error:", error);
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/seller/promotions/[id] - Delete a promotion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Promotion ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.promotion.findFirst({
      where: {
        id,
        sellerId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    await prisma.promotion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete promotion error:", error);
    return NextResponse.json(
      { error: "Failed to delete promotion" },
      { status: 500 }
    );
  }
}
