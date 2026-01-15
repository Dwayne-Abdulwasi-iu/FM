import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/verification/request - Submit verification request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { portfolioUrl, socialProof, businessLicense } = body;

    // Check if already has pending request
    const existingRequest = await prisma.verificationRequest.findFirst({
      where: {
        userId: session.user.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending verification request" },
        { status: 400 }
      );
    }

    // Check if already verified
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { verificationStatus: true },
    });

    if (user?.verificationStatus === 'VERIFIED') {
      return NextResponse.json(
        { error: "You are already verified" },
        { status: 400 }
      );
    }

    const verificationRequest = await prisma.verificationRequest.create({
      data: {
        userId: session.user.id,
        portfolioUrl,
        socialProof: socialProof || [],
        businessLicense,
        status: 'PENDING',
      },
    });

    // Update user status
    await prisma.user.update({
      where: { id: session.user.id },
      data: { verificationStatus: 'PENDING' },
    });

    return NextResponse.json({ request: verificationRequest }, { status: 201 });
  } catch (error) {
    console.error("Verification request error:", error);
    return NextResponse.json(
      { error: "Failed to submit verification request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/verification/request - Get user's verification status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user, request] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          verificationStatus: true,
          verificationBadge: true,
          verificationDate: true,
          isVerified: true,
        },
      }),
      prisma.verificationRequest.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      status: user?.verificationStatus || 'UNVERIFIED',
      badge: user?.verificationBadge,
      verificationDate: user?.verificationDate,
      isVerified: user?.isVerified,
      latestRequest: request,
    });
  } catch (error) {
    console.error("Get verification status error:", error);
    return NextResponse.json(
      { error: "Failed to get verification status" },
      { status: 500 }
    );
  }
}
