// Admin lists all seller appeals (both variant discrepancy and dispute appeals)
// GET - List appeals with filtering

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { prismaErrorResponse } from '@/lib/prismaError';

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
    const status = searchParams.get('status') || 'PENDING';
    const sort = searchParams.get('sort') || 'newest';
    const appealType = searchParams.get('type') || 'all'; // 'all', 'discrepancy', 'dispute'

    // Fetch both appeal types in parallel
    const [variantAppeals, disputeAppeals] = await Promise.all([
      // Fetch variant discrepancy appeals - minimal data for list view
      (appealType === 'all' || appealType === 'discrepancy')
        ? prisma.variantDiscrepancyAppeal.findMany({
            where: status === 'all' ? {} : { appealStatus: status },
            select: {
              id: true,
              appealStatus: true,
              reason: true,
              resolutionNotes: true,
              createdAt: true,
              seller: { select: { id: true, name: true, email: true } },
            },
            take: 100,
            orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
          }).then(appeals =>
            appeals.map(a => ({
              ...a,
              type: 'discrepancy',
              appealTitle: 'Warehouse Discrepancy Appeal',
              sellerName: a.seller?.name || 'Unknown Seller',
              sellerEmail: a.seller?.email || '',
            }))
          )
        : [],
      
      // Fetch dispute appeals - minimal data for list view
      (appealType === 'all' || appealType === 'dispute')
        ? (() => {
            let whereCondition: any = {};
            if (status !== 'all') {
              if (status === 'PENDING') {
                whereCondition = { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } };
              } else if (status === 'APPROVED') {
                whereCondition = { status: 'APPROVED' };
              } else if (status === 'REJECTED') {
                whereCondition = { status: 'DENIED' };              } else if (status === 'RESOLVED') {
                // RESOLVED disputes are marked as APPROVED or DENIED with reviewedAt timestamp
                whereCondition = { reviewedAt: { not: null }, status: { in: ['APPROVED', 'DENIED'] } }              }
            }
            return prisma.disputeAppeal.findMany({
              where: whereCondition,
              include: {
                seller: { select: { id: true, name: true, email: true } },
              },
              take: 100,
              orderBy: { submittedAt: sort === 'oldest' ? 'asc' : 'desc' },
            }).then(appeals =>
              appeals.map(a => ({
                id: a.id,
                status: a.status,
                originalDisputeNumber: a.originalDisputeNumber,
                reason: a.reason,
                notes: a.notes,
                submittedAt: a.submittedAt,
                type: 'dispute',
                appealTitle: `Dispute ${a.originalDisputeNumber}`,
                sellerName: a.seller?.name || 'Unknown Seller',
                sellerEmail: a.seller?.email || '',
                appealStatus: a.status,
                createdAt: a.submittedAt,
                resolutionNotes: a.adminResponse || '', // Map adminResponse to resolutionNotes for UI consistency
              }))
            );
          })()
        : [],
    ]);

    // Combine appeals (already sorted by database)
    const allAppeals = [...variantAppeals, ...disputeAppeals];
    
    // If fetching both types, sort by createdAt since parallel queries don't guarantee order
    if (appealType === 'all') {
      if (sort === 'oldest') {
        allAppeals.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else {
        allAppeals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }

    const response = NextResponse.json({ success: true, appeals: allAppeals });
    // Cache for 30 seconds to reduce database load while keeping data relatively fresh
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;
  } catch (error) {
    console.error('Error fetching appeals:', error);
    const prismaResp = prismaErrorResponse(error, 'Failed to fetch appeals');
    if (prismaResp) return prismaResp;

    return NextResponse.json(
      { success: false, message: 'Failed to fetch appeals' },
      { status: 500 }
    );
  }
}
