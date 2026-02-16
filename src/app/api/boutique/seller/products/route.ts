// GET /api/boutique/seller/products - Get seller's own boutique products

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      sellerId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    const [products, total, statusCounts] = await Promise.all([
      prisma.boutiqueProduct.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          basePrice: true,
          brand: true,
          material: true,
          condition: true,
          status: true,
          createdAt: true,
          shipmentId: true,
          currentStock: true,
          fulfillmentMethod: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
          media: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: {
            select: { id: true, size: true, color: true, quantity: true },
          },
          _count: {
            select: { orders: true, favorites: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.boutiqueProduct.count({ where }),
      prisma.boutiqueProduct.groupBy({
        by: ['status'],
        where: { sellerId: session.user.id },
        _count: true,
      }),
    ]);

    // Fetch shipment status for each product to determine display status
    const productsWithShipmentStatus = await Promise.all(
      products.map(async (product: any) => {
        let displayStatus = product.status;

        // If product is in return workflow, check the MOST RECENT shipment status
        if (product.shipmentId || product.status === 'IN_RETURN') {
          const shipment = await prisma.sellerToAdminShipment.findFirst({
            where: {
              sellerId: session.user.id,
              productIds: { has: product.id },
            },
            select: { status: true, createdAt: true },
            orderBy: { createdAt: 'desc' }, // Get the most recent shipment
          });

          if (shipment) {
            // Map shipment status to display status
            if (shipment.status === 'PENDING_ADMIN_REVIEW') {
              displayStatus = 'RETURN_REQUESTED';
            } else if (shipment.status === 'SHIPPED') {
              displayStatus = 'RETURN_SHIPPED';
            } else if (shipment.status === 'DELIVERED') {
              displayStatus = 'RETURNED_TO_SELLER';
            } else if (shipment.status === 'APPROVED_BY_ADMIN') {
              displayStatus = 'IN_RETURN';
            }
          }
        }

        return {
          ...product,
          displayStatus,
        };
      })
    );

    // Format status counts
    const counts: Record<string, number> = {};
    statusCounts.forEach(sc => {
      counts[sc.status] = sc._count;
    });

    return NextResponse.json({
      success: true,
      products: productsWithShipmentStatus,
      statusCounts: counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching seller boutique products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
