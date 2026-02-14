// GET /api/boutique/seller/out-of-stock - Get seller's sold-out products

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    // Get products with OUT_OF_STOCK status or currentStock = 0
    const [products, total] = await Promise.all([
      prisma.boutiqueProduct.findMany({
        where: {
          sellerId: session.user.id,
          OR: [
            { status: 'OUT_OF_STOCK' },
            { currentStock: 0 },
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          originalQuantity: true,
          currentStock: true,
          outOfStockAt: true,
          createdAt: true,
          media: true,  // Get ALL media files (images and videos)
          variants: {
            select: {
              id: true,
              size: true,
              color: true,
              quantity: true,
              soldOutAt: true,
            },
          },
          _count: {
            select: { orders: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.boutiqueProduct.count({
        where: {
          sellerId: session.user.id,
          OR: [
            { status: 'OUT_OF_STOCK' },
            { currentStock: 0 },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        originalQuantity: p.originalQuantity || 0,
        currentStock: p.currentStock || 0,
        outOfStockAt: p.outOfStockAt,
        createdAt: p.createdAt,
        imageUrl: p.media[0]?.url || null,
        media: p.media.map(m => ({
          id: m.id,
          url: m.url,
          type: m.type,
          isPrimary: m.isPrimary,
        })),
        totalOrders: p._count.orders,
        variants: p.variants.map(v => ({
          id: v.id,
          size: v.size,
          color: v.color,
          soldOutAt: v.soldOutAt,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching out-of-stock products:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: `Failed to fetch out-of-stock products: ${message}` },
      { status: 500 }
    );
  }
}
