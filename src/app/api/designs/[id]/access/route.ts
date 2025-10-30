import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { hasAccess: false, reason: 'Authentication required' },
        { status: 200 }
      )
    }

  const paramsObj = await params
  const designId = paramsObj.id

    // Check if design exists
    const design = await prisma.design.findUnique({
      where: { id: designId },
      include: {
        designer: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!design) {
      return NextResponse.json(
        { hasAccess: false, reason: 'Design not found' },
        { status: 404 }
      )
    }

    // Admin users have full access to all designs for moderation purposes
    if (session.user.role === 'ADMIN') {
      return NextResponse.json({
        hasAccess: true,
        reason: 'Admin access - moderation privileges',
        accessType: 'admin',
        design: {
          id: design.id,
          title: design.title,
          price: design.price,
          ownershipPrice: design.ownershipPrice,
          buyingTypes: design.buyingTypes,
          isOwned: design.isOwned
        }
      })
    }

    // Owner always has access
    if (design.designerId === session.user.id) {
      return NextResponse.json({
        hasAccess: true,
        reason: 'Owner access',
        accessType: 'owner'
      })
    }

    // Check if user has purchased this design
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId: session.user.id,
        designId: designId,
        accessGranted: true
      }
    })

    if (purchase) {
      return NextResponse.json({
        hasAccess: true,
        reason: 'Purchase verified',
        accessType: purchase.purchaseType.toLowerCase(),
        purchaseDate: purchase.createdAt
      })
    }

    // No access found
    return NextResponse.json({
      hasAccess: false,
      reason: 'Purchase required',
      design: {
        id: design.id,
        title: design.title,
        price: design.price,
        ownershipPrice: design.ownershipPrice,
        buyingTypes: design.buyingTypes,
        isOwned: design.isOwned
      }
    })

  } catch (error) {
    console.error('Access check error:', error)
    return NextResponse.json(
      { hasAccess: false, reason: 'Internal server error' },
      { status: 500 }
    )
  }
}