import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/users/[id]/follow - Follow a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: followingId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const followerId = session.user.id;

    // Can't follow yourself
    if (followerId === followingId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!userToFollow) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: "Already following this user" },
        { status: 400 }
      );
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // Get updated follower count
    const followersCount = await prisma.follow.count({
      where: { followingId },
    });

    return NextResponse.json({
      success: true,
      isFollowing: true,
      followersCount,
    });
  } catch (error) {
    console.error("Follow user error:", error);

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to follow user. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]/follow - Unfollow a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: followingId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const followerId = session.user.id;

    // Delete follow relationship
    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });

    // Get updated follower count
    const followersCount = await prisma.follow.count({
      where: { followingId },
    });

    return NextResponse.json({
      success: true,
      isFollowing: false,
      followersCount,
    });
  } catch (error) {
    console.error("Unfollow user error:", error);

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to unfollow user. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/[id]/follow - Get followers/following list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "followers";
    const pageParam = parseInt(searchParams.get("page") || "1");
    const limitParam = parseInt(searchParams.get("limit") || "20");

    // Validate type parameter
    if (type !== "followers" && type !== "following") {
      return NextResponse.json(
        { error: "Invalid type. Use 'followers' or 'following'" },
        { status: 400 }
      )
    }

    // Validate pagination
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 20 : Math.min(limitParam, 100)
    const skip = (page - 1) * limit;

    if (type === "followers") {
      const [followers, total] = await Promise.all([
        prisma.follow.findMany({
          where: { followingId: id },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            follower: {
              select: {
                id: true,
                name: true,
                displayName: true,
                image: true,
                bio: true,
                isVerified: true,
                verificationBadge: true,
                _count: {
                  select: { designs: true, followers: true },
                },
              },
            },
          },
        }),
        prisma.follow.count({ where: { followingId: id } }),
      ]);

      return NextResponse.json({
        users: followers.map((f) => f.follower),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } else {
      const [following, total] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: id },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            following: {
              select: {
                id: true,
                name: true,
                displayName: true,
                image: true,
                bio: true,
                isVerified: true,
                verificationBadge: true,
                _count: {
                  select: { designs: true, followers: true },
                },
              },
            },
          },
        }),
        prisma.follow.count({ where: { followerId: id } }),
      ]);

      return NextResponse.json({
        users: following.map((f) => f.following),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }
  } catch (error) {
    console.error("Get followers/following error:", error);

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get followers/following. Please try again later." },
      { status: 500 }
    );
  }
}
