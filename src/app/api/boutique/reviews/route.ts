import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { prismaErrorResponse } from '@/lib/prismaError';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const session = await getServerSession(authOptions);

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's review if exists
    if (session?.user?.id) {
      const userReview = await prisma.boutiqueReview.findFirst({
        where: {
          productId,
          userId: session.user.id,
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

      return new Response(JSON.stringify({ userReview, isAuthor: !!userReview }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ userReview: null, isAuthor: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching user review:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { productId, rating, title, comment, fitRating, orderId } = body;

    // Validate required fields
    if (!productId || !rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Invalid rating. Must be between 1 and 5.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify product exists
    const product = await prisma.boutiqueProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.boutiqueReview.findFirst({
      where: {
        productId,
        userId: session.user.id,
      },
    });

    if (existingReview) {
      return new Response(
        JSON.stringify({ error: 'You have already reviewed this product' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If orderId provided, verify user purchased from this order
    if (orderId) {
      const order = await prisma.boutiqueOrder.findUnique({
        where: { id: orderId },
        select: { buyerId: true },
      });

      if (!order || order.buyerId !== session.user.id) {
        return new Response(
          JSON.stringify({ error: 'Invalid order or unauthorized' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Verify user has purchased this product
      const purchase = await prisma.boutiqueOrder.findFirst({
        where: {
          buyerId: session.user.id,
          items: {
            some: {
              productId,
            },
          },
        },
      });

      if (!purchase) {
        return new Response(
          JSON.stringify({ error: 'You can only review products you have purchased' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create review
    const review = await prisma.boutiqueReview.create({
      data: {
        productId,
        userId: session.user.id,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        fitRating: fitRating || null,
        orderId: orderId || null,
        photos: [],
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

    return new Response(JSON.stringify(review), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Review submission error:', error);

    const prismaResp = prismaErrorResponse(
      error,
      'Failed to submit review. Please try again.'
    );
    if (prismaResp) return prismaResp;

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
