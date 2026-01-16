import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Define the product type with includes
type ProductWithRelations = Prisma.BoutiqueProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } };
    media: true;
    variants: true;
    seller: { select: { id: true; name: true; image: true } };
    reviews: {
      include: { user: { select: { id: true; name: true; image: true } } };
    };
    _count: { select: { reviews: true; favorites: true } };
  };
}>;

// GET /api/boutique/shop/[slug] - Get single product details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await prisma.boutiqueProduct.findFirst({
      where: {
        slug,
        status: "LIVE",
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        media: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        variants: {
          where: { quantity: { gt: 0 } },
          orderBy: [{ size: "asc" }, { color: "asc" }],
        },
        seller: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { reviews: true, favorites: true },
        },
      },
    }) as ProductWithRelations | null;

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    // Increment view count
    await prisma.boutiqueProduct.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    });

    // Get related products
    const relatedProducts = await prisma.boutiqueProduct.findMany({
      where: {
        status: "LIVE",
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      take: 4,
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        description: product.description,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        brand: product.brand,
        material: product.material,
        careInstructions: product.careInstructions,
        condition: product.condition,
        gender: product.gender,
        style: product.style,
        occasion: product.occasion,
        tags: product.tags,
        category: product.category,
        thumbnailUrl: product.thumbnailUrl,
        media: product.media,
        variants: product.variants.map((v: { id: string; size: string | null; color: string | null; colorHex: string | null; quantity: number; priceAdjustment: number }) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          quantity: v.quantity,
          priceAdjustment: v.priceAdjustment,
        })),
        seller: product.seller,
        avgRating: product.avgRating,
        reviewCount: product._count.reviews,
        favoriteCount: product._count.favorites,
        reviews: product.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          fitRating: r.fitRating,
          user: r.user,
          createdAt: r.createdAt,
        })),
      },
      relatedProducts: relatedProducts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        thumbnailUrl: p.thumbnailUrl || p.media[0]?.url,
      })),
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
