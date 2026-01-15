import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/contests - Get contests list
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: Record<string, unknown> = { isPublic: true };

    if (status !== "all") {
      where.status = status.toUpperCase();
    }

    const [contests, total] = await Promise.all([
      prisma.contest.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              displayName: true,
              image: true,
              isVerified: true,
            },
          },
          _count: {
            select: { entries: true },
          },
        },
      }),
      prisma.contest.count({ where: where as any }),
    ]);

    return NextResponse.json({
      contests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get contests error:", error);
    return NextResponse.json(
      { error: "Failed to get contests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contests - Create a contest
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only verified users or admins can create contests
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVerified: true, isAdmin: true },
    });

    if (!user?.isVerified && !user?.isAdmin) {
      return NextResponse.json(
        { error: "Only verified users can create contests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      rules,
      theme,
      coverImage,
      prizes,
      startDate,
      endDate,
      votingStart,
      votingEnd,
      maxEntries,
      isPublic,
    } = body;

    const contest = await prisma.contest.create({
      data: {
        title,
        description,
        rules,
        theme,
        coverImage,
        prizes: prizes || {},
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        votingStart: votingStart ? new Date(votingStart) : null,
        votingEnd: votingEnd ? new Date(votingEnd) : null,
        maxEntries: maxEntries || 1,
        isPublic: isPublic !== false,
        status: new Date(startDate) > new Date() ? 'UPCOMING' : 'ACTIVE',
        creatorId: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ contest }, { status: 201 });
  } catch (error) {
    console.error("Create contest error:", error);
    return NextResponse.json(
      { error: "Failed to create contest" },
      { status: 500 }
    );
  }
}
