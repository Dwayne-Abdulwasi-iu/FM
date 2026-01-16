import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/boutique/products/[id]/reviews - Get reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const [reviews, total, avgRating] = await Promise.all([
      prisma.boutiqueReview.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.boutiqueReview.count({ where: { productId } }),
      prisma.boutiqueReview.aggregate({
        where: { productId },
        _avg: { rating: true },
      }),
    ])

    // Rating distribution
    const ratingDistribution = await prisma.boutiqueReview.groupBy({
      by: ['rating'],
      where: { productId },
      _count: true,
    })

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    ratingDistribution.forEach(r => {
      distribution[r.rating] = r._count
    })

    return NextResponse.json({
      success: true,
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      avgRating: avgRating._avg.rating || 0,
      distribution,
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/boutique/products/[id]/reviews - Create a review (must have purchased)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: productId } = await params
    const { rating, title, comment, fitRating } = await request.json()

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if user has purchased this product (delivered orders only)
    const hasPurchased = await prisma.boutiqueOrder.findFirst({
      where: {
        buyerId: session.user.id,
        productId,
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
    })

    if (!hasPurchased) {
      return NextResponse.json(
        { success: false, message: 'You must purchase this product before reviewing' },
        { status: 403 }
      )
    }

    // Check if already reviewed
    const existingReview = await prisma.boutiqueReview.findFirst({
      where: {
        userId: session.user.id,
        productId,
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { success: false, message: 'You have already reviewed this product' },
        { status: 400 }
      )
    }

    // Create review
    const review = await prisma.boutiqueReview.create({
      data: {
        userId: session.user.id,
        productId,
        rating,
        title: title || null,
        comment: comment || null,
        fitRating: fitRating || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Update product average rating
    const avgRating = await prisma.boutiqueReview.aggregate({
      where: { productId },
      _avg: { rating: true },
    })

    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: { avgRating: avgRating._avg.rating || 0 },
    })

    return NextResponse.json({
      success: true,
      message: 'Review submitted',
      review,
    })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to submit review' },
      { status: 500 }
    )
  }
}

// DELETE /api/boutique/products/[id]/reviews - Delete own review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: productId } = await params
    const searchParams = request.nextUrl.searchParams
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json(
        { success: false, message: 'Review ID required' },
        { status: 400 }
      )
    }

    // Find the review
    const review = await prisma.boutiqueReview.findUnique({
      where: { id: reviewId },
    })

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    // Only allow owner or admin to delete
    const isAdmin = (session.user as any).role === 'ADMIN'
    if (review.userId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      )
    }

    // Delete review
    await prisma.boutiqueReview.delete({
      where: { id: reviewId },
    })

    // Update product average rating
    const avgRating = await prisma.boutiqueReview.aggregate({
      where: { productId },
      _avg: { rating: true },
    })

    await prisma.boutiqueProduct.update({
      where: { id: productId },
      data: { avgRating: avgRating._avg.rating || null },
    })

    return NextResponse.json({
      success: true,
      message: 'Review deleted',
    })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
