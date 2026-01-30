import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateAttachmentUrls } from "@/lib/cloudinary";

/**
 * GET /api/commission-requests - Get commission requests
 * - Regular users: Get their own requests (as requester)
 * - Designers: Can also see requests sent to them (role=designer)
 * - Admin: Get all requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const payoutStatus = searchParams.get("payoutStatus");
    const designerId = searchParams.get("designerId");
    const role = searchParams.get("role"); // 'requester' or 'designer'
    const page = Math.max(1, parseInt(searchParams.get("page") || "1")); // Ensure at least 1
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "20"), 100)); // Min 1, max 100

    const isAdmin = session.user.role === "ADMIN";

    // Validate status parameter if provided
    const validStatuses = ["PENDING", "FORWARDED", "QUOTED", "PAID", "IN_PROGRESS", "DELIVERED", "REVISION", "COMPLETED", "CANCELLED", "DISPUTED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status parameter" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (!isAdmin) {
      // Check if user wants to see requests as a designer (incoming requests)
      if (role === "designer") {
        where.designerId = session.user.id;
        // Only show forwarded/accepted requests to designers (not pending admin review)
        if (!status) {
          where.status = { in: ["FORWARDED", "QUOTED", "PAID", "IN_PROGRESS", "DELIVERED", "REVISION", "COMPLETED"] };
        }
      } else {
        // Default: Show requests made by user (as requester)
        where.requesterId = session.user.id;
      }
    }

    if (status) {
      where.status = status;
    }

    // Admin can filter by payout status
    if (isAdmin && payoutStatus) {
      where.payoutStatus = payoutStatus;
    }

    // Admin can filter by designer
    if (isAdmin && designerId) {
      where.designerId = designerId;
    }

    // Get total count first to validate page parameter
    const total = await prisma.commissionRequest.count({ where });
    const maxPage = Math.max(1, Math.ceil(total / limit));
    
    // Cap page to prevent expensive skip operations on non-existent pages
    const safePage = Math.min(page, maxPage);

    const requests = await prisma.commissionRequest.findMany({
      where,
      skip: (safePage - 1) * limit,
      take: limit,
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
          designer: {
            select: {
              id: true,
              name: true,
              displayName: true,
              email: true,
              image: true,
            },
          },
          // Include reference design if it still exists
          referenceDesign: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              thumbnailUrl: true,
              price: true,
            },
          },
        },
      });

    return NextResponse.json({
      requests,
      pagination: {
        page: safePage,
        limit,
        total,
        pages: maxPage,
      },
    });
  } catch (error) {
    console.error("Get commission requests error:", error);
    
    // Handle Prisma database errors
    if (error instanceof Error && error.message.includes("prisma")) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }
    
    // Default: server error
    return NextResponse.json(
      { error: "Failed to get commission requests. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/commission-requests - Create a new commission request
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
      designerName,
      designerEmail,
      designerPageUrl,
      title,
      description,
      category,
      budget,
      deadline,
      attachments = [],
      isPhysical = false,
      deliveryAddress = null,
      // Reference design fields
      referenceDesignId = null,
      referenceDesignUrl: _referenceDesignUrl = null,
      referenceDesignTitle = null,
    } = body;

    // Validate required fields
    if (!designerId || !title || !description) {
      return NextResponse.json(
        { error: "Designer, title, and description are required" },
        { status: 400 }
      );
    }

    // Input length validation to prevent DoS/storage abuse
    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 }
      );
    }
    if (description.length > 10000) {
      return NextResponse.json(
        { error: "Description must be 10,000 characters or less" },
        { status: 400 }
      );
    }
    if (budget && budget.length > 100) {
      return NextResponse.json(
        { error: "Budget must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Validate initial attachment URLs if provided
    if (attachments && attachments.length > 0) {
      const attachmentValidation = validateAttachmentUrls(attachments);
      if (!attachmentValidation.valid) {
        return NextResponse.json(
          { error: attachmentValidation.error },
          { status: 400 }
        );
      }
    }

    // Validate delivery address for physical commissions
    if (isPhysical) {
      if (!deliveryAddress) {
        return NextResponse.json(
          { error: "Delivery address is required for physical commissions" },
          { status: 400 }
        );
      }
      
      const addr = deliveryAddress as Record<string, unknown>;
      const requiredFields = ["name", "phone", "address", "city", "state", "country"];
      const missingFields = requiredFields.filter(field => !addr[field] || String(addr[field]).trim() === "");
      
      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Delivery address missing required fields: ${missingFields.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Verify designer exists and accepts commissions
    const designer = await prisma.user.findUnique({
      where: { id: designerId },
      select: { 
        id: true, 
        name: true, 
        displayName: true, 
        email: true,
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

    // Check if designer is available (not busy or closed)
    if (designer.commissionStatus !== 'OPEN') {
      return NextResponse.json(
        { error: `This designer is currently ${designer.commissionStatus === 'BUSY' ? 'busy' : 'not accepting'} commission requests` },
        { status: 400 }
      );
    }

    // Validate reference design if provided - must belong to the designer
    let validatedReferenceDesignTitle = referenceDesignTitle;
    if (referenceDesignId) {
      const referenceDesign = await prisma.design.findUnique({
        where: { id: referenceDesignId },
        select: { id: true, designerId: true, title: true },
      });

      if (!referenceDesign) {
        // Design doesn't exist - clear reference fields
        validatedReferenceDesignTitle = null;
      } else if (referenceDesign.designerId !== designerId) {
        // Design belongs to a different designer - this is not allowed
        return NextResponse.json(
          { error: "Reference design must belong to the selected designer" },
          { status: 400 }
        );
      } else {
        // Use the actual title from the design
        validatedReferenceDesignTitle = referenceDesign.title;
      }
    }

    // Get requester info
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, displayName: true, email: true },
    });

    // Create the commission request
    const commissionRequest = await prisma.commissionRequest.create({
      data: {
        requesterId: session.user.id,
        requesterName: requester?.displayName || requester?.name || "Anonymous",
        requesterEmail: requester?.email || session.user.email || "",
        designerId,
        designerName: designerName || designer.displayName || designer.name || "Designer",
        designerEmail: designerEmail || designer.email,
        designerPageUrl: designerPageUrl || `/designers/${designerId}`,
        title,
        description,
        category: category || null,
        budget: budget || null,
        deadline: deadline || null,
        attachments: attachments,
        status: "PENDING",
        // Physical commission fields
        isPhysical: isPhysical || false,
        deliveryAddress: isPhysical && deliveryAddress ? deliveryAddress : undefined,
        deliveryStatus: isPhysical ? "AWAITING_CREATION" : null,
        // Reference design fields
        referenceDesignId: referenceDesignId || null,
        referenceDesignUrl: referenceDesignId ? `/designs/${referenceDesignId}` : null,
        referenceDesignTitle: validatedReferenceDesignTitle || null,
      },
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
        designer: {
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

    return NextResponse.json({
      success: true,
      request: commissionRequest,
    });
  } catch (error) {
    console.error("Create commission request error:", error);
    
    // Handle Prisma database errors
    if (error instanceof Error && error.message.includes("prisma")) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }
    
    // Default: server error
    return NextResponse.json(
      { error: "Failed to create commission request. Please try again later." },
      { status: 500 }
    );
  }
}
