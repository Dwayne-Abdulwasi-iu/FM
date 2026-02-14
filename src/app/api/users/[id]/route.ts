import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/users/[id] - Get user profile with stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        displayName: true,
        image: true,
        coverImage: true,
        bio: true,
        website: true,
        location: true,
        specialties: true,
        experience: true,
        portfolioUrl: true,
        socialLinks: true,
        isVerified: true,
        designerTier: true,
        subscriptionTier: true,
        verificationBadge: true,
        verificationStatus: true,
        createdAt: true,
        profileViews: true,
        totalSales: true,
        avgRating: true,
        // Commission settings
        acceptsCommissions: true,
        commissionStatus: true,
        commissionMinBudget: true,
        commissionMaxBudget: true,
        commissionTurnaround: true,
        commissionTypes: true,
        _count: {
          select: {
            designs: { where: { isActive: true, approvalStatus: 'APPROVED' } },
            followers: true,
            following: true,
            reviews: true,
          },
        },
        designs: {
          where: { isActive: true, approvalStatus: 'APPROVED' },
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            imageUrl: true,
            price: true,
            totalSales: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if current user is following this profile
    let isFollowing = false;
    if (session?.user?.id && session.user.id !== id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: id,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Increment profile views (only for non-owners)
    if (!session?.user?.id || session.user.id !== id) {
      await prisma.user.update({
        where: { id },
        data: { profileViews: { increment: 1 } },
      });
    }

    return NextResponse.json({
      user: {
        ...user,
        isFollowing,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        designsCount: user._count.designs,
        reviewsCount: user._count.reviews,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get user profile. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id] - Update user profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.id !== id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      displayName,
      bio,
      website,
      location,
      coverImage,
      specialties,
      experience,
      portfolioUrl,
      socialLinks,
      emailNotifications,
      pushNotifications,
    } = body;

    // Validate field lengths to prevent abuse
    if (displayName && displayName.length > 100) {
      return NextResponse.json(
        { error: "Display name must be no more than 100 characters" },
        { status: 400 }
      )
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be no more than 500 characters" },
        { status: 400 }
      )
    }

    if (website && website.length > 255) {
      return NextResponse.json(
        { error: "Website URL must be no more than 255 characters" },
        { status: 400 }
      )
    }

    if (location && location.length > 100) {
      return NextResponse.json(
        { error: "Location must be no more than 100 characters" },
        { status: 400 }
      )
    }

    if (portfolioUrl && portfolioUrl.length > 255) {
      return NextResponse.json(
        { error: "Portfolio URL must be no more than 255 characters" },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        displayName,
        bio,
        website,
        location,
        coverImage,
        specialties,
        experience,
        portfolioUrl,
        socialLinks,
        emailNotifications,
        pushNotifications,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        image: true,
        bio: true,
        website: true,
        location: true,
        specialties: true,
        experience: true,
        portfolioUrl: true,
        socialLinks: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user profile error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('prisma')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update profile. Please try again later." },
      { status: 500 }
    );
  }
}
