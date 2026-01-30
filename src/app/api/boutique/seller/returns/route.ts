// GET /api/boutique/seller/returns - Get returns for seller's orders
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { prismaErrorResponse } from '@/lib/prismaError';

// GET - Get seller's returns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statuses = searchParams.getAll('status');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      order: {
        sellerId: session.user.id,
      },
    };

    // Filter by status
    if (statuses.length > 0) {
      where.status = {
        in: statuses,
      };
    }

    // Search by return number, reason, or order number
    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch returns with related order and buyer info
    const returns = await prisma.boutiqueReturn.findMany({
      where,
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        orderItem: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    // Count total
    const total = await prisma.boutiqueReturn.count({ where });

    return NextResponse.json({
      success: true,
      returns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching seller returns:', error);
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch returns');
    if (prismaResp) return prismaResp;

    return NextResponse.json(
      { success: false, message: 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}

// PATCH - Update return status (confirm receipt, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { returnId, action, notes } = body;

    if (!returnId || !action) {
      return NextResponse.json(
        { success: false, message: 'Return ID and action are required' },
        { status: 400 }
      );
    }

    // Verify seller owns this return (through order)
    const returnRequest = await prisma.boutiqueReturn.findUnique({
      where: { id: returnId },
      include: {
        order: true,
      },
    });

    if (!returnRequest) {
      return NextResponse.json(
        { success: false, message: 'Return not found' },
        { status: 404 }
      );
    }

    if (returnRequest.order.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only sellers can acknowledge receipt
    if (action === 'acknowledge_receipt') {
      if (returnRequest.status !== 'ITEM_RECEIVED') {
        return NextResponse.json(
          { success: false, message: 'Item must be received before acknowledging' },
          { status: 400 }
        );
      }

      const updated = await prisma.boutiqueReturn.update({
        where: { id: returnId },
        data: {
          adminNotes: notes || returnRequest.adminNotes,
          resolvedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Return acknowledged',
        return: updated,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating return:', error);
    const prismaResp = prismaErrorResponse(error, 'Failed to update return');
    if (prismaResp) return prismaResp;

    return NextResponse.json(
      { success: false, message: 'Failed to update return' },
      { status: 500 }
    );
  }
}
