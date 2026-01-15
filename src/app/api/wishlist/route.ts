import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/wishlist - Check if a design is in user's wishlist or get all wishlisted items
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ isWishlisted: false });
    }

    const { searchParams } = new URL(request.url);
    const designId = searchParams.get("designId");

    // If designId is provided, check if that specific design is wishlisted
    if (designId) {
      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_designId: {
            userId: session.user.id,
            designId,
          },
        },
      });
      return NextResponse.json({ isWishlisted: !!favorite });
    }

    // Otherwise, return all wishlisted designs
    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: {
        design: {
          select: {
            id: true,
            title: true,
            price: true,
            imageUrl: true,
            thumbnailUrl: true,
            category: true,
            designer: {
              select: {
                id: true,
                name: true,
                displayName: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      favorites: favorites.map((f) => f.design),
      count: favorites.length,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to get wishlist" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wishlist - Add a design to wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { designId } = await request.json();

    if (!designId) {
      return NextResponse.json(
        { error: "Design ID is required" },
        { status: 400 }
      );
    }

    // Check if design exists
    const design = await prisma.design.findUnique({
      where: { id: designId },
    });

    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_designId: {
          userId: session.user.id,
          designId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ message: "Already in wishlist", favorite: existing });
    }

    // Create favorite
    const favorite = await prisma.favorite.create({
      data: {
        userId: session.user.id,
        designId,
      },
    });

    return NextResponse.json({ 
      message: "Added to wishlist", 
      favorite,
      isWishlisted: true,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to add to wishlist" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wishlist - Remove a design from wishlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { designId } = await request.json();

    if (!designId) {
      return NextResponse.json(
        { error: "Design ID is required" },
        { status: 400 }
      );
    }

    // Delete favorite
    await prisma.favorite.deleteMany({
      where: {
        userId: session.user.id,
        designId,
      },
    });

    return NextResponse.json({ 
      message: "Removed from wishlist",
      isWishlisted: false,
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return NextResponse.json(
      { error: "Failed to remove from wishlist" },
      { status: 500 }
    );
  }
}
