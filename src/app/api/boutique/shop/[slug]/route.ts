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

// GET /api/boutique/shop/[slug] - Get single product details by slug or ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const identifier = slug?.trim();

    const product = await prisma.boutiqueProduct.findFirst({
      where: {
        status: "LIVE",
        OR: [
          { slug: identifier },
          { id: identifier },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        basePrice: true,
        salePrice: true,
        brand: true,
        material: true,
        careInstructions: true,
        condition: true,
        gender: true,
        style: true,
        occasion: true,
        tags: true,
        thumbnailUrl: true,
        avgRating: true,
        categoryId: true,
        fulfillmentMethod: true,
        currentStock: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        media: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        variants: {
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

    // Check if product has any stock available
    const variantStock = product.variants.reduce((sum, v) => sum + v.quantity, 0);
    const totalStock = product.fulfillmentMethod === 'ADMIN_STOCK' 
      ? (product.currentStock || 0) 
      : variantStock;
    if (totalStock <= 0) {
      return NextResponse.json(
        { success: false, message: "Product out of stock" },
        { status: 404 }
      );
    }

    // Filter variants to only show those with quantity > 0 (for non-ADMIN_STOCK products)
    const productWithStock = {
      ...product,
      variants: product.fulfillmentMethod === 'ADMIN_STOCK' 
        ? product.variants 
        : product.variants.filter(v => v.quantity > 0),
    };

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
      select: {
        id: true,
        title: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        thumbnailUrl: true,
        fulfillmentMethod: true,
        currentStock: true,
        media: {
          where: { isPrimary: true },
          take: 1,
        },
        variants: true,
      },
      take: 4,
    });

    // Filter related products to only include those with stock
    const relatedProductsWithStock = relatedProducts.filter(p => {
      const variantStock = p.variants.reduce((sum, v) => sum + v.quantity, 0);
      const totalStock = p.fulfillmentMethod === 'ADMIN_STOCK' 
        ? (p.currentStock || 0) 
        : variantStock;
      return totalStock > 0;
    });

    return NextResponse.json({
      success: true,
      product: {
        id: productWithStock.id,
        title: productWithStock.title,
        slug: productWithStock.slug,
        description: productWithStock.description,
        basePrice: productWithStock.basePrice,
        salePrice: productWithStock.salePrice,
        brand: productWithStock.brand,
        material: productWithStock.material,
        careInstructions: productWithStock.careInstructions,
        condition: productWithStock.condition,
        gender: productWithStock.gender,
        style: productWithStock.style,
        occasion: productWithStock.occasion,
        tags: productWithStock.tags,
        category: productWithStock.category,
        thumbnailUrl: productWithStock.thumbnailUrl,
        media: productWithStock.media,
        variants: productWithStock.variants.map((v: { id: string; size: string | null; color: string | null; colorHex: string | null; quantity: number; priceAdjustment: number }) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          quantity: v.quantity,
          priceAdjustment: v.priceAdjustment,
        })),
        seller: productWithStock.seller,
        avgRating: productWithStock.avgRating,
        reviewCount: productWithStock._count.reviews,
        favoriteCount: productWithStock._count.favorites,
        reviews: productWithStock.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          fitRating: r.fitRating,
          user: r.user,
          createdAt: r.createdAt,
        })),
      },
      relatedProducts: relatedProductsWithStock.map((p) => ({
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
