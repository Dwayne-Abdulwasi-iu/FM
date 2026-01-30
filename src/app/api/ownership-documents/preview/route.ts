import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { prismaErrorResponse } from '@/lib/prismaError'

/**
 * POST /api/ownership-documents/preview
 * Upload preview file for ownership document escrow period
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentId = formData.get('documentId') as string
    const description = (formData.get('description') as string) || ''

    // Validate inputs
    if (!file || !documentId) {
      return NextResponse.json(
        { message: 'File and document ID are required' },
        { status: 400 }
      )
    }

    // Validate file size
    const maxImageSize = 50 * 1024 * 1024 // 50MB
    const maxVideoSize = 100 * 1024 * 1024 // 100MB
    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? maxVideoSize : maxImageSize

    if (file.size > maxSize) {
      const maxSizeMB = isVideo ? 100 : 50
      return NextResponse.json(
        { message: `File size exceeds ${maxSizeMB}MB limit` },
        { status: 400 }
      )
    }

    // Check ownership document exists and belongs to seller
    const ownershipDoc = await prisma.ownershipDocument.findUnique({
      where: { id: documentId },
      select: { id: true, sellerId: true, designId: true }
    })

    if (!ownershipDoc) {
      return NextResponse.json(
        { message: 'Ownership document not found' },
        { status: 404 }
      )
    }

    if (ownershipDoc.sellerId !== session.user.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer()
    const bytes = Buffer.from(buffer)

    // Upload to Cloudinary
    const folder = `ownership-previews/${session.user.id}`
    const resourceType = isVideo ? 'video' : 'image'
    
    const uploadResult = await uploadToCloudinary(bytes, {
      folder,
      resource_type: resourceType,
      public_id: `preview_${documentId}_${Date.now()}`
    })

    // Update ownership document with preview file info
    const updatedDoc = await prisma.ownershipDocument.update({
      where: { id: documentId },
      data: {
        previewFileUrl: uploadResult.secure_url,
        previewFileType: isVideo ? 'video' : 'image',
        previewFileName: file.name,
        previewDescription: description
      }
    })

    return NextResponse.json(
      {
        message: 'Preview file uploaded successfully',
        previewFileUrl: updatedDoc.previewFileUrl,
        previewFileType: updatedDoc.previewFileType
      },
      { status: 201 }
    )
  } catch (error) {
    const prismaResp = prismaErrorResponse(error, 'Database temporarily unavailable')
    if (prismaResp) return prismaResp

    console.error('Preview file upload error:', error)
    return NextResponse.json(
      { message: 'Failed to upload preview file' },
      { status: 500 }
    )
  }
}
