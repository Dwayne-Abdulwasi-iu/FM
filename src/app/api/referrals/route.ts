import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

/**
 * GET /api/referrals
 * Get current user's referral info and stats
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to view referrals' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get or create referral code for user
    let referral = await prisma.referral.findFirst({
      where: { 
        referrerId: userId,
        referredId: null  // Their own referral code (not yet used)
      }
    })

    // If no referral code exists, create one
    if (!referral) {
      const referrerCode = generateReferralCode(userId)
      referral = await prisma.referral.create({
        data: {
          referrerId: userId,
          referrerCode
        }
      })
    }

    // Get stats on successful referrals
    const referralStats = await prisma.referral.aggregate({
      where: {
        referrerId: userId,
        signupCompleted: true
      },
      _count: true,
      _sum: {
        referrerReward: true
      }
    })

    // Get pending referrals (signed up but no purchase yet)
    const pendingReferrals = await prisma.referral.count({
      where: {
        referrerId: userId,
        signupCompleted: true,
        firstPurchaseMade: false
      }
    })

    // Get completed referrals (made first purchase)
    const completedReferrals = await prisma.referral.count({
      where: {
        referrerId: userId,
        firstPurchaseMade: true
      }
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const referralLink = `${baseUrl}/auth/signup?ref=${referral.referrerCode}`

    return NextResponse.json({
      referralCode: referral.referrerCode,
      referralLink,
      stats: {
        totalReferrals: referralStats._count,
        pendingReferrals,
        completedReferrals,
        totalEarnings: referralStats._sum.referrerReward || 0,
        pendingEarnings: 0  // Calculate from pending rewards
      },
      rewards: {
        referrerReward: 10,  // $10 per successful referral
        referredDiscount: 15  // 15% off first purchase
      }
    })

  } catch (error) {
    console.error('Get referrals error:', error)
    return NextResponse.json(
      { message: 'Failed to get referral info' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/referrals
 * Apply a referral code during signup
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to apply a referral' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { referralCode } = await request.json()

    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { message: 'Referral code is required' },
        { status: 400 }
      )
    }

    // Find the referral code
    const referral = await prisma.referral.findUnique({
      where: { referrerCode: referralCode.toUpperCase() }
    })

    if (!referral) {
      return NextResponse.json(
        { message: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Check if code already used
    if (referral.referredId) {
      return NextResponse.json(
        { message: 'This referral code has already been used' },
        { status: 400 }
      )
    }

    // Can't refer yourself
    if (referral.referrerId === userId) {
      return NextResponse.json(
        { message: 'You cannot use your own referral code' },
        { status: 400 }
      )
    }

    // Check if user already has a referral applied
    const existingReferral = await prisma.referral.findFirst({
      where: { referredId: userId }
    })

    if (existingReferral) {
      return NextResponse.json(
        { message: 'You have already used a referral code' },
        { status: 400 }
      )
    }

    // Apply the referral
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })

    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredId: userId,
        referredEmail: user?.email,
        signupCompleted: true,
        convertedAt: new Date(),
        referredReward: 15  // 15% discount
      }
    })

    return NextResponse.json({
      message: 'Referral code applied! You\'ll get 15% off your first purchase.',
      discount: 15
    })

  } catch (error) {
    console.error('Apply referral error:', error)
    return NextResponse.json(
      { message: 'Failed to apply referral code' },
      { status: 500 }
    )
  }
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(userId: string): string {
  const hash = crypto.createHash('sha256').update(userId + Date.now()).digest('hex')
  return hash.substring(0, 8).toUpperCase()
}
