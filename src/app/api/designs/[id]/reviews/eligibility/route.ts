import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/designs/[id]/reviews/eligibility
 * Check if user can review a design (must have purchased it and not already reviewed)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        canReview: false,
        hasReviewed: false,
        reason: 'Not signed in'
      })
    }

    const params = await context.params
    const designId = params.id
    const userId = session.user.id

    // Check if design exists
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: { id: true, designerId: true }
    })

    if (!design) {
      return NextResponse.json({
        canReview: false,
        hasReviewed: false,
        reason: 'Design not found'
      })
    }

    // User cannot review their own design
    if (design.designerId === userId) {
      return NextResponse.json({
        canReview: false,
        hasReviewed: false,
        reason: 'Cannot review your own design'
      })
    }

    // Check if user has already reviewed this design
    const existingReview = await prisma.review.findFirst({
      where: {
        designId,
        userId
      }
    })

    if (existingReview) {
      return NextResponse.json({
        canReview: false,
        hasReviewed: true,
        reason: 'Already reviewed'
      })
    }

    // Check if user has purchased this design (any completed order containing it)
    // Find orders by this user with a valid status
    const userOrders = await prisma.order.findMany({
      where: {
        customerId: userId,
        status: {
          in: ['COMPLETED', 'DELIVERED', 'PROCESSING', 'PAID']
        }
      },
      select: {
        id: true,
        items: {
          where: {
            designId: designId
          },
          select: { id: true }
        }
      }
    })
    
    // Check if any order contains this design
    const hasPurchased = userOrders.some(order => order.items.length > 0)

    if (!hasPurchased) {
      return NextResponse.json({
        canReview: false,
        hasReviewed: false,
        reason: 'Must purchase to review'
      })
    }

    return NextResponse.json({
      canReview: true,
      hasReviewed: false,
      reason: null
    })

  } catch (error) {
    console.error('Check review eligibility error:', error)
    return NextResponse.json(
      { canReview: false, hasReviewed: false, reason: 'Error checking eligibility' },
      { status: 500 }
    )
  }
}
