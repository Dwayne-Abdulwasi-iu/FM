// POST /api/boutique/products/[id]/variants - Add variant
// PATCH /api/boutique/products/[id]/variants - Update variant
// DELETE /api/boutique/products/[id]/variants?variantId=xxx - Delete variant

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PRODUCT_STATUS } from '@/lib/boutique/constants';

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
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (session.user.id !== product.sellerId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Only allow variant changes for draft/rejected products
    const editableStatuses: string[] = [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.REJECTED];
    if (!editableStatuses.includes(product.status)) {
      return NextResponse.json(
        { success: false, message: 'Cannot add variants in current status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { size, color, colorHex, priceAdjustment, quantity, sku, customAttributes, imageUrl } = body;

    if (!size && !color) {
      return NextResponse.json(
        { success: false, message: 'At least size or color is required' },
        { status: 400 }
      );
    }

    // Check if variant combination already exists
    const existingVariant = await prisma.boutiqueProductVariant.findFirst({
      where: {
        productId: id,
        size: size || null,
        color: color || null,
      },
    });

    if (existingVariant) {
      return NextResponse.json(
        { success: false, message: 'This size/color combination already exists' },
        { status: 400 }
      );
    }

    const variant = await prisma.boutiqueProductVariant.create({
      data: {
        productId: id,
        size,
        color,
        colorHex,
        priceAdjustment: priceAdjustment || 0,
        quantity: quantity || 1,
        sku,
        customAttributes,
        imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Variant added successfully',
      variant,
    });
  } catch (error) {
    console.error('Error adding boutique product variant:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add variant' },
      { status: 500 }
    );
  }
}

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
    if (session.user.id !== product.sellerId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Only allow variant changes for draft/rejected products
    const editableStatuses: string[] = [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.REJECTED];
    if (!editableStatuses.includes(product.status)) {
      return NextResponse.json(
        { success: false, message: 'Cannot update variants in current status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { variantId, size, color, colorHex, priceAdjustment, quantity, sku, customAttributes, imageUrl, isActive } = body;

    if (!variantId) {
      return NextResponse.json(
        { success: false, message: 'Variant ID required' },
        { status: 400 }
      );
    }

    const variant = await prisma.boutiqueProductVariant.findFirst({
      where: { id: variantId, productId: id },
    });

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Variant not found' },
        { status: 404 }
      );
    }

    const updatedVariant = await prisma.boutiqueProductVariant.update({
      where: { id: variantId },
      data: {
        ...(size !== undefined && { size }),
        ...(color !== undefined && { color }),
        ...(colorHex !== undefined && { colorHex }),
        ...(priceAdjustment !== undefined && { priceAdjustment }),
        ...(quantity !== undefined && { quantity }),
        ...(sku !== undefined && { sku }),
        ...(customAttributes !== undefined && { customAttributes }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Variant updated successfully',
      variant: updatedVariant,
    });
  } catch (error) {
    console.error('Error updating boutique product variant:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update variant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!variantId) {
      return NextResponse.json(
        { success: false, message: 'Variant ID required' },
        { status: 400 }
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
    if (session.user.id !== product.sellerId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Only allow variant changes for draft/rejected products
    const editableStatuses: string[] = [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.REJECTED];
    if (!editableStatuses.includes(product.status)) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete variants in current status' },
        { status: 400 }
      );
    }

    const variant = await prisma.boutiqueProductVariant.findFirst({
      where: { id: variantId, productId: id },
    });

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Variant not found' },
        { status: 404 }
      );
    }

    await prisma.boutiqueProductVariant.delete({
      where: { id: variantId },
    });

    return NextResponse.json({
      success: true,
      message: 'Variant deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting boutique product variant:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete variant' },
      { status: 500 }
    );
  }
}
