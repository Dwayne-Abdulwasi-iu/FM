import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/commission-requests/designer - Get commission requests for the logged-in designer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Build where clause - only show requests for this designer that have been forwarded
    const where: Record<string, unknown> = {
      designerId: session.user.id,
      status: { not: "PENDING" }, // Only show forwarded requests
    };

    if (status) {
      where.status = status;
    }

    const requests = await prisma.commissionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Sanitize delivery addresses - remove phone numbers from designer view
    // Phone numbers should only be visible to admin for shipping coordination
    const sanitizedRequests = requests.map((req) => {
      if (req.deliveryAddress && typeof req.deliveryAddress === 'object') {
        const addr = req.deliveryAddress as Record<string, unknown>;
        // Remove phone number - designer only needs name and address for creation
        const { phone: _phone, ...sanitizedAddress } = addr;
        return {
          ...req,
          deliveryAddress: sanitizedAddress,
        };
      }
      return req;
    });

    return NextResponse.json({ requests: sanitizedRequests });
  } catch (error) {
    console.error("Get designer commission requests error:", error);
    return NextResponse.json(
      { error: "Failed to get commission requests" },
      { status: 500 }
    );
  }
}
