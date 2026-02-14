import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/seller/promotions/active-designs - Get designs with active promotions for seller
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all active promotions for this seller that haven't expired
    const activePromotions = await prisma.promotion.findMany({
      where: {
        sellerId: session.user.id,
        isActive: true,
        endDate: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        name: true,
        type: true,
        designIds: true
      }
    });

    // Create a map of design ID to promotion info
    const designPromotionMap = new Map<string, {
      promotionId: string;
      promotionName: string;
      promotionType: string;
    }>();

    for (const promo of activePromotions) {
      for (const designId of promo.designIds) {
        if (designId) {
          designPromotionMap.set(designId, {
            promotionId: promo.id,
            promotionName: promo.name,
            promotionType: promo.type
          });
        }
      }
    }

    // Convert to object for JSON response
    const designPromos: Record<string, {
      promotionId: string;
      promotionName: string;
      promotionType: string;
    }> = {};

    designPromotionMap.forEach((value, key) => {
      designPromos[key] = value;
    });

    return NextResponse.json({ designPromos });
  } catch (error) {
    console.error("Get active promoted designs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active promoted designs" },
      { status: 500 }
    );
  }
}
