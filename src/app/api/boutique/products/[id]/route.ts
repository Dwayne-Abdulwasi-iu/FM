// GET /api/boutique/products/[id] - Get single product
// PATCH /api/boutique/products/[id] - Update product
// DELETE /api/boutique/products/[id] - Delete product (draft only)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS } from '@/lib/boutique/constants';

// GET - Single product details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const product = await prisma.boutiqueProduct.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            image: true,
            isVerified: true,
            createdAt: true,
            _count: {
              select: {
                boutiqueProducts: {
                  where: { status: 'LIVE' },
                },
              },
            },
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          where: { isActive: true },
          orderBy: { size: 'asc' },
        },
        reviews: {
          where: { isApproved: true, isHidden: false },
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product is viewable
    const isOwner = session?.user?.id === product.sellerId;
    const isAdmin = session?.user?.role === 'ADMIN';
    const isLive = product.status === PRODUCT_STATUS.LIVE;
    const isOutOfStock = product.status === 'OUT_OF_STOCK';

    // Don't allow viewing OUT_OF_STOCK products unless owner or admin
    if (isOutOfStock && !isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Product not available' },
        { status: 404 }
      );
    }

    if (!isLive && !isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Product not available' },
        { status: 403 }
      );
    }

    // Increment view count for live products
    if (isLive && !isOwner) {
      await prisma.boutiqueProduct.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    // Calculate average rating
    const avgRating = await prisma.boutiqueReview.aggregate({
      where: { productId: id, isApproved: true },
      _avg: { rating: true },
    });

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        avgRating: avgRating._avg.rating || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching boutique product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PATCH - Update product
export async function PATCH(
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
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const isOwner = session.user.id === product.sellerId;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Only allow editing draft or rejected products (for sellers)
    const editableStatuses: string[] = [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.REJECTED];
    if (!isAdmin && !editableStatuses.includes(product.status)) {
      return NextResponse.json(
        { success: false, message: 'Cannot edit product in current status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      categoryId,
      subcategory,
      basePrice,
      salePrice,
      brand,
      material,
      careInstructions,
      tags,
      style,
      occasion,
      gender,
      condition,
      weight,
      dimensions,
    } = body;

    const updatedProduct = await prisma.boutiqueProduct.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(categoryId && { categoryId }),
        ...(subcategory !== undefined && { subcategory }),
        ...(basePrice && { basePrice: parseFloat(basePrice) }),
        ...(salePrice !== undefined && { salePrice: salePrice ? parseFloat(salePrice) : null }),
        ...(brand !== undefined && { brand }),
        ...(material !== undefined && { material }),
        ...(careInstructions !== undefined && { careInstructions }),
        ...(tags && { tags }),
        ...(style !== undefined && { style }),
        ...(occasion !== undefined && { occasion }),
        ...(gender !== undefined && { gender }),
        ...(condition && { condition }),
        ...(weight !== undefined && { weight: weight ? parseFloat(weight) : null }),
        ...(dimensions !== undefined && { dimensions }),
        // Reset status to draft if editing a rejected product
        ...(product.status === PRODUCT_STATUS.REJECTED && { status: PRODUCT_STATUS.DRAFT, rejectionReason: null }),
      },
      include: {
        category: true,
        variants: true,
        media: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating boutique product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product (draft only)
export async function DELETE(
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
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const isOwner = session.user.id === product.sellerId;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Only allow deleting drafts (sellers) or any status (admin)
    if (!isAdmin && product.status !== PRODUCT_STATUS.DRAFT) {
      return NextResponse.json(
        { success: false, message: 'Can only delete draft products' },
        { status: 400 }
      );
    }

    // Delete media, variants, and product
    await prisma.$transaction([
      prisma.boutiqueProductMedia.deleteMany({ where: { productId: id } }),
      prisma.boutiqueProductVariant.deleteMany({ where: { productId: id } }),
      prisma.boutiqueProduct.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting boutique product:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
