import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/coupons/validate
 * Validate a coupon code and calculate discount
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to apply a coupon' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Rate limit: 20 validations per minute
    const rateLimitKey = `coupon-validate:${userId}`
    const rateLimit = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many validation attempts. Please slow down.' },
        { status: 429 }
      )
    }

    const { code, orderTotal, designerIds, categories } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { message: 'Coupon code is required' },
        { status: 400 }
      )
    }

    if (!orderTotal || typeof orderTotal !== 'number' || orderTotal <= 0) {
      return NextResponse.json(
        { message: 'Valid order total is required' },
        { status: 400 }
      )
    }

    const normalizedCode = code.toUpperCase().trim()
    const now = new Date()

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
      include: {
        _count: {
          select: { redemptions: true }
        }
      }
    })

    if (!coupon) {
      return NextResponse.json(
        { message: 'Invalid coupon code', valid: false },
        { status: 404 }
      )
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        { message: 'This coupon is no longer active', valid: false },
        { status: 400 }
      )
    }

    // Check date validity
    if (coupon.startDate > now) {
      return NextResponse.json(
        { message: 'This coupon is not yet valid', valid: false },
        { status: 400 }
      )
    }

    if (coupon.endDate && coupon.endDate < now) {
      return NextResponse.json(
        { message: 'This coupon has expired', valid: false },
        { status: 400 }
      )
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { message: 'This coupon has reached its usage limit', valid: false },
        { status: 400 }
      )
    }

    // Check user's usage of this coupon
    const userRedemptions = await prisma.couponRedemption.count({
      where: {
        couponId: coupon.id,
        userId
      }
    })

    if (userRedemptions >= coupon.maxUsesPerUser) {
      return NextResponse.json(
        { message: 'You have already used this coupon the maximum number of times', valid: false },
        { status: 400 }
      )
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return NextResponse.json(
        { 
          message: `Minimum order of $${coupon.minOrderAmount.toFixed(2)} required`,
          valid: false,
          minRequired: coupon.minOrderAmount
        },
        { status: 400 }
      )
    }

    // Check designer restriction
    if (coupon.designerOnly && coupon.designerId) {
      const hasMatchingDesigner = designerIds?.includes(coupon.designerId)
      if (!hasMatchingDesigner) {
        return NextResponse.json(
          { message: 'This coupon is only valid for specific designer products', valid: false },
          { status: 400 }
        )
      }
    }

    // Check category restriction
    if (coupon.categoryOnly) {
      const hasMatchingCategory = categories?.includes(coupon.categoryOnly)
      if (!hasMatchingCategory) {
        return NextResponse.json(
          { message: `This coupon is only valid for ${coupon.categoryOnly} category`, valid: false },
          { status: 400 }
        )
      }
    }

    // Calculate discount
    let discountAmount: number
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = orderTotal * (coupon.discountValue / 100)
      // Apply max discount cap if set
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount
      }
    } else {
      // FIXED_AMOUNT
      discountAmount = Math.min(coupon.discountValue, orderTotal)
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      },
      discount: {
        amount: discountAmount,
        newTotal: Math.max(0, orderTotal - discountAmount)
      }
    })

  } catch (error) {
    console.error('Validate coupon error:', error)
    return NextResponse.json(
      { message: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}
