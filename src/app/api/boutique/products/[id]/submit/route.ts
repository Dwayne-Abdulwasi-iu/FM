// POST /api/boutique/products/[id]/submit - Submit product for content review
// Only for DRAFT status products

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS, BOUTIQUE_DEFAULTS } from '@/lib/boutique/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const product = await prisma.boutiqueProduct.findUnique({
      where: { id },
      include: {
        media: true,
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (session.user.id !== product.sellerId) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Check current status
    if (product.status !== PRODUCT_STATUS.DRAFT) {
      return NextResponse.json(
        { success: false, message: 'Product can only be submitted from draft status' },
        { status: 400 }
      );
    }

    // Validate minimum requirements
    const errors: string[] = [];

    const images = product.media.filter(m => m.type === 'IMAGE');
    const videos = product.media.filter(m => m.type === 'VIDEO');

    if (images.length < BOUTIQUE_DEFAULTS.minImages) {
      errors.push(`Minimum ${BOUTIQUE_DEFAULTS.minImages} images required (you have ${images.length})`);
    }

    if (videos.length < BOUTIQUE_DEFAULTS.minVideos) {
      errors.push(`Minimum ${BOUTIQUE_DEFAULTS.minVideos} videos required (you have ${videos.length})`);
    }

    if (!product.title || product.title.length < 10) {
      errors.push('Title must be at least 10 characters');
    }

    if (!product.description || product.description.length < 50) {
      errors.push('Description must be at least 50 characters');
    }

    if (product.basePrice <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (product.variants.length === 0) {
      errors.push('At least one size/color variant is required');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Product does not meet submission requirements',
          errors,
        },
        { status: 400 }
      );
    }

    // Update status to pending review
    const updatedProduct = await prisma.boutiqueProduct.update({
      where: { id },
      data: {
        status: PRODUCT_STATUS.PENDING_CONTENT_REVIEW,
        submittedAt: new Date(),
      },
    });

    // TODO: Send notification to admin about new product for review
    // TODO: Send email to seller confirming submission

    return NextResponse.json({
      success: true,
      message: 'Product submitted for review. You will be notified once the review is complete.',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error submitting boutique product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit product' },
      { status: 500 }
    );
  }
}
