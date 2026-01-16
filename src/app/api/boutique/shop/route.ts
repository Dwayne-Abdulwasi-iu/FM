import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/boutique/shop - Browse live products for buyers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const gender = searchParams.get("gender");
    const style = searchParams.get("style");
    const condition = searchParams.get("condition");
    const sort = searchParams.get("sort") || "newest";
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build filter
    const where: Record<string, unknown> = {
      status: "LIVE",
    };

    if (category) {
      // Find the category by slug
      const categoryDoc = await prisma.boutiqueCategory.findFirst({
        where: { slug: category },
      });
      if (categoryDoc) {
        where.categoryId = categoryDoc.id;
      }
    }

    if (subcategory) {
      where.subcategory = subcategory;
    }

    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) (where.basePrice as Record<string, number>).gte = parseFloat(minPrice);
      if (maxPrice) (where.basePrice as Record<string, number>).lte = parseFloat(maxPrice);
    }

    if (gender) {
      where.gender = gender;
    }

    if (style) {
      where.style = style;
    }

    if (condition) {
      where.condition = condition;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    // Determine sort order
    let orderBy: Record<string, string> = { createdAt: "desc" };
    switch (sort) {
      case "price_low":
        orderBy = { basePrice: "asc" };
        break;
      case "price_high":
        orderBy = { basePrice: "desc" };
        break;
      case "popular":
        orderBy = { viewCount: "desc" };
        break;
      case "newest":
      default:
        orderBy = { goLiveAt: "desc" };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.boutiqueProduct.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          media: {
            where: { isPrimary: true },
            take: 1,
          },
          variants: {
            where: { quantity: { gt: 0 } },
            select: { id: true, size: true, color: true, colorHex: true },
          },
          seller: {
            select: { id: true, name: true },
          },
          _count: {
            select: { reviews: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.boutiqueProduct.count({ where }),
    ]);

    // Transform products
    const formattedProducts = products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      basePrice: p.basePrice,
      salePrice: p.salePrice,
      thumbnailUrl: p.thumbnailUrl || p.media[0]?.url,
      category: p.category,
      brand: p.brand,
      condition: p.condition,
      seller: p.seller,
      reviewCount: p._count.reviews,
      avgRating: p.avgRating,
      availableSizes: [...new Set(p.variants.map((v) => v.size).filter(Boolean))],
      availableColors: [...new Set(p.variants.map((v) => ({ color: v.color, hex: v.colorHex })).filter((c) => c.color))],
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching shop products:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
