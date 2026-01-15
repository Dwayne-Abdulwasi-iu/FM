import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/contests/[id] - Get contest details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contest = await prisma.contest.findUnique({
      where: { id },
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
        entries: {
          orderBy: { voteCount: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                displayName: true,
                image: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    // Check if current user has entered
    const session = await getServerSession(authOptions);
    let hasEntered = false;
    if (session?.user?.id) {
      hasEntered = contest.entries.some(e => e.userId === session.user.id);
    }

    return NextResponse.json({
      contest,
      hasEntered,
    });
  } catch (error) {
    console.error("Get contest error:", error);
    return NextResponse.json(
      { error: "Failed to get contest" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contests/[id]/enter - Submit contest entry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, imageUrl } = body;

    // Check if contest exists and is active
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        _count: { select: { entries: true } },
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    if (contest.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: "Contest is not accepting entries" },
        { status: 400 }
      );
    }

    // Check if already entered
    const existingEntry = await prisma.contestEntry.findFirst({
      where: {
        contestId: id,
        userId: session.user.id,
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: "You have already entered this contest" },
        { status: 400 }
      );
    }

    // Create entry
    const entry = await prisma.contestEntry.create({
      data: {
        contestId: id,
        userId: session.user.id,
        title,
        description,
        imageUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Submit entry error:", error);
    return NextResponse.json(
      { error: "Failed to submit entry" },
      { status: 500 }
    );
  }
}
