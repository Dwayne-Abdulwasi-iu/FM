// POST /api/boutique/products/[id]/media - Upload media to product
// DELETE /api/boutique/products/[id]/media?mediaId=xxx - Delete specific media

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';
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
      include: { media: true },
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

    // Only allow media uploads for draft/rejected products
    const editableStatuses: string[] = [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.REJECTED];
    if (!editableStatuses.includes(product.status)) {
      return NextResponse.json(
        { success: false, message: 'Cannot add media to product in current status' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // IMAGE or VIDEO
    const isPrimary = formData.get('isPrimary') === 'true';
    const altText = formData.get('altText') as string;

    if (!file || !type) {
      return NextResponse.json(
        { success: false, message: 'File and type are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const isImage = type === 'IMAGE';
    const isVideo = type === 'VIDEO';

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, message: 'Type must be IMAGE or VIDEO' },
        { status: 400 }
      );
    }

    // Check limits
    const currentImages = product.media.filter(m => m.type === 'IMAGE').length;
    const currentVideos = product.media.filter(m => m.type === 'VIDEO').length;

    if (isImage && currentImages >= BOUTIQUE_DEFAULTS.maxImages) {
      return NextResponse.json(
        { success: false, message: `Maximum ${BOUTIQUE_DEFAULTS.maxImages} images allowed` },
        { status: 400 }
      );
    }

    if (isVideo && currentVideos >= BOUTIQUE_DEFAULTS.maxVideos) {
      return NextResponse.json(
        { success: false, message: `Maximum ${BOUTIQUE_DEFAULTS.maxVideos} videos allowed` },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = isImage ? BOUTIQUE_DEFAULTS.maxImageSize : BOUTIQUE_DEFAULTS.maxVideoSize;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const resourceType = isVideo ? 'video' : 'image';
    
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: `fashion-boutique/products/${id}`,
      resource_type: resourceType,
    });

    // If this is the first image or marked as primary, unset other primaries
    if (isPrimary || (isImage && currentImages === 0)) {
      await prisma.boutiqueProductMedia.updateMany({
        where: { productId: id, type: 'IMAGE' },
        data: { isPrimary: false },
      });
    }

    // Get current max sort order
    const maxSortOrder = await prisma.boutiqueProductMedia.aggregate({
      where: { productId: id },
      _max: { sortOrder: true },
    });

    // Create media record
    const media = await prisma.boutiqueProductMedia.create({
      data: {
        productId: id,
        type,
        url: uploadResult.secure_url,
        thumbnailUrl: isVideo ? uploadResult.secure_url.replace(/\.[^.]+$/, '.jpg') : null,
        isPrimary: isPrimary || (isImage && currentImages === 0),
        altText,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: isVideo ? (uploadResult as { duration?: number }).duration ?? null : null,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Media uploaded successfully',
      media,
    });
  } catch (error) {
    console.error('Error uploading boutique product media:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload media' },
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
    const mediaId = searchParams.get('mediaId');

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!mediaId) {
      return NextResponse.json(
        { success: false, message: 'Media ID required' },
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

    // Only allow media deletion for draft/rejected products
    const editableStatuses: string[] = [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.REJECTED];
    if (!editableStatuses.includes(product.status)) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete media from product in current status' },
        { status: 400 }
      );
    }

    const media = await prisma.boutiqueProductMedia.findFirst({
      where: { id: mediaId, productId: id },
    });

    if (!media) {
      return NextResponse.json(
        { success: false, message: 'Media not found' },
        { status: 404 }
      );
    }

    await prisma.boutiqueProductMedia.delete({
      where: { id: mediaId },
    });

    // TODO: Delete from Cloudinary as well

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting boutique product media:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
