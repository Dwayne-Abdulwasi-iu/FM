// Get variant discrepancies with filtering and sorting
// GET - Retrieve discrepancies for admin dashboard

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'PENDING';
    const ageFilter = searchParams.get('age') || 'all';
    const sortBy = searchParams.get('sort') || 'oldest';

    // Build filter
    const where: any = {};

    if (statusFilter !== 'all') {
      where.acceptanceStatus = statusFilter;
    }

    // Get discrepancies with their shipment and variant info
    let discrepancies = await prisma.variantDiscrepancy.findMany({
      where,
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        shipment: {
          select: {
            id: true,
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 500, // Limit to 500 for performance
    });

    // Apply age filter on client side since we need to calculate days
    if (ageFilter !== 'all') {
      const now = Date.now();
      discrepancies = discrepancies.filter(d => {
        const daysOld = Math.floor((now - new Date(d.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        if (ageFilter === '1-3') return daysOld >= 1 && daysOld <= 3;
        if (ageFilter === '4-6') return daysOld >= 4 && daysOld <= 6;
        if (ageFilter === '7+') return daysOld >= 7;
        return true;
      });
    }

    // Apply sorting
    if (sortBy === 'newest') {
      discrepancies = discrepancies.reverse();
    }

    return NextResponse.json({
      success: true,
      discrepancies,
      total: discrepancies.length,
    });
  } catch (error) {
    console.error('Error fetching discrepancies:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch discrepancies', error: (error as Error).message },
      { status: 500 }
    );
  }
}
