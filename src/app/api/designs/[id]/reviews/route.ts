import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/designs/[id]/reviews
 * Get reviews for a specific design with pagination
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const designId = params.id

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate limit and offset
    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return NextResponse.json(
        { message: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    // Check if design exists
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: { id: true }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { designId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.review.count({ where: { designId } })
    ])

    // Calculate average rating
    const avgResult = await prisma.review.aggregate({
      where: { designId },
      _avg: { rating: true }
    })

    return NextResponse.json({
      reviews,
      total,
      avgRating: avgResult._avg.rating || 0,
      hasMore: offset + limit < total
    })

  } catch (error) {
    console.error('Get reviews error:', error)
    return NextResponse.json(
      { message: 'Failed to get reviews' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/designs/[id]/reviews
 * Create a review for a design (must have purchased it)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'You must be signed in to leave a review' },
        { status: 401 }
      )
    }

    const params = await context.params
    const designId = params.id
    const userId = session.user.id

    // Rate limit: 10 reviews per hour per user
    const rateLimitKey = `review:${userId}`
    const rateLimit = await checkRateLimit(rateLimitKey, 10, 60 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          message: 'Too many reviews submitted. Please try again later.',
          retryAfter: rateLimit.resetAt
        },
        { status: 429 }
      )
    }

    const { rating, comment } = await request.json()

    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate comment (optional but if provided, must be reasonable length)
    if (comment && (typeof comment !== 'string' || comment.length > 2000)) {
      return NextResponse.json(
        { message: 'Comment must be less than 2000 characters' },
        { status: 400 }
      )
    }

    // Check if design exists and is active
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: { 
        id: true, 
        isActive: true, 
        approvalStatus: true,
        designerId: true 
      }
    })

    if (!design) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      )
    }

    // Prevent designers from reviewing their own designs
    if (design.designerId === userId) {
      return NextResponse.json(
        { message: 'You cannot review your own design' },
        { status: 403 }
      )
    }

    // Check if user has purchased the design
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId,
        designId,
        accessGranted: true
      }
    })

    if (!purchase) {
      return NextResponse.json(
        { message: 'You must purchase this design before leaving a review' },
        { status: 403 }
      )
    }

    // Check if user already reviewed this design
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_designId: {
          userId,
          designId
        }
      }
    })

    if (existingReview) {
      return NextResponse.json(
        { message: 'You have already reviewed this design' },
        { status: 409 }
      )
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        rating: Math.round(rating), // Ensure integer
        comment: comment?.trim() || null,
        userId,
        designId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    // Update designer's average rating
    const avgResult = await prisma.review.aggregate({
      where: { 
        design: { 
          designerId: design.designerId 
        } 
      },
      _avg: { rating: true }
    })

    if (avgResult._avg.rating) {
      await prisma.user.update({
        where: { id: design.designerId },
        data: { avgRating: avgResult._avg.rating }
      })
    }

    return NextResponse.json(
      { 
        message: 'Review submitted successfully',
        review 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json(
      { message: 'Failed to submit review' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/designs/[id]/reviews
 * Update user's own review
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const params = await context.params
    const designId = params.id
    const userId = session.user.id

    const { rating, comment } = await request.json()

    // Validate rating if provided
    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_designId: {
          userId,
          designId
        }
      }
    })

    if (!existingReview) {
      return NextResponse.json(
        { message: 'Review not found' },
        { status: 404 }
      )
    }

    // Update the review
    const updatedReview = await prisma.review.update({
      where: {
        userId_designId: {
          userId,
          designId
        }
      },
      data: {
        ...(rating !== undefined && { rating: Math.round(rating) }),
        ...(comment !== undefined && { comment: comment?.trim() || null })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Review updated successfully',
      review: updatedReview
    })

  } catch (error) {
    console.error('Update review error:', error)
    return NextResponse.json(
      { message: 'Failed to update review' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/designs/[id]/reviews
 * Delete user's own review
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const params = await context.params
    const designId = params.id
    const userId = session.user.id

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_designId: {
          userId,
          designId
        }
      },
      include: {
        design: {
          select: { designerId: true }
        }
      }
    })

    if (!existingReview) {
      return NextResponse.json(
        { message: 'Review not found' },
        { status: 404 }
      )
    }

    // Delete the review
    await prisma.review.delete({
      where: {
        userId_designId: {
          userId,
          designId
        }
      }
    })

    // Update designer's average rating
    const avgResult = await prisma.review.aggregate({
      where: { 
        design: { 
          designerId: existingReview.design.designerId 
        } 
      },
      _avg: { rating: true }
    })

    await prisma.user.update({
      where: { id: existingReview.design.designerId },
      data: { avgRating: avgResult._avg.rating || 0 }
    })

    return NextResponse.json({
      message: 'Review deleted successfully'
    })

  } catch (error) {
    console.error('Delete review error:', error)
    return NextResponse.json(
      { message: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
