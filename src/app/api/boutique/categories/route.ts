// GET /api/boutique/categories - Get all boutique categories
// Supports ?parentOnly=true for just parent categories

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentOnly = searchParams.get('parentOnly') === 'true';
    const parentId = searchParams.get('parentId');

    const whereClause: Record<string, unknown> = { isActive: true };

    if (parentOnly) {
      whereClause.parentId = null;
    } else if (parentId) {
      whereClause.parentId = parentId;
    }

    const categories = await prisma.boutiqueCategory.findMany({
      where: whereClause,
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: {
              where: { status: 'LIVE' },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Error fetching boutique categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
