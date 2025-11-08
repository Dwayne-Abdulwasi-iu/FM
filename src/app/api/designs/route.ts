import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary, generateThumbnailUrl } from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { prismaErrorResponse } from '@/lib/prismaError'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database is not configured. Set DATABASE_URL in .env.local." },
        { status: 503 }
      );
    }
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const category = formData.get("category") as string;
  const tagsRaw = formData.get("tags") as string;

    if (!file || !title || !price || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: "fashion-marketplace/designs",
    });

    // Generate thumbnail URL
    const thumbnailUrl = generateThumbnailUrl(uploadResult.public_id);

    // Normalize tags: comma-separated → string[] (lowercased, deduped)
    const tags: string[] = (tagsRaw || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .filter((t, i, arr) => arr.indexOf(t) === i)

    // Save to database
    const design = await prisma.design.create({
      data: {
        title,
        description,
        price,
        imageUrl: uploadResult.secure_url,
        thumbnailUrl,
        category,
        tags,
        designerId: session.user.id,
      },
    });

    // Revalidate listings/home after a new design is created
    try {
      revalidatePath("/")
      revalidatePath("/designs")
    } catch {}
    return NextResponse.json({ design }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Short-circuit if DB is not configured to avoid Prisma initialization errors
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          designs: [],
          pagination: { page: 1, limit: 0, total: 0, pages: 0 },
          warning: "Database is not configured. Set DATABASE_URL in .env.local.",
        },
        { status: 503 }
      );
    }
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const userId = searchParams.get("userId");
    const featured = searchParams.get("featured") === "true";
    const timeframe = (searchParams.get("timeframe") || "all").toLowerCase(); // all | month | week
  const userOnly = searchParams.get("userOnly") === "true";
  const tagsParam = searchParams.get("tags") || ""; // comma-separated
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = (searchParams.get("sort") || "newest").toLowerCase(); // newest | sales | price_asc | price_desc

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      // Hide inactive and exclusively owned designs from public listings
      isActive: true,
      isOwned: false,
    };

    // Only show designs by regular users (not admins)
    if (userOnly) {
      where.designer = {
        role: "USER"
      };
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }
    // Tags filter (comma-separated). Use hasSome to match any; switch to hasEvery if you want all.
    const tagList = tagsParam
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .filter((t, i, arr) => arr.indexOf(t) === i)
    if (tagList.length) {
      ;(where as Record<string, unknown>).tags = { hasSome: tagList }
    }

    if (userId) {
      where.designerId = userId;
    }

    // Optional timeframe filtering for trending/featured views
    if (timeframe === "week" || timeframe === "month") {
      const now = new Date();
      const days = timeframe === "week" ? 7 : 30;
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      (where as Record<string, unknown>).createdAt = { gte: from };
    }

    // Price range filters
    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {}
      if (minPrice && !Number.isNaN(parseFloat(minPrice))) priceFilter.gte = parseFloat(minPrice)
      if (maxPrice && !Number.isNaN(parseFloat(maxPrice))) priceFilter.lte = parseFloat(maxPrice)
      ;(where as Record<string, unknown>).price = priceFilter
    }

    // Sorting
    let orderBy:
      | { createdAt?: 'asc' | 'desc'; price?: 'asc' | 'desc' }
      | Array<{ totalSales?: 'asc' | 'desc'; totalRevenue?: 'asc' | 'desc'; createdAt?: 'asc' | 'desc' }>
    if (featured) {
      // Featured prioritizes best sellers by default
      orderBy = [
        { totalSales: "desc" as const },
        { totalRevenue: "desc" as const },
        { createdAt: "desc" as const }
      ]
    } else {
      switch (sort) {
        case 'sales':
          orderBy = [ { totalSales: 'desc' as const }, { createdAt: 'desc' as const } ]
          break
        case 'price_asc':
          orderBy = { price: 'asc' as const }
          break
        case 'price_desc':
          orderBy = { price: 'desc' as const }
          break
        case 'newest':
        default:
          orderBy = { createdAt: 'desc' as const }
      }
    }

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          designer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
          mediaFiles: {
            select: {
              accessType: true,
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
      prisma.design.count({ where }),
    ]);

    return NextResponse.json({
      designs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get designs error:", error);
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable, please try again later.')
    if (prismaResp) return prismaResp
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}