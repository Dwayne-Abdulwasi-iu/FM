import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })

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