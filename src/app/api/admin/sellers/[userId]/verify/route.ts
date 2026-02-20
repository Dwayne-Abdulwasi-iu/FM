// PATCH /api/admin/sellers/[userId]/verify - Toggle seller verification status
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Verify admin access
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to verify sellers' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const { isVerified } = await request.json().catch(() => ({}));

    if (typeof isVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'isVerified must be a boolean' },
        { status: 400 }
      );
    }

    // Get current user to check if they're a seller
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        isVerified: true,
        totalSales: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    // Update seller verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isVerified,
        verificationDate: isVerified ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        verificationDate: true,
        totalSales: true,
        avgRating: true,
      },
    });

    // Create audit log for seller verification change
    try {
      await prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          actorType: 'ADMIN',
          action: isVerified ? 'SELLER_VERIFIED' : 'SELLER_VERIFICATION_REVOKED',
          category: 'STATUS_CHANGE',
          targetType: 'USER',
          targetId: userId,
          metadata: {
            sellerName: user.name || user.email,
            totalSales: user.totalSales,
            action: isVerified ? 'Verified' : 'Verification revoked',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch {
      // Audit log failure is non-critical
      console.warn('Failed to create audit log for seller verification change');
    }

    return NextResponse.json({
      success: true,
      message: isVerified 
        ? `${user.name || user.email} marked as verified seller`
        : `${user.name || user.email} verification revoked`,
      seller: updatedUser,
    });

  } catch (error) {
    console.error('Seller verification error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update seller verification',
      },
      { status: 500 }
    );
  }
}

// GET - Get seller verification details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Allow sellers to check their own verification status
    // or admins to check any seller
    const { userId } = await params;
    
    if (session?.user?.id !== userId && session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to view this seller' },
        { status: 403 }
      );
    }

    const seller = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isVerified: true,
        verificationDate: true,
        totalSales: true,
        totalEarnings: true,
        avgRating: true,
        createdAt: true,
      },
    });

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      seller,
    });

  } catch (error) {
    console.error('Get seller verification error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get seller verification',
      },
      { status: 500 }
    );
  }
}
