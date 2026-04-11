import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from '@prisma/client';

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
      designIds: rawDesignIds,
      productIds: rawProductIds,
      bundlePrice,
      startDate,
      endDate,
      maxUsage,
    } = body;

    // Sanitize designIds and productIds - filter out empty or null values
    const designIds = (rawDesignIds || [])
      .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id: string) => id.trim());
    
    const productIds = (rawProductIds || [])
      .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id: string) => id.trim());

    // Check what type of items this promotion applies to
    const hasDesigns = designIds && designIds.length > 0;
    const hasProducts = productIds && productIds.length > 0;

    // Validate that promotion applies to EITHER designs OR products, but not both
    if (hasDesigns && hasProducts) {
      return NextResponse.json(
        { error: "A promotion must apply to either Designs or Boutique Products, not both. Please choose one type." },
        { status: 400 }
      );
    }

    if (!hasDesigns && !hasProducts) {
      return NextResponse.json(
        { error: "A promotion must include at least one Design or Boutique Product" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Promotion name is required" },
        { status: 400 }
      );
    }

    if (!type || !['DISCOUNT', 'BUNDLE', 'FLASH_SALE'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid promotion type" },
        { status: 400 }
      );
    }

    // For DISCOUNT and FLASH_SALE, discount type and value are required
    if (type === 'DISCOUNT' || type === 'FLASH_SALE') {
      if (!discountType || !['PERCENTAGE', 'FIXED'].includes(discountType)) {
        return NextResponse.json(
          { error: "Invalid discount type" },
          { status: 400 }
        );
      }

      if (typeof discountValue !== 'number' || discountValue <= 0) {
        return NextResponse.json(
          { error: "Discount value must be greater than 0" },
          { status: 400 }
        );
      }

      // Validate percentage not over 100%
      if (discountType === 'PERCENTAGE' && discountValue > 100) {
        return NextResponse.json(
          { error: "Percentage discount cannot exceed 100%" },
          { status: 400 }
        );
      }
    } else if (type === 'BUNDLE') {
      // For BUNDLE, discountType and discountValue should not be provided
      if (discountType || discountValue) {
        return NextResponse.json(
          { error: "BUNDLE promotions use bundlePrice, not discountType/discountValue" },
          { status: 400 }
        );
      }
    }

    // Validate bundle-specific requirements
    if (type === 'BUNDLE') {
      if (typeof bundlePrice !== 'number' || bundlePrice <= 0) {
        return NextResponse.json(
          { error: "Bundle price must be greater than 0" },
          { status: 400 }
        );
      }

      // Validate bundle price is less than sum of individual prices
      let totalPrice = 0;

      if (hasDesigns) {
        const bundleDesigns = await prisma.design.findMany({
          where: { id: { in: designIds } },
          select: { price: true }
        });
        totalPrice = bundleDesigns.reduce((sum, design) => sum + design.price, 0);
      }

      if (hasProducts) {
        const bundleProducts = await prisma.boutiqueProduct.findMany({
          where: { id: { in: productIds } },
          select: { basePrice: true }
        });
        totalPrice = bundleProducts.reduce((sum, product) => sum + product.basePrice, 0);
      }

      if (bundlePrice >= totalPrice) {
        return NextResponse.json(
          { error: `Bundle price must be less than the combined price of items ($${totalPrice.toFixed(2)})` },
          { status: 400 }
        );
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Validate maxUsage if provided
    if (maxUsage !== null && maxUsage !== undefined) {
      if (typeof maxUsage !== 'number' || maxUsage < 1) {
        return NextResponse.json(
          { error: "Maximum usage must be at least 1" },
          { status: 400 }
        );
      }
    }

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

      // Check for overlapping active promotions on designs
      const overlappingDesignPromotions = await prisma.promotion.findMany({
        where: {
          designIds: {
            hasSome: designIds
          },
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

      if (overlappingDesignPromotions.length > 0) {
        const conflictingDesigns = new Map<string, string>();
        for (const promo of overlappingDesignPromotions) {
          for (const designId of designIds) {
            if ((promo.designIds as string[]).includes(designId)) {
              conflictingDesigns.set(designId, `${promo.name} (${promo.type})`);
            }
          }
        }

        return NextResponse.json(
          {
            error: `These designs already have active promotions and cannot be added to another promotion`,
            conflictingDesigns: Object.fromEntries(conflictingDesigns),
            existingPromotions: overlappingDesignPromotions.map(p => ({
              id: p.id,
              name: p.name,
              type: p.type,
              conflictingCount: (p.designIds as string[]).filter(id => designIds.includes(id)).length
            }))
          },
          { status: 409 }
        );
      }
    }

    // Validate products belong to seller
    if (productIds && productIds.length > 0) {
      const products = await prisma.boutiqueProduct.findMany({
        where: {
          id: { in: productIds },
          sellerId: session.user.id,
        },
      });

      if (products.length !== productIds.length) {
        return NextResponse.json(
          { error: "Some products do not belong to you" },
          { status: 400 }
        );
      }

      // Check for overlapping active promotions on products
      const overlappingProductPromotions = await prisma.promotion.findMany({
        where: {
          productIds: {
            hasSome: productIds
          },
          isActive: true,
          endDate: {
            gt: new Date()
          }
        },
        select: {
          id: true,
          name: true,
          type: true,
          productIds: true
        }
      });

      if (overlappingProductPromotions.length > 0) {
        const conflictingProducts = new Map<string, string>();
        for (const promo of overlappingProductPromotions) {
          for (const productId of productIds) {
            if ((promo.productIds as string[]).includes(productId)) {
              conflictingProducts.set(productId, `${promo.name} (${promo.type})`);
            }
          }
        }

        return NextResponse.json(
          {
            error: `These products already have active promotions and cannot be added to another promotion`,
            conflictingProducts: Object.fromEntries(conflictingProducts),
            existingPromotions: overlappingProductPromotions.map(p => ({
              id: p.id,
              name: p.name,
              type: p.type,
              conflictingCount: (p.productIds as string[]).filter(id => productIds.includes(id)).length
            }))
          },
          { status: 409 }
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
        productIds: productIds || [],
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

    const where: Prisma.PromotionWhereInput = {
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
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with design and product info
    const enrichedPromotions = await Promise.all(
      promotions.map(async (promo) => {
        try {
          const designIds = Array.isArray(promo.designIds) ? (promo.designIds as string[]) : [];
          const productIds = Array.isArray(promo.productIds) ? (promo.productIds as string[]) : [];

          const designs = designIds.length > 0 
            ? await prisma.design.findMany({
                where: { id: { in: designIds } },
                select: {
                  id: true,
                  title: true,
                  thumbnailUrl: true,
                  price: true,
                },
              })
            : [];
          
          const products = productIds.length > 0
            ? await prisma.boutiqueProduct.findMany({
                where: { id: { in: productIds } },
                select: {
                  id: true,
                  title: true,
                  thumbnailUrl: true,
                  basePrice: true,
                },
              })
            : [];

          return { ...promo, designs, products };
        } catch (err) {
          console.error(`Error enriching promotion ${promo.id}:`, err);
          return { ...promo, designs: [], products: [] };
        }
      })
    );

    return NextResponse.json({ promotions: enrichedPromotions });
  } catch (error) {
    console.error("Get promotions error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to get promotions" },
      { status: 500 }
    );
  }
}


