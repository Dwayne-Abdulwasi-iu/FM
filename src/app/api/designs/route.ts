import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary, generateThumbnailUrl } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

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
      ? tagsString.split(",").map(t => t.trim()).filter(t => t.length > 0)
      : [];

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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const userId = searchParams.get("userId");
    const featured = searchParams.get("featured") === "true";
    const userOnly = searchParams.get("userOnly") === "true";

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
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
      where.category = category;
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
        where: (where as any) /* eslint-disable-line @typescript-eslint/no-explicit-any */,
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
  prisma.design.count({ where: (where as any) /* eslint-disable-line @typescript-eslint/no-explicit-any */ }),
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}