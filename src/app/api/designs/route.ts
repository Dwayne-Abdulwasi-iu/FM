import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary, generateThumbnailUrl } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";
import { Prisma } from '@prisma/client';
import { DESIGN_CATEGORIES, validateCategory } from "@/lib/design-categories";

export async function POST(request: NextRequest) {
  try {
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
    const tagsString = formData.get("tags") as string;
    
    // Parse tags from comma-separated string to array
    const tags = tagsString 
      ? tagsString.split(",")
          .map(t => t.trim())
          .filter(t => t.length > 0 && t.length <= 50)
          .slice(0, 10) // Max 10 tags
      : [];

    const MAX_PRICE = 1000000;
    const MAX_DESCRIPTION_LENGTH = 5000;
    
    // Validation: price, category, description
    if (!file || !title || isNaN(price) || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Strict price validation: must be positive number, not Infinity/NaN
    if (!isFinite(price) || price < 0.01 || price > MAX_PRICE) {
      return NextResponse.json(
        { error: `Invalid price (must be between $0.01 and $${MAX_PRICE})` },
        { status: 400 }
      );
    }
    
    // Validate category against whitelist
    const validCategory = validateCategory(category);
    if (!validCategory) {
      return NextResponse.json(
        { error: `Invalid category. Allowed: ${DESIGN_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate description length
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters)` },
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

    // Save to database using the validated category name (ensures consistent casing)
    const design = await prisma.design.create({
      data: {
        title,
        description,
        price,
        imageUrl: uploadResult.secure_url,
        thumbnailUrl,
        category: validCategory,
        tags,
        designerId: session.user.id,
      },
    });

    return NextResponse.json({ design }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload design. Please try again later." },
      { status: 500 }
    );
  }
}

// Maximum limit to prevent memory exhaustion
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "12", 10)), MAX_LIMIT);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const userId = searchParams.get("userId");
    const featured = searchParams.get("featured") === "true";
    const userOnly = searchParams.get("userOnly") === "true";

    const skip = (page - 1) * limit;

    const where: Prisma.DesignWhereInput = {
      // Only show approved designs
      approvalStatus: "APPROVED",
      isActive: true,
    };

    // Only show designs by regular users (not admins)
    if (userOnly) {
      where.designer = {
        role: "USER"
      };
    }

    if (category) {
      // Validate category against whitelist (case-insensitive)
      const validCategory = validateCategory(category);
      if (!validCategory) {
        // Return empty results for invalid category
        return NextResponse.json({
          designs: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      where.category = validCategory;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    if (userId) {
      where.designerId = userId;
    }

    // For featured designs, filter by featured=true and order by totalSales and totalRevenue
    if (featured) {
      where.featured = true;
    }

    const orderBy = featured 
      ? [
          { totalSales: "desc" as const },
          { totalRevenue: "desc" as const },
          { createdAt: "desc" as const }
        ]
      : { createdAt: "desc" as const };

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
              designerTier: true,
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

    // Add promotion data to each design (N+1 QUERY FIX)
    const now = new Date();
    
    // OPTIMIZATION: Fetch all promotions in single batch query instead of per-design
    const sellerIds = [...new Set(designs.map(d => d.designerId))];
    const allPromotions = await prisma.promotion.findMany({
      where: {
        sellerId: { in: sellerIds },
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { maxUsage: null },
          { maxUsage: { gt: 0 } }
        ]
      },
      select: {
        id: true,
        type: true,
        discountType: true,
        discountValue: true,
        bundlePrice: true,
        usageCount: true,
        maxUsage: true,
        sellerId: true,
        designIds: true
      }
    });
    
    // Index promotions by seller ID for fast lookup
    const promotionsBySeller = new Map<string, typeof allPromotions>();
    for (const promo of allPromotions) {
      if (!promotionsBySeller.has(promo.sellerId)) {
        promotionsBySeller.set(promo.sellerId, []);
      }
      promotionsBySeller.get(promo.sellerId)!.push(promo);
    }
    
    const designsWithPromotions = designs.map((design) => {
      // Get promotions for this design's seller
      const sellerPromotions = promotionsBySeller.get(design.designerId) || [];
      const promotions = sellerPromotions.filter(p => 
        p.designIds && Array.isArray(p.designIds) && p.designIds.includes(design.id)
      );

        let promotionPrice = design.price;
        let promotionType: string | null = null;
        let promotionId: string | null = null;
        let discountAmount = 0;

        // Find the best promotion (highest discount)
        if (promotions.length > 0) {
          let bestDiscount = 0;
          for (const promo of promotions) {
            // Skip if max usage reached
            if (promo.maxUsage !== null && promo.usageCount >= promo.maxUsage) {
              continue;
            }

            let currentDiscount = 0;
            let currentPrice = design.price;

            if (promo.type === 'BUNDLE') {
              // For BUNDLE, show the bundlePrice as hint (actual price depends on other items)
              currentPrice = promo.bundlePrice || design.price;
              currentDiscount = design.price - currentPrice;
            } else if (promo.type === 'DISCOUNT' || promo.type === 'FLASH_SALE') {
              if (promo.discountType === 'PERCENTAGE' && promo.discountValue) {
                currentDiscount = (design.price * promo.discountValue) / 100;
                currentPrice = design.price - currentDiscount;
              } else if (promo.discountType === 'FIXED' && promo.discountValue) {
                currentDiscount = promo.discountValue;
                currentPrice = Math.max(0, design.price - currentDiscount);
              }
            }

            // Use the promotion with highest discount
            if (currentDiscount > bestDiscount) {
              bestDiscount = currentDiscount;
              promotionPrice = currentPrice;
              promotionType = promo.type;
              promotionId = promo.id;
              discountAmount = currentDiscount;
            }
          }
        }

        return {
          ...design,
          promotionPrice: promotionType ? promotionPrice : undefined,
          promotionType,
          promotionId,
          discountAmount: discountAmount > 0 ? discountAmount : undefined
        };
    });

    return NextResponse.json({
      designs: designsWithPromotions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get designs error:", error);

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get designs. Please try again later." },
      { status: 500 }
    );
  }
}