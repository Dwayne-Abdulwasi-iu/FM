import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/commissions - Get commission requests
 * For clients: Get their own requests
 * For designers: Get requests sent to them
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "client"; // 'client' or 'designer'
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build query
    const where: Record<string, unknown> = {};

    if (role === "designer") {
      where.designerId = session.user.id;
    } else {
      where.clientId = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              displayName: true,
              image: true,
            },
          },
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
        },
      }),
      prisma.commission.count({ where }),
    ]);

    return NextResponse.json({
      commissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get commissions error:", error);
    return NextResponse.json(
      { error: "Failed to get commissions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/commissions - Create a new commission request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      designerId,
      title,
      description,
      category,
      style,
      budget,
      deadline,
      referenceImages,
      requirements: _requirements,
    } = body;

    // Validation
    if (!designerId || !title || !description) {
      return NextResponse.json(
        { error: "Designer, title, and description are required" },
        { status: 400 }
      );
    }

    // Cannot send commission request to yourself
    if (designerId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot request a commission from yourself" },
        { status: 400 }
      );
    }

    // Verify designer exists and accepts commissions
    const designer = await prisma.user.findUnique({
      where: { id: designerId },
      select: { 
        id: true, 
        role: true,
        acceptsCommissions: true,
        commissionStatus: true,
      },
    });

    if (!designer) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    // Check if designer accepts commissions
    if (!designer.acceptsCommissions) {
      return NextResponse.json(
        { error: "This designer is not currently accepting commission requests" },
        { status: 400 }
      );
    }

    // Check if designer is available
    if (designer.commissionStatus !== 'OPEN') {
      return NextResponse.json(
        { error: `This designer is currently ${designer.commissionStatus === 'BUSY' ? 'busy' : 'not accepting'} commission requests` },
        { status: 400 }
      );
    }

    // Create the commission
    const commission = await prisma.commission.create({
      data: {
        clientId: session.user.id,
        designerId,
        title,
        description,
        category: category || "Custom Design",
        style: style || null,
        budgetMin: budget ? parseFloat(budget) : null,
        budgetMax: budget ? parseFloat(budget) : null,
        deadline: deadline ? new Date(deadline) : null,
        references: referenceImages || [],
        status: "PENDING",
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
          },
        },
        designer: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
            isVerified: true,
          },
        },
      },
    });

    return NextResponse.json({ commission }, { status: 201 });
  } catch (error) {
    console.error("Create commission error:", error);
    return NextResponse.json(
      { error: "Failed to create commission request" },
      { status: 500 }
    );
  }
}
