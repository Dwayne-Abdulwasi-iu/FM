import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { prismaErrorResponse } from '@/lib/prismaError';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { reviewId } = await params;
    const body = await req.json();
    const { rating, title, comment, fitRating } = body;

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return new Response(
        JSON.stringify({ error: 'Invalid rating. Must be between 1 and 5.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get review
    const review = await prisma.boutiqueReview.findUnique({
      where: { id: reviewId },
      select: { userId: true },
    });

    if (!review) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    if (review.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update review
    const updatedReview = await prisma.boutiqueReview.update({
      where: { id: reviewId },
      data: {
        rating: rating !== undefined ? rating : undefined,
        title: title !== undefined ? (title?.trim() || null) : undefined,
        comment: comment !== undefined ? (comment?.trim() || null) : undefined,
        fitRating: fitRating !== undefined ? (fitRating || null) : undefined,
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
    });

    return new Response(JSON.stringify(updatedReview), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Review update error:', error);

    const prismaResp = prismaErrorResponse(
      error,
      'Failed to update review. Please try again.'
    );
    if (prismaResp) return prismaResp;

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { reviewId } = await params;

    // Get review
    const review = await prisma.boutiqueReview.findUnique({
      where: { id: reviewId },
      select: { userId: true },
    });

    if (!review) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    if (review.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete review
    await prisma.boutiqueReview.delete({
      where: { id: reviewId },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Review deletion error:', error);

    const prismaResp = prismaErrorResponse(
      error,
      'Failed to delete review. Please try again.'
    );
    if (prismaResp) return prismaResp;

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
