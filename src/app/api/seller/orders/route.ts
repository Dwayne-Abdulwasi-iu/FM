import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Maximum page size to prevent memory exhaustion
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sellerId = session.user.id;

    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const requestedLimit = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10);
    const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const whereClause = {
      items: {
        some: {
          design: {
            designerId: sellerId,
          },
        },
      },
    };

    // Get all orders that contain at least one of the seller's designs
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          // POD fields
          isPOD: true,
          podProvider: true,
          podStatus: true,
          podOrderId: true,
          trackingNumber: true,
          trackingUrl: true,
          shippedAt: true,
          deliveredAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          shippingAddress: {
            select: {
              fullName: true,
              city: true,
              state: true,
              country: true,
            },
          },
          items: {
            where: {
              design: {
                designerId: sellerId,
              },
            },
            select: {
              id: true,
              designId: true,
              price: true,
              quantity: true,
              design: {
                select: {
                  id: true,
                  title: true,
                  thumbnailUrl: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where: whereClause })
    ]);

    return NextResponse.json({ 
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get seller orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
