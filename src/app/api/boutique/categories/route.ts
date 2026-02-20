// GET /api/boutique/categories - Get all boutique categories
// Supports ?parentOnly=true for just parent categories

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentOnly = searchParams.get('parentOnly') === 'true';
    const parentId = searchParams.get('parentId');

    // NOTE: Prisma has a bug with parentId: null in where clauses
    // So we fetch all active categories and filter in-memory
    const allCategories = await prisma.boutiqueCategory.findMany({
      where: { isActive: true },
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

    // Filter based on parentOnly or parentId
    let filteredCategories = allCategories;
    if (parentOnly) {
      // Only return categories without a parent (null parentId)
      filteredCategories = allCategories.filter(cat => cat.parentId === null);
    } else if (parentId) {
      // Return categories with specific parent
      filteredCategories = allCategories.filter(cat => cat.parentId === parentId);
    }

    return NextResponse.json({
      success: true,
      categories: filteredCategories,
    });
  } catch (error) {
    console.error('Error fetching boutique categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
