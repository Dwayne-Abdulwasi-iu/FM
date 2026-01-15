import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/search/advanced - Advanced search with filters
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const {
      query,
      category,
      style,
      colorPalette,
      garmentType,
      season,
      occasion,
      targetAudience,
      priceMin,
      priceMax,
      sortBy = 'relevance',
      page = 1,
      limit = 12,
    } = body;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
      approvalStatus: 'APPROVED',
    };

    // Text search
    if (query && query.trim().length >= 2) {
      const searchTerm = query.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
        { designer: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      where.category = category;
    }

    // Style filter
    if (style && style.length > 0) {
      where.style = { in: style };
    }

    // Color palette filter (array contains)
    if (colorPalette && colorPalette.length > 0) {
      where.colorPalette = { hasSome: colorPalette };
    }

    // Garment type filter
    if (garmentType && garmentType !== 'all') {
      where.garmentType = garmentType;
    }

    // Season filter
    if (season && season !== 'all') {
      where.season = season;
    }

    // Occasion filter
    if (occasion && occasion !== 'all') {
      where.occasion = occasion;
    }

    // Target audience filter
    if (targetAudience && targetAudience !== 'all') {
      where.targetAudience = targetAudience;
    }

    // Price range filter
    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {};
      if (priceMin !== undefined) {
        (where.price as Record<string, number>).gte = priceMin;
      }
      if (priceMax !== undefined) {
        (where.price as Record<string, number>).lte = priceMax;
      }
    }

    // Sort order
    let orderBy: Record<string, string>[] = [];
    switch (sortBy) {
      case 'price_low':
        orderBy = [{ price: 'asc' }];
        break;
      case 'price_high':
        orderBy = [{ price: 'desc' }];
        break;
      case 'newest':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'popular':
        orderBy = [{ totalSales: 'desc' }];
        break;
      case 'trending':
        orderBy = [{ trendingScore: 'desc' }, { weeklyViews: 'desc' }];
        break;
      default: // relevance
        orderBy = [{ totalSales: 'desc' }, { viewCount: 'desc' }];
    }

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: orderBy as any,
        include: {
          designer: {
            select: {
              id: true,
              name: true,
              displayName: true,
              image: true,
              isVerified: true,
              verificationBadge: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              favorites: true,
            },
          },
        },
      }),
      prisma.design.count({ where: where as any }),
    ]);

    // Record search history if user is logged in
    if (session?.user?.id && query) {
      await prisma.searchHistory.create({
        data: {
          query,
          filters: {
            category,
            style,
            colorPalette,
            garmentType,
            season,
            occasion,
            targetAudience,
            priceMin,
            priceMax,
          },
          results: total,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json({
      designs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        query,
        category,
        style,
        colorPalette,
        garmentType,
        season,
        occasion,
        targetAudience,
        priceMin,
        priceMax,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Advanced search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search/advanced - Get filter options
 */
export async function GET() {
  try {
    // Get unique values for filter dropdowns
    const [categories, styles, garmentTypes, seasons, occasions, audiences] = await Promise.all([
      prisma.design.findMany({
        where: { isActive: true, approvalStatus: 'APPROVED' },
        select: { category: true },
        distinct: ['category'],
      }),
      prisma.design.findMany({
        where: { isActive: true, approvalStatus: 'APPROVED', style: { not: null } },
        select: { style: true },
        distinct: ['style'],
      }),
      prisma.design.findMany({
        where: { isActive: true, approvalStatus: 'APPROVED', garmentType: { not: null } },
        select: { garmentType: true },
        distinct: ['garmentType'],
      }),
      prisma.design.findMany({
        where: { isActive: true, approvalStatus: 'APPROVED', season: { not: null } },
        select: { season: true },
        distinct: ['season'],
      }),
      prisma.design.findMany({
        where: { isActive: true, approvalStatus: 'APPROVED', occasion: { not: null } },
        select: { occasion: true },
        distinct: ['occasion'],
      }),
      prisma.design.findMany({
        where: { isActive: true, approvalStatus: 'APPROVED', targetAudience: { not: null } },
        select: { targetAudience: true },
        distinct: ['targetAudience'],
      }),
    ]);

    const colorOptions = [
      'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink',
      'Black', 'White', 'Gray', 'Brown', 'Beige', 'Navy', 'Teal',
      'Gold', 'Silver', 'Coral', 'Mint', 'Lavender', 'Burgundy'
    ];

    return NextResponse.json({
      filterOptions: {
        categories: categories.map(c => c.category),
        styles: styles.map(s => s.style).filter(Boolean),
        garmentTypes: garmentTypes.map(g => g.garmentType).filter(Boolean),
        seasons: seasons.map(s => s.season).filter(Boolean),
        occasions: occasions.map(o => o.occasion).filter(Boolean),
        targetAudiences: audiences.map(a => a.targetAudience).filter(Boolean),
        colors: colorOptions,
        sortOptions: [
          { value: 'relevance', label: 'Relevance' },
          { value: 'trending', label: 'Trending' },
          { value: 'newest', label: 'Newest First' },
          { value: 'popular', label: 'Most Popular' },
          { value: 'price_low', label: 'Price: Low to High' },
          { value: 'price_high', label: 'Price: High to Low' },
        ],
      },
    });
  } catch (error) {
    console.error("Get filter options error:", error);
    return NextResponse.json(
      { error: "Failed to get filter options" },
      { status: 500 }
    );
  }
}
