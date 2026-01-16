// POST /api/boutique/coupons/validate - Validate a coupon code

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { code, subtotal } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, valid: false, message: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const coupon = await prisma.boutiqueCoupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    if (!coupon) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'Invalid or expired coupon code',
      });
    }

    // Check usage limit
    if (coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'Coupon has reached its usage limit',
      });
    }

    // Check minimum order amount
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: `Minimum order amount of ₦${coupon.minPurchase.toLocaleString()} required`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      // FIXED amount
      discount = coupon.discountValue;
      if (discount > subtotal) {
        discount = subtotal;
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      discount,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
      },
      message: `Coupon applied! You save ₦${discount.toLocaleString()}`,
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, valid: false, message: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}
