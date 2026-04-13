import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getBoutiqueCommissionTier, BOUTIQUE_COMMISSION_TIERS } from '@/lib/boutique/constants'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        displayName: true,
        bio: true,
        website: true,
        location: true,
        role: true,
        isVerified: true,
        designerTier: true,
        subscriptionTier: true,
        specialties: true,
        acceptsCommissions: true,
        commissionStatus: true,
        commissionMinBudget: true,
        commissionMaxBudget: true,
        commissionTurnaround: true,
        commissionTypes: true,
        createdAt: true,
        updatedAt: true,
        totalEarnings: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Compute boutique commission info (tiered)
    const boutiqueTierKey = getBoutiqueCommissionTier(user.totalEarnings || 0)
    const tierInfo = BOUTIQUE_COMMISSION_TIERS[boutiqueTierKey]
    const nextThreshold = tierInfo.nextThreshold || null
    const amountToNextTier = nextThreshold ? Math.max(0, nextThreshold - (user.totalEarnings || 0)) : null
    const progressToNextTier = nextThreshold
      ? Math.min(100, (((user.totalEarnings || 0) - tierInfo.threshold) / (nextThreshold - tierInfo.threshold)) * 100)
      : 100

    const boutiqueCommission = {
      tier: boutiqueTierKey,
      tierName: tierInfo.name,
      rate: tierInfo.rate, // decimal (e.g., 0.07)
      percentage: ((tierInfo.rate || 0) * 100).toFixed(1),
      nextThreshold,
      amountToNextTier,
      progressToNextTier,
      totalEarnings: user.totalEarnings || 0,
    }

    return NextResponse.json({ success: true, user, boutiqueCommission })

  } catch (error) {
    void error
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { name, displayName, bio, website, location, image, specialties } = await request.json()

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        displayName: displayName || null,
        bio: bio || null,
        website: website || null,
        location: location || null,
        ...(image !== undefined && { image }),
        ...(specialties !== undefined && { specialties }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        displayName: true,
        bio: true,
        website: true,
        location: true,
        role: true,
        isVerified: true,
        designerTier: true,
        subscriptionTier: true,
        specialties: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ user })

  } catch (error) {
    void error
    console.error('Profile update error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}