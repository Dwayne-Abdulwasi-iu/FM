// GET /api/boutique/admin/coupons - List all boutique coupons
// POST /api/boutique/admin/coupons - Create a new boutique coupon
// PATCH /api/boutique/admin/coupons - Update a boutique coupon
// DELETE /api/boutique/admin/coupons - Deactivate a coupon

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - List all boutique coupons (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get('includeExpired') === 'true';
    const sellerId = searchParams.get('sellerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const now = new Date();

    const where: Record<string, unknown> = {};
    
    if (!includeExpired) {
      where.isActive = true;
      where.validUntil = { gte: now };
    }
    
    if (sellerId) {
      where.sellerId = sellerId;
    }

    const [coupons, total] = await Promise.all([
      prisma.boutiqueCoupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.boutiqueCoupon.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching boutique coupons:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST - Create a new boutique coupon
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minPurchase,
      maxUses,
      sellerId,
      categoryId,
      validFrom,
      validUntil,
    } = body;

    // Validate required fields
    if (!code || typeof code !== 'string' || code.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Coupon code must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!discountType || !['PERCENTAGE', 'FIXED'].includes(discountType)) {
      return NextResponse.json(
        { success: false, message: 'Discount type must be PERCENTAGE or FIXED' },
        { status: 400 }
      );
    }

    if (!discountValue || typeof discountValue !== 'number' || discountValue <= 0) {
      return NextResponse.json(
        { success: false, message: 'Discount value must be a positive number' },
        { status: 400 }
      );
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json(
        { success: false, message: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      );
    }

    if (!validUntil) {
      return NextResponse.json(
        { success: false, message: 'Valid until date is required' },
        { status: 400 }
      );
    }

    // Normalize code
    const normalizedCode = code.toUpperCase().trim();

    // Check for duplicate
    const existing = await prisma.boutiqueCoupon.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'A coupon with this code already exists' },
        { status: 409 }
      );
    }

    // Create coupon
    const coupon = await prisma.boutiqueCoupon.create({
      data: {
        code: normalizedCode,
        description: description?.trim() || null,
        discountType,
        discountValue,
        maxDiscount: maxDiscount || null,
        minPurchase: minPurchase || null,
        maxUses: maxUses || 1,
        usedCount: 0,
        sellerId: sellerId || null,
        categoryId: categoryId || null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: new Date(validUntil),
        isActive: true,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Coupon created successfully', coupon },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating boutique coupon:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}

// PATCH - Update a boutique coupon
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { couponId, ...updates } = body;

    if (!couponId) {
      return NextResponse.json(
        { success: false, message: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    // Check coupon exists
    const existing = await prisma.boutiqueCoupon.findUnique({
      where: { id: couponId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.discountValue !== undefined) updateData.discountValue = updates.discountValue;
    if (updates.maxDiscount !== undefined) updateData.maxDiscount = updates.maxDiscount;
    if (updates.minPurchase !== undefined) updateData.minPurchase = updates.minPurchase;
    if (updates.maxUses !== undefined) updateData.maxUses = updates.maxUses;
    if (updates.validFrom !== undefined) updateData.validFrom = new Date(updates.validFrom);
    if (updates.validUntil !== undefined) updateData.validUntil = new Date(updates.validUntil);
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const coupon = await prisma.boutiqueCoupon.update({
      where: { id: couponId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Coupon updated successfully',
      coupon,
    });
  } catch (error) {
    console.error('Error updating boutique coupon:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate a coupon (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get('couponId');

    if (!couponId) {
      return NextResponse.json(
        { success: false, message: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    await prisma.boutiqueCoupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Coupon deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating boutique coupon:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to deactivate coupon' },
      { status: 500 }
    );
  }
}
