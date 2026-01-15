import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/seller/promotions - Create a promotion
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      name,
      description,
      discountType,
      discountValue,
      designIds,
      bundlePrice,
      startDate,
      endDate,
      maxUsage,
    } = body;

    // Validate designs belong to seller
    if (designIds && designIds.length > 0) {
      const designs = await prisma.design.findMany({
        where: {
          id: { in: designIds },
          designerId: session.user.id,
        },
      });

      if (designs.length !== designIds.length) {
        return NextResponse.json(
          { error: "Some designs do not belong to you" },
          { status: 400 }
        );
      }
    }

    const promotion = await prisma.promotion.create({
      data: {
        sellerId: session.user.id,
        type,
        name,
        description,
        discountType,
        discountValue,
        designIds: designIds || [],
        bundlePrice,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxUsage,
        isActive: true,
      },
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error("Create promotion error:", error);
    return NextResponse.json(
      { error: "Failed to create promotion" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/seller/promotions - Get seller's promotions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // active, expired, all

    const where: Record<string, unknown> = {
      sellerId: session.user.id,
    };

    if (status === "active") {
      where.isActive = true;
      where.endDate = { gte: new Date() };
    } else if (status === "expired") {
      where.OR = [
        { isActive: false },
        { endDate: { lt: new Date() } },
      ];
    }

    const promotions = await prisma.promotion.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with design info
    const enrichedPromotions = await Promise.all(
      promotions.map(async (promo) => {
        if (promo.designIds.length > 0) {
          const designs = await prisma.design.findMany({
            where: { id: { in: promo.designIds } },
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              price: true,
            },
          });
          return { ...promo, designs };
        }
        return { ...promo, designs: [] };
      })
    );

    return NextResponse.json({ promotions: enrichedPromotions });
  } catch (error) {
    console.error("Get promotions error:", error);
    return NextResponse.json(
      { error: "Failed to get promotions" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/seller/promotions - Update a promotion
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, isActive, ...updates } = body;

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
        isActive,
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
 * DELETE /api/seller/promotions - Delete a promotion
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

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
