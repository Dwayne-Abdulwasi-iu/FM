import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/refunds - Submit refund request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, reason, description, evidence } = body;

    // Verify order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: session.user.id,
      },
      include: {
        items: {
          include: {
            design: {
              select: {
                title: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if refund already requested
    const existingRefund = await prisma.refundRequest.findFirst({
      where: {
        orderId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (existingRefund) {
      return NextResponse.json(
        { error: "A refund request is already pending for this order" },
        { status: 400 }
      );
    }

    // Check if within refund window (7 days)
    const daysSincePurchase = Math.floor(
      (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePurchase > 7) {
      return NextResponse.json(
        { error: "Refund window has expired (7 days)" },
        { status: 400 }
      );
    }

    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId,
        userId: session.user.id,
        reason,
        description,
        evidence: evidence || [],
        status: 'PENDING',
        refundAmount: order.totalAmount,
      },
    });

    return NextResponse.json({ refundRequest }, { status: 201 });
  } catch (error) {
    console.error("Refund request error:", error);
    return NextResponse.json(
      { error: "Failed to submit refund request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/refunds - Get user's refund requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse pagination parameters with max limit
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10)), 50);
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.refundRequest.count({ where: { userId: session.user.id } })
    ]);

    return NextResponse.json({ 
      refunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get refunds error:", error);
    return NextResponse.json(
      { error: "Failed to get refund requests" },
      { status: 500 }
    );
  }
}
